const { GoogleGenAI } = require("@google/genai");

let ai;

const GEMINI_MODEL = "models/gemini-2.5-flash";
const GEMINI_TEMPERATURE = 0.1;       // 0 - 2 (0 deterministic, 2 creative)
const GEMINI_DELAY_MS = 2000;         // avoid hitting Gemini's rate limits.
const MAX_CONTEXT_LENGTH = 1800;

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,   // our gemini api key provided by SRE team in class
    });
  }

  return ai;
}

function parseGeminiJson(text) {
  const cleaned = String(text || "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1));
    }

    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1));
    }

    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampScore(score) {                 //scores stay between 0 and 1
  return Math.max(0, Math.min(1, score)); 
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return allowedValues.includes(normalized) ? normalized : fallback;
}

function normalizeText(value, fallback = "") {      //If empty ("") returns a default value.
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeLoadedLanguageCount(result) {      // takes the loadedLanguageCount as input & ensure final loadedLanguageCount is not a negative value
  if (typeof result?.loadedLanguageCount === "number") {   // if the loadedLanguageCount is a number
    return Math.max(0, Math.round(result.loadedLanguageCount));   // ensures the final loadedLanguageCount is not a negative value
  }

  if (Array.isArray(result?.loadedWords)) {    // if loadedWords is an array
    return result.loadedWords.filter(Boolean).length;
  }

  return Math.max(0, Number(result?.loadedLanguageCount) || 0);
}

function normalizeArticleContext(article) {    
  return String(article?.biasText || article?.content || article?.summary || "")
    .trim()
    .slice(0, MAX_CONTEXT_LENGTH);
}

function defaultPoliticalBiasResult(article, index) {
  return {
    id: String(article?._id || article?.id || ""),
    politicalLean: "center",
    biasScore: 0,
    framingType: "neutral",
    missingPerspective: "",
    loadedLanguageCount: 0,
    topic: "general",
    confidence: 0,
    loadedWords: [],
    emotionalLanguage: [],
    opposingViewsPresent: true,
    articleIndex: index,
  };
}

function buildBatchPrompt(articles) {
  const formattedArticles = articles
    .map(
      (article) => `{
  "id": "${String(article._id || article.id || "")}",
  "context": ${JSON.stringify(normalizeArticleContext(article))}
}`
    )
    .join(",\n");

  return `You are a media bias detection system.
Analyze the article context and identify political bias signals.

Look specifically for:

* loaded or emotionally charged words
* imbalance in viewpoints
* framing language
* emotional tone used to influence opinion.

Return JSON only.

Required JSON schema:
[
  {
    "id": "article_id",
    "politicalLean": "left | center | right",
    "biasScore": 0.0,
    "framingType": "blame | crisis | hero | neutral",
    "missingPerspective": "brief missing viewpoint summary",
    "loadedLanguageCount": 0,
    "topic": "topic label",
    "confidence": 0.0
  }
]

Important:
biasScore must reflect overall bias intensity.
Return valid JSON only with one object per article.

Articles:
[
${formattedArticles}
]`;
}

function isRateLimitError(error) {
  return (
    error?.status === 429 ||
    error?.code === 429 ||
    error?.response?.status === 429 ||
    String(error?.message || "").includes("429")
  );
}

async function executeGeminiPrompt(prompt) {
  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: GEMINI_TEMPERATURE,
      responseMimeType: "application/json",
    },
  });

  console.log("Gemini response received");
  await sleep(GEMINI_DELAY_MS);

  return response.text;
}

async function callGeminiWithRetry(prompt, retries = 3) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await executeGeminiPrompt(prompt);
    } catch (error) {
      if (!isRateLimitError(error) || attempt === retries) {
        throw error;
      }

      const delay = GEMINI_DELAY_MS * 2 ** attempt;
      console.log("Retrying Gemini call due to rate limit");
      await sleep(delay);
      attempt += 1;
    }
  }

  throw new Error("Gemini call failed after retries");
}

async function analyzePoliticalBiasWithGemini(biasText) {
  try {
    const prompt = `You are a media bias detection system.
Analyze the article context and identify political bias signals.

Look specifically for:

* loaded or emotionally charged words
* imbalance in viewpoints
* framing language
* emotional tone used to influence opinion.

Return JSON only.

{
  "id": "article_id",
  "politicalLean": "left | center | right",
  "biasScore": 0.0,
  "framingType": "blame | crisis | hero | neutral",
  "missingPerspective": "brief missing viewpoint summary",
  "loadedLanguageCount": 0,
  "topic": "topic label",
  "confidence": 0.0
}

Article:
${String(biasText || "").slice(0, MAX_CONTEXT_LENGTH)}`;

    const responseText = await callGeminiWithRetry(prompt);
    return parseGeminiJson(responseText);
  } catch (error) {
    throw new Error(`Gemini bias analysis failed: ${error.message}`);
  }
}

async function analyzePoliticalBiasBatch(articles) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return [];
  }

  try {
    const prompt = buildBatchPrompt(articles);
    const responseText = await callGeminiWithRetry(prompt);
    const parsed = parseGeminiJson(responseText);

    if (!Array.isArray(parsed)) {
      throw new Error("Gemini response was not a JSON array");
    }

    const normalizedResults = parsed.map((result, index) => ({
      id: String(result?.id || articles[index]?._id || articles[index]?.id || ""),
      politicalLean: normalizeEnum(
        result?.politicalLean,
        ["left", "center", "right"],
        "center"
      ),
      biasScore: clampScore(
        typeof result?.biasScore === "number"
          ? result.biasScore
          : Number(result?.biasScore) || 0
      ),
      framingType: normalizeEnum(
        result?.framingType,
        ["blame", "crisis", "hero", "neutral"],
        "neutral"
      ),
      missingPerspective: normalizeText(result?.missingPerspective),
      loadedLanguageCount: normalizeLoadedLanguageCount(result),
      topic: normalizeText(result?.topic, "general"),
      confidence: clampScore(
        typeof result?.confidence === "number"
          ? result.confidence
          : Number(result?.confidence) || 0
      ),
      loadedWords: Array.isArray(result?.loadedWords)
        ? result.loadedWords.filter(Boolean)
        : Array.from(
            { length: normalizeLoadedLanguageCount(result) },
            (_, signalIndex) => `loaded-language-signal-${signalIndex + 1}`
          ),
      emotionalLanguage: Array.isArray(result?.emotionalLanguage)
        ? result.emotionalLanguage.filter(Boolean)
        : [],
      opposingViewsPresent:
        typeof result?.opposingViewsPresent === "boolean"
          ? result.opposingViewsPresent
          : !normalizeText(result?.missingPerspective),
      articleIndex: index,
    }));

    if (normalizedResults.length === articles.length) {
      return normalizedResults;
    }

    if (normalizedResults.length === 0) {
      throw new Error(
        `Gemini response count mismatch: expected ${articles.length}, received ${normalizedResults.length}`
      );
    }

    const resultById = new Map(
      normalizedResults.map((result) => [String(result.id), result])
    );

    return articles.map((article, index) => {
      const articleId = String(article?._id || article?.id || "");
      return resultById.get(articleId) || defaultPoliticalBiasResult(article, index);
    });
  } catch (error) {
    throw new Error(`Gemini batch bias analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzePoliticalBiasWithGemini,
  analyzePoliticalBiasBatch,
  buildBatchPrompt,
  callGeminiWithRetry,
};
