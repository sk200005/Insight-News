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

  const uniqueWordBoost = new Set(words).size / words.length;      // avoid repetition of words
  const positionBoost = index === 0 ? 1.35 : index < 3 ? 1.15 : 1;
  const lengthPenalty = words.length > 45 ? 0.9 : words.length < 8 ? 0.75 : 1;
  const endingBoost = index === sentenceCount - 1 ? 1.05 : 1;

  return keywordScore * uniqueWordBoost * positionBoost * lengthPenalty * endingBoost;
}

function getEmptyMetrics() {
  return {
    originalLength: 0,
    summaryLength: 0,
    compressionRatio: "0%",
    sentencesRetained: "0/0",
    averageScore: 0,
    keywordCoverage: "0%",
  };
}

function calculateSummaryMetrics({
  rawContent = "",
  summaryText = "",
  totalCandidateSentences = 0,
  selectedSentencesCount = 0,
  selectedItems = [],
  frequencies = new Map(),
}) {
  const originalLength = String(rawContent || "").length;
  const summaryLength = String(summaryText || "").length;

  const ratio = originalLength > 0
    ? Math.max(0, (1 - summaryLength / originalLength) * 100)
    : 0;
  const compressionRatio = `${ratio.toFixed(1)}%`;

  const avgScore = selectedItems.length > 0
    ? selectedItems.reduce((acc, item) => acc + (item.score || 0), 0) / selectedItems.length
    : 0;

  const sortedKeywords = Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  const summaryWords = new Set(tokenize(summaryText));
  const matchedKeywords = sortedKeywords.filter((word) => summaryWords.has(word));
  const keywordCoverage = sortedKeywords.length > 0
    ? `${((matchedKeywords.length / sortedKeywords.length) * 100).toFixed(1)}%`
    : "100%";

  return {
    originalLength,
    summaryLength,
    compressionRatio,
    sentencesRetained: `${selectedSentencesCount}/${totalCandidateSentences}`,
    averageScore: Number(avgScore.toFixed(2)),
    keywordCoverage,
  };
}

//-------------------------IMPORTANT----------------------------------------------
function selectSummarySentences(sentences, maxSentences = MAX_SUMMARY_SENTENCES) {
  const frequencies = buildWordFrequencies(sentences);
  const ranked = sentences.map((sentence, index) => ({
    sentence,
    index,
    score: scoreSentence(sentence, index, sentences.length, frequencies),
  }));

  const selectedItems = ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index);

  return {
    selectedSentences: selectedItems.map((item) => item.sentence),
    selectedItems,
    frequencies,
    ranked,
  };
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
      metrics: getEmptyMetrics(),
    };
  }

  const summaryInput = prepareTextForSummary(rawContent);

  console.log("Cleaned article text prepared for summarization");

  if (!summaryInput) {
    return {
      summaryText: "",
      summaryPoints: [],
      metrics: getEmptyMetrics(),
    };
  }

  const sentences = splitIntoSentences(summaryInput)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);

  let summary;
  let selectedItems = [];
  let frequencies = new Map();

  if (sentences.length === 0) {
    summary = summaryInput;
  } else if (sentences.length <= MAX_SUMMARY_SENTENCES) {
    frequencies = buildWordFrequencies(sentences);
    selectedItems = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, index, sentences.length, frequencies),
    }));
    summary = sentences.join(" ");
  } else {
    const selection = selectSummarySentences(sentences, MAX_SUMMARY_SENTENCES);
    frequencies = selection.frequencies;
    selectedItems = selection.selectedItems;
    summary = selection.selectedSentences.join(" ").trim();

    if (summary.length < 120) {
      selectedItems = selection.ranked.slice(0, MAX_SUMMARY_SENTENCES);
      summary = sentences.slice(0, MAX_SUMMARY_SENTENCES).join(" ").trim();
    }
  }

  const summaryText = limitSummaryLength(cleanSummary(summary));
  const summaryPoints = generateBulletSummary(summaryText);
  const metrics = calculateSummaryMetrics({
    rawContent,
    summaryText,
    totalCandidateSentences: sentences.length,
    selectedSentencesCount: selectedItems.length || (summaryPoints.length || 0),
    selectedItems,
    frequencies,
  });

  console.log("Generated professional summary with metrics");

  return {
    summaryText,
    summaryPoints,
    metrics,
  };
}

module.exports = {
  cleanSummary,
  calculateSummaryMetrics,
  formatSummaryPoints: generateBulletSummary,
  prepareTextForSummary,
  summarizeArticle,
};
