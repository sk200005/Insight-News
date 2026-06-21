const express = require("express");
const cors = require("cors");
const path = require("path");
const rssRoutes = require("./routes/rssRoutes");
const articleRoutes = require("./routes/articleRoutes");
const scraperRoutes = require("./routes/scraperRoutes");
const newsRoutes = require("./routes/newsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const uploadRoutes = require("./routes/uploadRoutes");

const healthRoutes = require("./routes/health.routes");

const app = express();

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://insight-news-eight.vercel.app",
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.CLIENT_ORIGIN),
  ...parseOrigins(process.env.CLIENT_ORIGINS),
  ...parseOrigins(process.env.CORS_ORIGIN),
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

app.use("/api", healthRoutes);
app.use("/api/rss", rssRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api", scraperRoutes);

module.exports = app;
