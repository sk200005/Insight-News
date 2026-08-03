const Article = require("../models/Article");

const DEFAULT_BATCH_SIZE = 3;

async function fetchArticlesForBiasAnalysis(batchSize = DEFAULT_BATCH_SIZE, articleIds = []) {
  const query = {
    summary: { $exists: true, $ne: "" },
    processingStatus: { $in: ["scraped", "analyzed"] },
  };

  if (Array.isArray(articleIds) && articleIds.length > 0) {  // if articleId is present and not empty , insert it into query to fetch particular articles
    query._id = { $in: articleIds };
  }

  return Article.find(query)
    .sort({ publishedAt: -1 }) // sort by published date
    .limit(batchSize);
}

async function updateArticleBias(articleId, bias, metadata = {}) { // update the bias of article
  return Article.findByIdAndUpdate(
    articleId,
    {
      $set: {
        bias,
        articleHash: metadata.articleHash || "",
        biasScore: bias.biasScoreFinal ?? bias.biasScore ?? 0,
        sentiment: bias.sentiment || "neutral",
        sourceLean: bias.sourceLean || "center",
        leanDeviation: Number.isFinite(bias.leanDeviation) ? bias.leanDeviation : 0,
        processingStatus: "bias_analyzed",
      },
    },
    { returnDocument: "after" }
  );
}

async function markArticleBiasFailed(articleId, errorMessage) {
  return Article.findByIdAndUpdate(
    articleId,
    {
      $set: {
        processingStatus: "analyzed",
        sentiment: "neutral",
        "bias.explanation": errorMessage,
      },
    },
    { returnDocument: "after" }
  );
}

module.exports = {
  DEFAULT_BATCH_SIZE,
  fetchArticlesForBiasAnalysis,
  updateArticleBias,
  markArticleBiasFailed,
};
