const {
  DEFAULT_BATCH_SIZE,
  fetchArticlesForBiasAnalysis,
  updateArticleBias,
  markArticleBiasFailed,
} = require("./articleBiasRepository");

const crypto = require("crypto");
const Article = require("../models/Article");
const { analyzeLocalBiasSignals } = require("./pythonClient");
const { analyzePoliticalBiasBatch: geminiBatch } = require("./geminiBiasService");
const { analyzePoliticalBiasBatch: groqBatch } = require("./groqBiasService");
const { getActiveProvider } = require("./llmProviderService");

/**
 * Routes a batch of articles to the currently active LLM provider (Groq or Gemini) for bias analysis.
 * Used internally by `runBiasAnalysisBatch` and `analyzeSingleArticleBias` to delegate LLM requests.
 * @returns {Promise<Array>} A Promise resolving to an array of political bias results.
 */
async function analyzePoliticalBiasBatch(articles) {
  const provider = getActiveProvider();
  if (provider === "groq") {
    return groqBatch(articles);
  }
  return geminiBatch(articles);
} 

const {
  getSourceLean,
  calculateLeanDeviation,
} = require("../../utils/sourceBiasMap");
const { evaluateBiasAccuracy } = require("../../utils/biasEvaluation");
const { assignEventClusters } = require("./eventClusteringService");

const MAX_BIAS_CONTEXT_LENGTH = 1800;
const BATCH_SIZE = 3;

/**
 * Ensures a given score stays within the bounds of 0.0 and 1.0.
 * Used internally (e.g., in `computePerspectiveBalance`, `buildBiasRecord`) to safely bound computed scores before returning them.
 * @returns {number} A numeric value between 0 and 1.
 */
function clampScore(score) {
  return Math.max(0, Math.min(1, score));
}

/**
 * Generates a SHA-256 hash for a generic input string.
 * Used internally by `buildArticleHash` and externally by `pdfArticleService.js` to create uniform document identifiers, avoiding duplicate processing of identical text.
 * @returns {string} A hex-encoded hash string.
 */
function generateArticleHash(input) {
  return crypto
    .createHash("sha256")
    .update(String(input || "").trim().toLowerCase())
    .digest("hex");
}

/**
 * Creates a unique hash for a specific article using its title and summary to facilitate caching.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to hash article objects for caching existing biases in the database.
 * @returns {string} A hex-encoded hash string.
 */
function buildArticleHash(article) {
  return generateArticleHash(`${article?.title || ""}${article?.summary || ""}`);
}

/**
 * Safely calculates the string length of an article's content.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to filter out articles that are too short to yield meaningful LLM bias metrics.
 * @returns {number} An integer representing the character count.
 */
function getArticleContentLength(article) {
  return String(article?.rawContent || article?.content || "").trim().length;
}

/**
 * Checks if an article has already undergone bias analysis to avoid redundant processing.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to skip articles that have already been fully analyzed, reducing LLM API costs.
 * @returns {boolean} True if data exists, false otherwise.
 */
function hasExistingBiasData(article) {
  return Boolean(
    article?.bias?.politicalLean ||
    article?.bias?.biasScore !== undefined ||
    article?.bias?.biasScoreFinal !== undefined ||
    article?.processingStatus === "bias_analyzed"
  );
}

/**
 * Calculates a perspective balance score by penalizing articles that miss perspectives or use excessive loaded language.
 * Used internally by `buildBiasRecord` to calculate the final perspective score when assembling the overall bias record.
 * @returns {number} A clamped numeric score between 0 and 1.
 */
function computePerspectiveBalance({
  missingPerspective,
  loadedLanguageCount,
}) {
  let balanceScore = 1.0;

  if (String(missingPerspective || "").trim()) {
    balanceScore -= 0.4;
  }

  if (Number(loadedLanguageCount) > 6) {
    balanceScore -= 0.2;
  }

  return clampScore(balanceScore);
}

/**
 * Maps a categorized framing type (like 'blame' or 'crisis') to a human-readable descriptive sentence.
 * Used internally by `buildBiasRecord` to map short framing types into a full human-readable insight.
 * @returns {string} A string containing the descriptive insight.
 */
function generateFramingInsight(framingType) {
  switch (String(framingType || "").trim().toLowerCase()) {
    case "blame":
      return "Article attributes responsibility to a specific actor or institution.";
    case "crisis":
      return "Article frames the event as urgent or catastrophic.";
    case "hero":
      return "Article portrays an individual or group as a savior.";
    case "neutral":
    default:
      return "Article presents the situation in a descriptive manner.";
  }
}

/**
 * Normalizes and splits raw text into an array of distinct paragraphs.
 * Used internally by `buildBiasText` to cleanly segment article content to easily extract intro/conclusion for the LLM.
 * @returns {Array<string>} An array of cleaned paragraph strings.
 */
function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)           //splits the text at blank line
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim()) //replaces extra spaces with a single space and trims the paragraph
    // replaces multiple whitespace characters with a single space.
    .filter(Boolean);               //removes empty paragraphs
}

/**
 * Truncates a string to a maximum length (defaulting to 1800 characters) and appends an ellipsis if it exceeds the limit.
 * Used internally by `buildBiasText` to ensure the built context string does not exceed token limits before sending to the LLM.
 * @returns {string} A string truncated to the specified limit.
 */
function trimContext(text, maxLength = MAX_BIAS_CONTEXT_LENGTH) {
  const normalized = String(text || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

/**
 * Constructs a concentrated text prompt for the LLM by combining the title, summary, first two paragraphs, and the conclusion of the article.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to format the article content into a condensed format optimal for LLM prompt engineering.
 * @returns {string} A formatted and length-restricted string.
 */

function buildBiasText(article) {       

  const rawContent = article.rawContent || article.content || "";
  const paragraphs = splitParagraphs(rawContent);
  const introParagraphs = paragraphs.slice(0, 2).join("\n\n");     //joins starting 2 paragraphs
  const conclusionParagraph = paragraphs.length > 0
    ? paragraphs[paragraphs.length - 1]                          // Last paragraph
    : "";

  const context = `TITLE:
${article.title || ""}

SUMMARY:
${article.summary || ""}

INTRO:
${introParagraphs}

CONCLUSION:
${conclusionParagraph}`;

  return trimContext(context, MAX_BIAS_CONTEXT_LENGTH);
}

/**
 * Provides default, neutral values when the local (non-LLM) sentiment analysis fails.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to provide safe default sentiment scores if the local sentiment analyzer throws an error.
 * @returns {Object} An object containing default sentiment, tone, and error explanation.
 */
function buildFallbackLocalSignals(error) {
  return {
    sentiment: "Neutral",
    emotionalTone: "Neutral",
    explanation: error.message || "Local bias analysis unavailable",
  };
}

/**
 * Combines LLM analysis, local signal analysis, and source metadata to compute final bias scores and assemble the complete bias data object.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to amalgamate all LLM/local/source data into a single finalized database object.
 * @returns {Object} A comprehensive object containing all final calculated bias metrics.
 */
function buildBiasRecord(article, politicalBias, localSignals) {
  const loadedWords = Array.isArray(politicalBias?.loadedWords)
    ? politicalBias.loadedWords.filter(Boolean)
    : [];

  const emotionalLanguage = Array.isArray(politicalBias?.emotionalLanguage)
    ? politicalBias.emotionalLanguage.filter(Boolean)
    : [];

  const geminiBiasScore = clampScore(
    typeof politicalBias?.biasScore === "number"
      ? politicalBias.biasScore
      : Number(politicalBias?.biasScore) || 0
  );
  const loadedWordScore = clampScore(loadedWords.length / 10);

  const viewpointPenalty = politicalBias?.opposingViewsPresent ? 0 : 0.1;
  
  const perspectiveBalanceScore = computePerspectiveBalance({
    missingPerspective: politicalBias?.missingPerspective,
    loadedLanguageCount: politicalBias?.loadedLanguageCount,
  });
  const framingInsight = generateFramingInsight(politicalBias?.framingType);
  const sourceLean = article.sourceLean || getSourceLean(article.source);
  const politicalLean = politicalBias?.politicalLean || "center";
  const leanDeviation = calculateLeanDeviation(
    politicalLean,
    sourceLean
  );
  const finalBiasScore = clampScore(
    0.7 * geminiBiasScore +
    0.2 * loadedWordScore +
    0.1 * viewpointPenalty
  );

  return {
    politicalLean,
    sentiment: localSignals?.sentiment || "Neutral",
    emotionalTone: localSignals?.emotionalTone || "Neutral",
    biasScore: geminiBiasScore,
    biasScoreFinal: finalBiasScore,
    framingType: politicalBias?.framingType || "neutral",
    missingPerspective: politicalBias?.missingPerspective || "",
    loadedLanguageCount: Number(politicalBias?.loadedLanguageCount) || 0,
    topic: politicalBias?.topic || "general",
    confidence: clampScore(
      typeof politicalBias?.confidence === "number"
        ? politicalBias.confidence
        : Number(politicalBias?.confidence) || 0
    ),
    loadedWords,
    emotionalLanguage,
    opposingViewsPresent: Boolean(politicalBias?.opposingViewsPresent),
    perspectiveBalanceScore,
    framingInsight,
    sourceLean,
    leanDeviation,
  };
}

/**
 * Searches the database for an already-analyzed article with the same hash to reuse its bias data and save computation.
 * Used internally by `analyzeSingleArticleBias` and `runBiasAnalysisBatch` to query the DB for previously analyzed identical content to reuse results.
 * @returns {Object|null} A database document of the cached article, or null.
 */
async function findCachedBiasByHash(articleHash, currentArticleId) {
  if (!articleHash) {
    return null;
  }

  return Article.findOne({
    articleHash,
    processingStatus: "bias_analyzed",
    "bias.biasScore": { $ne: null },
    _id: { $ne: currentArticleId },
  }).lean();
}

/**
 * Orchestrates the end-to-end bias analysis for a single article, handling caching, local signals, and LLM requests.
 * Used externally by `pdfArticleService.js` to execute the full bias analysis pipeline for a single article (typically one-off file uploads like PDFs).
 * @returns {Object} The final bias record object for the article.
 */
async function analyzeSingleArticleBias(article) {
  const articleHash = buildArticleHash(article);
  const contentLength = getArticleContentLength(article);

  if (hasExistingBiasData(article)) {
    if (articleHash && article.articleHash !== articleHash) {
      await Article.findByIdAndUpdate(article._id, {
        $set: {
          articleHash,
          sourceLean: article.sourceLean || getSourceLean(article.source),
        },
      });
    }

    return {
      ...(article.bias || {}),
      articleHash,
    };
  }

  if (contentLength < 200) {
    throw new Error("Article content too short for bias analysis");
  }

  const cachedArticle = await findCachedBiasByHash(articleHash, article._id);

  if (cachedArticle?.bias) {
    return {
      ...cachedArticle.bias,
      articleHash,
    };
  }

  const biasText = buildBiasText(article);
  let localSignals;

  try {
    localSignals = await analyzeLocalBiasSignals(biasText);
  } catch (error) {
    localSignals = buildFallbackLocalSignals(error);
  }

  const [politicalBias] = await analyzePoliticalBiasBatch([
    {
      _id: article._id,
      biasText,
    },
  ]);

  return {
    ...buildBiasRecord(article, politicalBias, localSignals),
    articleHash,
  };
}

/**
 * The main entry point for processing multiple articles. It chunks articles into batches, checks caches, runs local/LLM analyses, assigns event clusters, and evaluates overall accuracy.
 * Used externally by `biasRunner.js` (cron jobs/background tasks) and `biasController.js` (API endpoints) to bulk process scraped articles in the DB.
 * @returns {Object} An object summarizing the batch execution, including success status, number of analyzed articles, failures, and evaluation metrics.
 */
async function runBiasAnalysisBatch(batchSize = DEFAULT_BATCH_SIZE, articleIds = []) {
  try {
    const effectiveBatchSize = BATCH_SIZE;
    const articles = await fetchArticlesForBiasAnalysis(effectiveBatchSize, articleIds);

    if (articles.length === 0) {
      return {
        success: true,
        message: "No summarized scraped articles to analyze.",
        analyzed: 0,
      };
    }

    let analyzed = 0;
    const failures = [];
    const analyzedArticleIds = [];
    const articleBatches = [];
    const evaluatedArticles = [];

    for (let index = 0; index < articles.length; index += BATCH_SIZE) {
      articleBatches.push(articles.slice(index, index + BATCH_SIZE));
    }

    for (const [batchIndex, batchArticles] of articleBatches.entries()) {
      const batchNumber = batchIndex + 1;
      console.log("Processing bias batch:", batchNumber);

      const localResults = new Array(batchArticles.length);
      const clusterCandidates = [];
      const geminiEligibleArticles = [];
      const geminiEligibleIndexes = [];

      for (const [index, article] of batchArticles.entries()) {
        const articleHash = buildArticleHash(article);
        const contentLength = getArticleContentLength(article);

        if (hasExistingBiasData(article)) {
          if (articleHash && article.articleHash !== articleHash) {
            await Article.findByIdAndUpdate(article._id, {
              $set: {
                articleHash,
              },
            });
          }

          analyzedArticleIds.push(String(article._id));
          evaluatedArticles.push(article?.toObject ? article.toObject() : article);
          continue;
        }

        if (contentLength < 200) {
          const reason = "Article content too short for bias analysis";
          await markArticleBiasFailed(article._id, reason);
          failures.push({
            articleId: article._id,
            error: reason,
          });
          continue;
        }

        const biasText = buildBiasText(article);

        try {
          localResults[index] = await analyzeLocalBiasSignals(biasText);
        } catch (error) {
          const reason = error.message || "Unknown local bias analysis error";
          console.warn("Local bias analysis unavailable for article:", article._id, reason);
          localResults[index] = buildFallbackLocalSignals(error);
        }

        const cachedArticle = await findCachedBiasByHash(articleHash, article._id);

        if (cachedArticle?.bias) {
          const bias = buildBiasRecord(article, cachedArticle.bias, localResults[index]);
          const updatedArticle = await updateArticleBias(
            article._id,
            bias,
            { articleHash }
          );
          analyzed++;
          analyzedArticleIds.push(String(article._id));
          evaluatedArticles.push(
            updatedArticle?.toObject ? updatedArticle.toObject() : updatedArticle
          );
          clusterCandidates.push(
            updatedArticle?.toObject ? updatedArticle.toObject() : updatedArticle
          );
          continue;
        }

        geminiEligibleArticles.push({
          ...article.toObject(),
          articleHash,
          biasText: biasText.slice(0, MAX_BIAS_CONTEXT_LENGTH),
        });
        geminiEligibleIndexes.push(index);
      }

      if (geminiEligibleArticles.length === 0) {
        if (clusterCandidates.length > 0) {
          await assignEventClusters(clusterCandidates.filter(Boolean));
        }
        continue;
      }

      try {
        const geminiBatchPayload = geminiEligibleArticles.map((article) => ({
          _id: article._id,
          biasText: article.biasText,
        }));
        const politicalBiasResults = await analyzePoliticalBiasBatch(geminiBatchPayload);

        for (const [resultIndex, politicalBias] of politicalBiasResults.entries()) {
          const articleIndex = geminiEligibleIndexes[resultIndex];
          const article = batchArticles[articleIndex];
          const localSignals = localResults[articleIndex];
          const articleHash = geminiEligibleArticles[resultIndex].articleHash;
          const bias = buildBiasRecord(article, politicalBias, localSignals);

          const updatedArticle = await updateArticleBias(article._id, bias, {
            articleHash,
          });
          analyzed++;
          analyzedArticleIds.push(String(article._id));
          evaluatedArticles.push(
            updatedArticle?.toObject ? updatedArticle.toObject() : updatedArticle
          );
          clusterCandidates.push(
            updatedArticle?.toObject ? updatedArticle.toObject() : updatedArticle
          );
        }

        if (clusterCandidates.length > 0) {
          await assignEventClusters(clusterCandidates.filter(Boolean));
        }
      } catch (error) {
        const reason = error.message || "Unknown Gemini batch analysis error";

        for (const article of geminiEligibleArticles) {
          console.error("Gemini batch bias analysis failed for article:", article._id, reason);
          await markArticleBiasFailed(article._id, reason);
          failures.push({
            articleId: article._id,
            error: reason,
          });
        }
      }
    }

    const evaluation = evaluateBiasAccuracy(evaluatedArticles);
    console.log("Bias Evaluation:");
    console.log(`Articles Tested: ${evaluation.articlesTested}`);
    console.log(`Correct Predictions: ${evaluation.correctPredictions}`);
    console.log(`Accuracy: ${evaluation.accuracy.toFixed(2)}`);

    return {
      success: true,
      message: "Bias analysis completed.",
      analyzed,
      attempted: articles.length,
      batchSize: BATCH_SIZE,
      requestedBatchSize: batchSize,
      articleIds: analyzedArticleIds,
      failures,
      evaluation,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = {
  buildBiasText,
  analyzeSingleArticleBias,
  buildArticleHash,
  computePerspectiveBalance,
  generateArticleHash,
  computeLeanDeviation: calculateLeanDeviation,
  generateFramingInsight,
  runBiasAnalysisBatch,
};
