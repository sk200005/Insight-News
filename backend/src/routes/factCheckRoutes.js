const express = require("express");
const { searchFactChecks, fetchArticleImage } = require("../controllers/factCheckController");

const router = express.Router();

router.get("/", searchFactChecks);
router.get("/image", fetchArticleImage);

module.exports = router;
