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


const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/insight-ai")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

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