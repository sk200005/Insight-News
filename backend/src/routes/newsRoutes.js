const express = require("express");
const { ingestArticles } = require("../services/rssIngestionService");
const { getNewsArticles, getClusterArticles } = require("../controllers/articleController");

const router = express.Router();

router.get("/", getNewsArticles);

router.get("/cluster/:clusterId", getClusterArticles);

router.get("/reload-news", async (req, res) => {
  try {
    const result = await ingestArticles();

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
