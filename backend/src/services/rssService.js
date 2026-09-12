/*
// ==========================================
// NOT USED: rssService.js
// Reason: This service is only a wrapper for `rssIngestionService.js` and is solely 
// imported by the redundant `rssController.js`. The active application bypasses this 
// file entirely and calls `rssIngestionService.js` directly from `newsRoutes.js`.
// ==========================================

const { ingestArticles } = require("./rssIngestionService");

async function fetchRSS() {
  try {
    const result = await ingestArticles();

    return {
      success: true,
      message: `${result.count} articles fetched`,
      ...result,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = fetchRSS;
*/
