require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const PORT = process.env.PORT || 8000;

const rssRoutes = require("./src/routes/rssRoutes");       //Each file contains related APIs.
const newsRoutes = require("./src/routes/newsRoutes");
const scraperRoutes = require("./src/routes/scraperRoutes");
const articleRoutes = require("./src/routes/articleRoutes");
const biasRoutes = require("./src/routes/biasRoutes");
const uploadRoutes = require("./src/routes/uploadRoutes");
const summarizationRoutes = require("./src/routes/summarizationRoutes");
const analyticsRoutes = require("./src/routes/analyticsRoutes");
const recommendRoutes = require("./src/routes/recommendRoutes");
const healthRoutes = require("./src/routes/health.routes");


const app = express();                                      //Calling it (express()) function creates an Express application (server)

const isBlankEnvValue = (value) => {
  if (!value) return true;                                  // returns true if the value is null, undefined, "" (empty string), 0, false
  return ["null", "undefined", ""].includes(String(value).trim().toLowerCase());   // return true/ false
};

const parseOrigins = (value) =>
  String(value || "")
    .split(",")                                             // "http://a.com,http://b.com,http://c.com/"  --> [ "http://a.com","http://b.com","http://c.com"]
    .map((origin) => origin.trim().replace(/\/+$/, ""))     // remove trailing slashes  =  "http://abc.com/" ==> "http://abc.com"
    .filter(Boolean);                                       // remove empty strings ""

const mongoUri = !isBlankEnvValue(process.env.MONGO_URI)    // checks if MONGO_URI is not empty or null or undefined or ""
  ? process.env.MONGO_URI
  : !isBlankEnvValue(process.env.MONGODB_URI)               // checks if MONGODB_URI is not empty or null or undefined or ""
    ? process.env.MONGODB_URI
    : "mongodb://127.0.0.1:27017/insight-ai";               // if both are empty or null or undefined or "", then use "mongodb://127.0.0.1:27017/insight-ai"

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
  cors({                                                                     //Creates the CORS configuration. (who is allowed to access your backend.)
    origin(origin, callback) {                                               //callback → Function used to tell CORS Allow or Reject the request.
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ""))) {  // Postman, curl, Server-to-server requests do not have Origin header
        callback(null, true);                                                //null → No error, true → Allow the request.
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,                                                       //browser to send credentials with the request, such as: Cookies, Session IDs, Authentication tokens
  })
);

app.use(express.json());
app.use("/uploads", express.static(path.resolve(__dirname, "uploads")));

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 10000,                                           //Try to connect to the MongoDB server for up to 10 seconds
})
  .then(() => console.log("MongoDB Connected"))
  .catch(err => {
    console.error("MongoDB connection failed:", err.message);
  });

app.use("/api", healthRoutes);
app.use("/api/rss", rssRoutes);
app.use("/api/news", newsRoutes);              //If a request starts with /api/news, send it to newsRoutes to handle it.
app.use("/api/scraper", scraperRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/recommend", recommendRoutes);
app.use("/api/bias", biasRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/summarize", summarizationRoutes);


app.listen(PORT, () => {                                        //Makes the server listen for incoming requests on the specified port.
  console.log(`Server running on port ${PORT}`);
});