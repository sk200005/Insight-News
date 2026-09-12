// ==========================================
// IMPORTED SERVICE FUNCTION & ITS WORKING:
// ==========================================
// scrapeArticles():
// - Found in: ../services/scraperService
// - How it works: Searches the database for articles that only have links but missing full text
//   (status "pending"). It visits each article's URL, downloads the HTML page, uses Cheerio/Readability
//   to strip out ads/menus and extract the actual article text (rawContent), and updates the article's
//   processingStatus to "scraped".
// ==========================================

const scrapeArticles = require("../services/scraperService");

/**
 * Controller: scrapeController
 * What it does:
 * - Triggers the web scraping workflow across pending articles by calling scrapeArticles().
 * - Returns status 200 with stats (articles scraped, failed, remaining) if successful, or 500 on failure.
 */
const scrapeController = async (req, res) => {
  const result = await scrapeArticles();
  res.status(result.success ? 200 : 500).json(result);
};

module.exports = scrapeController;