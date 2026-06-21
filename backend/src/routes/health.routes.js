const express = require("express");
const router = express.Router();

const { testServer } = require("../controllers/health.controller");

router.get("/health", testServer);
router.get("/test", testServer);

module.exports = router;
