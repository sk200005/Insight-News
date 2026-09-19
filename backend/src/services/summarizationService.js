const { removeNoise } = require("../../utils/articleCleaner");
const { buildSummaryInput, splitIntoSentences } = require("../../utils/sentenceUtils");
const { generateBulletSummary } = require("../../utils/summaryFormatter");

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am",
  "an", "and", "any", "are", "as", "at", "be", "because", "been", "before",
  "being", "below", "between", "both", "but", "by", "can", "could", "did",
  "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers",
  "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no",
  "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "you", "your", "yours", "yourself", "yourselves",
]);

const MAX_INPUT_CHARS = 1800;
const MAX_SUMMARY_CHARS = 400;
const MAX_SUMMARY_SENTENCES = 3;

function tokenize(text) { 
  //Convert a text into a clean list of meaningful keywords 
  // by removing punctuation, short words, and stop words.

  
  //   "What is India's economy?"
  //         ↓
  // ["india's", "economy"]

  return String(text || "")
    .toLowerCase()
    .match(/[a-z0-9']+/g)   // g → find all matches
    ?.filter((word) => word.length > 2 && !STOP_WORDS.has(word)) || [];
}

function prepareTextForSummary(rawContent) {
  const cleaned = removeNoise(rawContent);
  return buildSummaryInput(cleaned, MAX_INPUT_CHARS);
}

function buildWordFrequencies(sentences) {
  const frequencies = new Map();

  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      frequencies.set(word, (frequencies.get(word) || 0) + 1);
    }
  }

  return frequencies;
}

function scoreSentence(sentence, index, sentenceCount, frequencies) {
  const words = tokenize(sentence);

  if (words.length === 0) {
    return 0;
  }

  const keywordScore = words.reduce(
    (total, word) => total + (frequencies.get(word) || 0),
    0
  ) / words.length;

  const uniqueWordBoost = new Set(words).size / words.length;
  const positionBoost = index === 0 ? 1.35 : index < 3 ? 1.15 : 1;
  const lengthPenalty = words.length > 45 ? 0.9 : words.length < 8 ? 0.75 : 1;
  const endingBoost = index === sentenceCount - 1 ? 1.05 : 1;

  return keywordScore * uniqueWordBoost * positionBoost * lengthPenalty * endingBoost;
}

function selectSummarySentences(sentences, maxSentences = MAX_SUMMARY_SENTENCES) {
  const frequencies = buildWordFrequencies(sentences);
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: scoreSentence(sentence, index, sentences.length, frequencies),
  }));

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
}

function cleanSummary(summary) {
  return removeNoise(summary);
}

function limitSummaryLength(summary) {
  const sentences = splitIntoSentences(summary).slice(0, MAX_SUMMARY_SENTENCES);
  let limited = sentences.join(" ").trim();

  if (!limited) {
    limited = String(summary || "").trim();
  }

  if (limited.length <= MAX_SUMMARY_CHARS) {
    return limited;
  }

  const safeLimited = buildSummaryInput(limited, MAX_SUMMARY_CHARS);

  if (safeLimited) {
    return safeLimited;
  }

  return limited.slice(0, MAX_SUMMARY_CHARS).trim();
}

async function summarizeArticle(rawContent) {
  if (!rawContent || !String(rawContent).trim()) {
    return {
      summaryText: "",
      summaryPoints: [],
    };
  }

  const summaryInput = prepareTextForSummary(rawContent);

  console.log("Cleaned article text prepared for summarization");

  if (!summaryInput) {
    return {
      summaryText: "",
      summaryPoints: [],
    };
  }

  const sentences = splitIntoSentences(summaryInput)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);

  let summary;

  if (sentences.length === 0) {
    summary = summaryInput;
  } else if (sentences.length <= MAX_SUMMARY_SENTENCES) {
    summary = sentences.join(" ");
  } else {
    const summarySentences = selectSummarySentences(sentences, MAX_SUMMARY_SENTENCES);
    summary = summarySentences.join(" ").trim();

    if (summary.length < 120) {
      summary = sentences.slice(0, MAX_SUMMARY_SENTENCES).join(" ").trim();
    }
  }

  const summaryText = limitSummaryLength(cleanSummary(summary));
  const summaryPoints = generateBulletSummary(summaryText);

  console.log("Generated professional summary");

  return {
    summaryText,
    summaryPoints,
  };
}

module.exports = {
  cleanSummary,
  formatSummaryPoints: generateBulletSummary,
  prepareTextForSummary,
  summarizeArticle,
};
