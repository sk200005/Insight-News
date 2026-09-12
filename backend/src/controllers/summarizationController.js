// ==========================================
// IMPORTED SERVICE FUNCTION & ITS WORKING:
// ==========================================
// summarizeArticle(rawContent):
// - Found in: ../services/summarizationService
// - How it works: Takes the raw, scraped body text of an article, sends it to an AI model
//   (e.g., Gemini or OpenAI), and prompts the model to return:
//     1) summaryText: a concise, neutral 2-3 sentence overview.
//     2) summaryPoints: 3 to 5 key bullet points highlighting important facts.
// ==========================================

const Article = require("../models/Article");
const { summarizeArticle } = require("../services/summarizationService");

// Number of articles to summarize in one API call to prevent timeouts or rate limits
const BATCH_SIZE = 3;

/**
 * Controller: summarizePendingArticles
 * What it does:
 * 1. Checks if specific article IDs were requested in the body; otherwise finds articles
 *    where rawContent exists, summary is empty, and processingStatus is "scraped".
 * 2. Fetches a small batch of up to 3 articles (sorted newest first).
 * 3. Loops through each article and calls summarizeArticle(article.rawContent).
 * 4. Saves the generated summaryText and summaryPoints to the article in MongoDB.
 * 5. Updates processingStatus to "analyzed".
 * 6. Returns a summary report with the count and IDs of summarized articles.
 */
async function summarizePendingArticles(req, res) {
  try {
    const articleIds = Array.isArray(req.body?.articleIds) ? req.body.articleIds : [];
    const query = {
      rawContent: { $exists: true, $ne: "" },
      summary: "",
      processingStatus: "scraped",
    };

    if (articleIds.length > 0) {
      query._id = { $in: articleIds };
    }

    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(BATCH_SIZE);

    if (articles.length === 0) {
      return res.json({
        success: true,
        message: "No articles need summarization.",
        summarized: 0,
      });
    }

    let summarized = 0;
    const summarizedArticleIds = [];

    for (const article of articles) {
      try {
        const { summaryText, summaryPoints } = await summarizeArticle(article.rawContent);

        if (!summaryText) {
          continue;
        }

        article.summary = summaryText;
        article.summaryText = summaryText;
        article.summaryPoints = summaryPoints;
        article.processingStatus = "analyzed";
        await article.save();
        summarized++;
        summarizedArticleIds.push(String(article._id));
      } catch (error) {
        console.error("Summarization failed for article:", article._id, error.message);
      }
    }

    return res.json({
      success: true,
      message: "Summarization completed.",
      summarized,
      attempted: articles.length,
      batchSize: BATCH_SIZE,
      articleIds: summarizedArticleIds,
    });
  } catch (error) {
    console.error("Summarization controller error:", error);
    return res.status(500).json({
      success: false,
      error: "Server error during summarization.",
    });
  }
}

module.exports = { summarizePendingArticles };
