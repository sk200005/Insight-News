const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const { PDFParse } = require("pdf-parse");
const Article = require("../models/Article");
const { summarizeArticle } = require("./summarizationService");
const { analyzeSingleArticleBias, generateArticleHash } = require("./biasAnalysisService");

const MIN_EXTRACTED_TEXT_LENGTH = 200;
const MAX_TITLE_LENGTH = 140;
const THUMBNAIL_DIR = path.resolve(__dirname, "../../uploads/pdf-thumbnails");
const UPLOADED_ARTICLE_IMAGE =
  "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%201200%20630%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22bg%22%20x1%3D%220%25%22%20x2%3D%22100%25%22%20y1%3D%220%25%22%20y2%3D%22100%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%230f172a%22/%3E%3Cstop%20offset%3D%2254%25%22%20stop-color%3D%22%230369a1%22/%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%2314b8a6%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width%3D%221200%22%20height%3D%22630%22%20fill%3D%22url(%23bg)%22/%3E%3Crect%20x%3D%2276%22%20y%3D%2270%22%20width%3D%22428%22%20height%3D%22490%22%20rx%3D%2236%22%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.94%22/%3E%3Cpath%20d%3D%22M414%2070v132h90%22%20fill%3D%22none%22%20stroke%3D%22%230f172a%22%20stroke-width%3D%2224%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20opacity%3D%220.18%22/%3E%3Crect%20x%3D%22138%22%20y%3D%22256%22%20width%3D%22302%22%20height%3D%2226%22%20rx%3D%2213%22%20fill%3D%22%230ea5e9%22/%3E%3Crect%20x%3D%22138%22%20y%3D%22318%22%20width%3D%22254%22%20height%3D%2222%22%20rx%3D%2211%22%20fill%3D%22%2315b8a6%22/%3E%3Crect%20x%3D%22138%22%20y%3D%22374%22%20width%3D%22310%22%20height%3D%2218%22%20rx%3D%229%22%20fill%3D%22%2394a3b8%22/%3E%3Crect%20x%3D%22138%22%20y%3D%22422%22%20width%3D%22228%22%20height%3D%2218%22%20rx%3D%229%22%20fill%3D%22%2394a3b8%22/%3E%3Ctext%20x%3D%22592%22%20y%3D%22272%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-size%3D%2258%22%20font-weight%3D%22700%22%20fill%3D%22%23ffffff%22%3ENews%20PDF%3C/text%3E%3Ctext%20x%3D%22594%22%20y%3D%22352%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-size%3D%2234%22%20font-weight%3D%22700%22%20fill%3D%22%23cffafe%22%3ESummary%20%2B%20Bias%20Analysis%3C/text%3E%3Ctext%20x%3D%22594%22%20y%3D%22418%22%20font-family%3D%22Arial%2C%20Helvetica%2C%20sans-serif%22%20font-size%3D%2224%22%20fill%3D%22%23e0f2fe%22%3EUser%20uploaded%20article%3C/text%3E%3C/svg%3E";

function normalizeWhitespace(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildFallbackTitle(filename) {
  const baseName = String(filename || "Uploaded News Article")
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return baseName || "Uploaded News Article";
}

function deriveTitleFromText(text, filename) {
  const lines = String(text || "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 12 && line.length <= 180);
  const title = lines.find((line) => /[a-zA-Z]/.test(line)) || buildFallbackTitle(filename);

  return title.length > MAX_TITLE_LENGTH
    ? `${title.slice(0, MAX_TITLE_LENGTH - 3).trim()}...`
    : title;
}

function buildUploadLink(text, filename) {
  const hash = crypto
    .createHash("sha256")
    .update(`${String(filename || "").toLowerCase()}:${String(text || "").trim()}`)
    .digest("hex");

  return `user-upload://pdf/${hash}`;
}

function buildThumbnailFilename(link) {
  return `${crypto.createHash("sha256").update(link).digest("hex")}.png`;
}

function normalizeBaseUrl(publicBaseUrl) {
  return String(publicBaseUrl || "http://localhost:8000").replace(/\/+$/, "");
}

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text);
  } finally {
    await parser.destroy();
  }
}

async function renderPdfThumbnail(buffer, link, publicBaseUrl) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getScreenshot({
      first: 1,
      desiredWidth: 900,
      imageBuffer: true,
      imageDataUrl: false,
    });
    const thumbnail = result.pages?.[0]?.data;

    if (!thumbnail || thumbnail.length === 0) {
      return "";
    }

    await fs.mkdir(THUMBNAIL_DIR, { recursive: true });

    const filename = buildThumbnailFilename(link);
    await fs.writeFile(path.join(THUMBNAIL_DIR, filename), Buffer.from(thumbnail));

    return `${normalizeBaseUrl(publicBaseUrl)}/uploads/pdf-thumbnails/${filename}`;
  } catch (error) {
    console.warn("PDF thumbnail rendering failed:", error.message);
    return "";
  } finally {
    await parser.destroy();
  }
}

function needsGeneratedThumbnail(image) {
  return !image || String(image).startsWith("data:image/svg+xml");
}

async function createArticleFromPdf({ buffer, originalname, llmProvider, publicBaseUrl }) {
  const extractedText = await extractPdfText(buffer);

  if (extractedText.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new Error(
      "Could not extract enough article text from this PDF. Scanned image PDFs need OCR before analysis."
    );
  }

  const title = deriveTitleFromText(extractedText, originalname);
  const link = buildUploadLink(extractedText, originalname);
  const existingArticle = await Article.findOne({ link });
  const pdfThumbnail = await renderPdfThumbnail(buffer, link, publicBaseUrl);

  if (existingArticle?.processingStatus === "bias_analyzed") {
    existingArticle.articleOrigin = "pdf_upload";
    existingArticle.isUserUploaded = true;

    if (needsGeneratedThumbnail(existingArticle.image)) {
      existingArticle.image = pdfThumbnail || UPLOADED_ARTICLE_IMAGE;
    }

    await existingArticle.save();
    return existingArticle;
  }

  const { summaryText, summaryPoints, metrics } = existingArticle?.summary
    ? {
        summaryText: existingArticle.summaryText || existingArticle.summary,
        summaryPoints: existingArticle.summaryPoints || [],
        metrics: existingArticle.summaryMetrics || null,
      }
    : await summarizeArticle(extractedText);

  if (!summaryText) {
    throw new Error("PDF text was extracted, but summarization could not produce a usable summary.");
  }

  const article = existingArticle || new Article();

  article.title = article.title || title;
  article.link = link;
  article.source = article.source || "User Upload";
  article.publishedAt = article.publishedAt || new Date();
  article.content = article.content || extractedText;
  article.rawContent = article.rawContent || extractedText;
  article.summary = summaryText;
  article.summaryText = summaryText;
  article.summaryPoints = summaryPoints;
  if (metrics) {
    article.summaryMetrics = metrics;
  }
  article.sourceLean = article.sourceLean || "center";
  article.articleHash = article.articleHash || generateArticleHash(`${article.title}${summaryText}`);
  article.processingStatus = "analyzed";
  article.isUserUploaded = true;
  article.articleOrigin = "pdf_upload";
  article.originalFilename = article.originalFilename || originalname || "";
  article.image = needsGeneratedThumbnail(article.image)
    ? pdfThumbnail || UPLOADED_ARTICLE_IMAGE
    : article.image;

  await article.save();

  const bias = await analyzeSingleArticleBias(article, { llmProvider });
  article.bias = bias;
  article.articleHash = bias.articleHash || article.articleHash;
  article.biasScore = bias.biasScoreFinal ?? bias.biasScore ?? 0;
  article.sentiment = bias.sentiment || "neutral";
  article.sourceLean = bias.sourceLean || "center";
  article.leanDeviation = Number.isFinite(bias.leanDeviation) ? bias.leanDeviation : 0;
  article.processingStatus = "bias_analyzed";

  await article.save();

  return article;
}

module.exports = {
  createArticleFromPdf,
  extractPdfText,
  renderPdfThumbnail,
};
