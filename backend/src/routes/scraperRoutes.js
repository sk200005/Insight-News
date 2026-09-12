const express = require("express");
const router = express.Router();

const scrapeArticles = require("../services/scraperService");

router.post("/run", async (req, res) => {
  const result = await scrapeArticles(req.body?.articleIds);
  res.json(result);
});

module.exports = router;