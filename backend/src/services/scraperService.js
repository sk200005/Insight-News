//Scrapping of news Articles

const axios = require("axios");
const cheerio = require("cheerio");
const Article = require("../models/Article");

const SCRAPE_BATCH_SIZE = 3;
const MIN_ARTICLE_CONTENT_LENGTH = 200;

/**
 * Cleans and normalizes text by replacing multiple whitespaces/newlines with a single space and trimming.
 * Motive: Ensures scraped text is clean and uniformly formatted before saving to the database.
 * Input: {string} text - The raw text string to normalize.
 * Output: {string} - The cleaned and trimmed text string.
 * Usage: Used internally by extractParagraphBlocks and buildScrapedContent.
 */
function normalizeParagraph(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Iterates through a list of CSS selectors to find and extract meaningful paragraph text from a parsed HTML document.
 * Motive: Different news sites have different DOM structures. This tries multiple selectors and filters out common subscription boilerplate text to get the actual article content.
 * Input: 
 *   - {Object} $ - The loaded Cheerio HTML document.
 *   - {Array} selectors - Array of CSS selector strings to try.
 * Output: {Array} - Array of extracted and normalized paragraph strings. Returns empty array if none found.
 * Usage: Used internally by buildScrapedContent to extract the main body of the article.
 */
function extractParagraphBlocks($, selectors) {
  for (const selector of selectors) {
    const paragraphs = $(selector)
      .map((_, element) => normalizeParagraph($(element).text()))
      .get()
      .filter((text) => {
        if (!text) return false;
        // Filter out subscription boilerplate text common in The Hindu and other sites
        if (text.includes("Your active subscription")) return false;
        if (text.includes("Account subscription benefits")) return false;
        if (text.includes("Unlock these with Subscription")) return false;
        return true;
      });

    if (paragraphs.length > 0) {
      return paragraphs;
    }
  }

  return [];
}

/**
 * Constructs the final comprehensive text content for an article by combining extracted paragraphs, meta descriptions, and RSS feed content.
 * Motive: Maximizes the amount of meaningful text gathered for an article by aggregating multiple sources from the webpage, removing duplicates, and truncating to a safe length.
 * Input: 
 *   - {Object} $ - The loaded Cheerio HTML document.
 *   - {Object} article - The article document containing fallback content like meta description or RSS content.
 * Output: {string} - The combined, deduplicated, and truncated text content string (max 10000 chars).
 * Usage: Used internally by scrapeArticles to build the 'rawContent' field for the database.
 */
function buildScrapedContent($, article) {
  const paragraphBlocks = extractParagraphBlocks($, [
    "article p",
    "[itemprop='articleBody'] p",
    ".articlebodycontent p",
    "[data-testid='article-body'] p",
    ".article-body p",
    "main p",
    "p",
  ]);

  const metaDescription = normalizeParagraph(
    $('meta[name="description"]').attr("content") ||
    $('meta[property="og:description"]').attr("content") ||
    ""
  );
  const feedContent = normalizeParagraph(article.content);

  const combinedBlocks = [
    ...paragraphBlocks,
    metaDescription,
    feedContent,
  ].filter(Boolean);

  const uniqueBlocks = combinedBlocks.filter(
    (block, index) => combinedBlocks.indexOf(block) === index
  );

  return uniqueBlocks.join("\n\n").slice(0, 10000);
}

/**
 * The main orchestrator for the scraping pipeline. Finds pending articles, fetches their URLs, and extracts their full content.
 * Motive: Enriches partially ingested RSS articles by visiting their actual web pages and scraping the full text content and better images.
 * Input: {Array} [articleIds=[]] - Optional array of specific article IDs to scrape. If empty, it automatically picks the latest 'pending' articles based on batch size.
 * Output: {Object} - A result object containing success status, counts of attempted/scraped/failed articles, and their respective IDs.
 * Usage: Expected to be called by a cron job, a background worker, or an API controller after RSS ingestion is complete.
 */
const scrapeArticles = async (articleIds = []) => {
  try {
    const query = {
      processingStatus: "pending",
    };

    if (Array.isArray(articleIds) && articleIds.length > 0) {
      query._id = { $in: articleIds };
    }

    const articles = await Article.find(query)
      .sort({ publishedAt: -1 })
      .limit(SCRAPE_BATCH_SIZE);
    const scrapedArticleIds = [];
    const failedArticleIds = [];

    for (let article of articles) {
      try {
        const response = await axios.get(article.link, {
          timeout: 10000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
          }
        });

        const $ = cheerio.load(response.data);

        const rawContent = buildScrapedContent($, article);

        const image =
          $('meta[property="og:image"]').attr("content") || article.image || "";

        if (!rawContent || rawContent.length < MIN_ARTICLE_CONTENT_LENGTH) {
          article.processingStatus = "failed";
          await article.save();
          failedArticleIds.push(String(article._id));
          continue;
        }

        article.rawContent = rawContent;
        article.image = image;
        article.processingStatus = "scraped";

        await article.save();
        scrapedArticleIds.push(String(article._id));

      } catch (err) {
        article.processingStatus = "failed";
        await article.save();
        failedArticleIds.push(String(article._id));
      }
    }

    return {
      success: true,
      message: "Scraping completed",
      attempted: articles.length,
      scraped: scrapedArticleIds.length,
      articleIds: scrapedArticleIds,
      failedArticleIds,
      batchSize: SCRAPE_BATCH_SIZE,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = scrapeArticles;
