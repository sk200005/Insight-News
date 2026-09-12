/*
// ==========================================
// NOT USED: rssController.js
// Reason: The `/api/rss/fetch` endpoint (mapped in `rssRoutes.js`) is obsolete 
// and only called by the unused `Home.jsx` page. The application's news fetching 
// logic actually flows directly from `newsRoutes.js` -> `rssIngestionService.js`.
// ==========================================
// IMPORTED SERVICE FUNCTION & ITS WORKING:
// ==========================================
// fetchRSS():
// - Found in: ../services/rssService
// - How it works: Loops through configured RSS feed URLs (from rssFeeds.js),
//   downloads the XML feeds, parses each news item (title, link, publication date, source),
//   checks whether the article already exists in MongoDB, and saves new entries with
//   an initial status like "pending".
// ==========================================

const fetchRSS = require("../services/rssService");

// Controller: fetchRSSController
// What it does:
// - Triggers the RSS feed ingestion process by calling fetchRSS().
// - If successful, returns status code 200 with details (articles fetched/saved).
// - If it fails, returns status code 500 with the error message.
const fetchRSSController = async (req, res) => {
  const result = await fetchRSS();
  res.status(result.success ? 200 : 500).json(result);
};

module.exports = fetchRSSController;
*/