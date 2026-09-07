const express = require("express");
const { searchFactChecks } = require("../controllers/factCheckController");

const router = express.Router();

router.get("/", searchFactChecks);

module.exports = router;
