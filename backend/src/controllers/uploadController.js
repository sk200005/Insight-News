// ==========================================
// IMPORTED SERVICE FUNCTION & ITS WORKING:
// ==========================================
// createArticleFromPdf({ buffer, originalname, llmProvider, publicBaseUrl }):
// - Found in: ../services/pdfArticleService
// - How it works:
//   1. Extracts readable text from the uploaded PDF binary buffer using pdf-parse.
//   2. Cleans the text and extracts or generates title, author, category, and date.
//   3. Runs AI summarization (summary & key bullet points) and bias analysis on the PDF text.
//   4. Saves the completed article in MongoDB marked with articleOrigin: "pdf_upload".
// ==========================================

const { createArticleFromPdf } = require("../services/pdfArticleService");

/**
 * Helper: getPublicBaseUrl
 * What it does:
 * - Determines the public URL of the backend (e.g., http://localhost:5000 or production URL)
 * - Used to create public links for any uploaded assets/files.
 */
function getPublicBaseUrl(req) {
  return process.env.PUBLIC_BACKEND_URL || `${req.protocol}://${req.get("host")}`;
}

/**
 * Controller: uploadPdfArticle
 * What it does:
 * 1. Checks if a file was uploaded in the request (via multer). If not, returns 400 Bad Request.
 * 2. Hands the PDF buffer and metadata to createArticleFromPdf() for parsing, AI analysis, and saving.
 * 3. Returns the newly created article document with status 201 (Created).
 */
async function uploadPdfArticle(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file.",
      });
    }

    const article = await createArticleFromPdf({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      llmProvider: req.body?.llmProvider,
      publicBaseUrl: getPublicBaseUrl(req),
    });

    res.status(201).json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("PDF article upload failed:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Could not process the uploaded PDF.",
    });
  }
}

module.exports = {
  uploadPdfArticle,
};
