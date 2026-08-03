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

function clampScore(score) {
  return Math.max(0, Math.min(1, score));
}

function generateArticleHash(input) {
  return crypto
    .createHash("sha256")
    .update(String(input || "").trim().toLowerCase())
    .digest("hex");
}

function buildArticleHash(article) {
  return generateArticleHash(`${article?.title || ""}${article?.summary || ""}`);
}

function getArticleContentLength(article) {
  return String(article?.rawContent || article?.content || "").trim().length;
}

function hasExistingBiasData(article) {
  return Boolean(
    article?.bias?.politicalLean ||
    article?.bias?.biasScore !== undefined ||
    article?.bias?.biasScoreFinal !== undefined ||
    article?.processingStatus === "bias_analyzed"
  );
}

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

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function trimContext(text, maxLength = MAX_BIAS_CONTEXT_LENGTH) {
  const normalized = String(text || "").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function buildBiasText(article) {
  const rawContent = article.rawContent || article.content || "";
  const paragraphs = splitParagraphs(rawContent);
  const introParagraphs = paragraphs.slice(0, 2).join("\n\n");
  const conclusionParagraph = paragraphs.length > 0
    ? paragraphs[paragraphs.length - 1]
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

function buildFallbackLocalSignals(error) {
  return {
    sentiment: "Neutral",
    emotionalTone: "Neutral",
    explanation: error.message || "Local bias analysis unavailable",
  };
}

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
