const { OpenAI } = require("openai");

let ai;

const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_TEMPERATURE = 0.1;
const GROQ_DELAY_MS = 2000;
const MAX_CONTEXT_LENGTH = 1800;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

  if (!ai) {
    ai = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    });
  }

  return ai;
}

function parseGroqJson(text) {
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

function clampScore(score) {
  return Math.max(0, Math.min(1, score));
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return allowedValues.includes(normalized) ? normalized : fallback;
}

function normalizeText(value, fallback = "") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function normalizeLoadedLanguageCount(result) {
  if (typeof result?.loadedLanguageCount === "number") {
    return Math.max(0, Math.round(result.loadedLanguageCount));
  }

  if (Array.isArray(result?.loadedWords)) {
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
    "politicalLean": "left | center | right (Note: For Indian news, consider cultural nationalism as 'right' and secular/welfare-focused narratives as 'left')",
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

async function executeGroqPrompt(prompt) {
  const client = getGroqClient();
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: "You are a helpful assistant that strictly responds with valid JSON matching the requested schema. Do not output anything other than JSON." },
      { role: "user", content: prompt }
    ],
    temperature: GROQ_TEMPERATURE,
    response_format: { type: "json_object" },
  });

  console.log("Groq response received");
  await sleep(GROQ_DELAY_MS);

  return response.choices[0].message.content;
}

async function callGroqWithRetry(prompt, retries = 3) {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await executeGroqPrompt(prompt);
    } catch (error) {
      if (!isRateLimitError(error) || attempt === retries) {
        throw error;
      }

      const delay = GROQ_DELAY_MS * 2 ** attempt;
      console.log("Retrying Groq call due to rate limit");
      await sleep(delay);
      attempt += 1;
    }
  }

  throw new Error("Groq call failed after retries");
}

async function analyzePoliticalBiasBatch(articles) {
  if (!Array.isArray(articles) || articles.length === 0) {
    return [];
  }

  try {
    const prompt = buildBatchPrompt(articles);
    // Since response_format: { type: 'json_object' } requires JSON object, wrap prompt to return an object with "data" array
    const modifiedPrompt = prompt.replace('Required JSON schema:\n[', 'Required JSON schema:\n{"data": [\n')
                                 .replace('  }\n]', '  }\n]}');

    const responseText = await callGroqWithRetry(modifiedPrompt);
    const parsedObj = parseGroqJson(responseText);
    const parsed = parsedObj.data || parsedObj; // Handle if wrapped or returned array

    if (!Array.isArray(parsed)) {
      throw new Error("Groq response was not a JSON array");
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
        `Groq response count mismatch: expected ${articles.length}, received ${normalizedResults.length}`
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
    throw new Error(`Groq batch bias analysis failed: ${error.message}`);
  }
}

module.exports = {
  analyzePoliticalBiasBatch,
};
