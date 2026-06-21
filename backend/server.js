require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const PORT = process.env.PORT || 8000;

const rssRoutes = require("./src/routes/rssRoutes");
const newsRoutes = require("./src/routes/newsRoutes");
const scraperRoutes = require("./src/routes/scraperRoutes");
const articleRoutes = require("./src/routes/articleRoutes");
const biasRoutes = require("./src/routes/biasRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const summarizationRoutes = require("./src/routes/summarizationRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const recommendRoutes = require("./src/routes/recommendRoutes");
const healthRoutes = require("./src/routes/health.routes");


const app = express();

const isBlankEnvValue = (value) => {
  if (!value) return true;
  return ["null", "undefined", ""].includes(String(value).trim().toLowerCase());
};

const parseOrigins = (value) =>
  String(value || "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);

const mongoUri = !isBlankEnvValue(process.env.MONGO_URI)
  ? process.env.MONGO_URI
  : !isBlankEnvValue(process.env.MONGODB_URI)
    ? process.env.MONGODB_URI
    : "mongodb://127.0.0.1:27017/insight-ai";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://insight-news-eight.vercel.app",
  ...parseOrigins(process.env.FRONTEND_URL),
  ...parseOrigins(process.env.CLIENT_ORIGIN),
  ...parseOrigins(process.env.CLIENT_ORIGINS),
  ...parseOrigins(process.env.CORS_ORIGIN),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
  });

app.use("/api", healthRoutes);
app.use("/api/rss", rssRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/scraper", scraperRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/bias", biasRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/summarize", summarizationRoutes);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
