//Scrapping of news Articles

const axios = require("axios");
const cheerio = require("cheerio");
const Article = require("../models/Article");

const SCRAPE_BATCH_SIZE = 3;
const MIN_ARTICLE_CONTENT_LENGTH = 200;

function normalizeParagraph(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim();
}

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
