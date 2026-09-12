/* 
// ==========================================
// NOT USED: rssRoutes.js
// Reason: The `/api/rss/fetch` endpoint was only called by the unused `Home.jsx` page.
// The active application triggers RSS ingestion via `/api/news/reload-news` instead, 
// which is handled inside `newsRoutes.js`.
// ==========================================

const express = require("express");
const router = express.Router();
const fetchRSSController = require("../controllers/rssController");

router.get("/fetch", fetchRSSController);

module.exports = router;
*/