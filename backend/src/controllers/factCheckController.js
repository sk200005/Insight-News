// ==========================================
// FACT CHECK CONTROLLER OVERVIEW:
// ==========================================
// This controller does NOT use an internal service file; instead, it directly integrates with:
// 1. Google Fact Check Tools API (via axios): searches public fact-checks by verified publishers.
// 2. Web scraper (via cheerio): extracts thumbnail preview images from fact-check source URLs.
// ==========================================

const axios = require("axios");
const cheerio = require("cheerio");

const FACTCHECK_API_URL =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const DEFAULT_PAGE_SIZE = 20;

/**
 * Helper: getApiKey
 * What it does:
 * - Reads the Google Fact Check API Key from environment variables (.env).
 * - Throws a descriptive error if the key has not been configured.
 */
function getApiKey() {
  const key = process.env.GOOGLE_FACTCHECK_API_KEY;

  if (!key) {
    throw new Error("GOOGLE_FACTCHECK_API_KEY is not configured");
  }

  return key;
}

/**
 * Helper: extractImage
 * What it does:
 * - Google's Fact Check API doesn't provide thumbnail images directly.
 * - This function extracts the publisher's website domain and generates a high-res favicon URL
 *   via Google's Favicon service as a fallback visual logo.
 */
function extractImage(review) {
  const site = review?.publisher?.site || "";

  if (!site) {
    return "";
  }

  try {
    const hostname = new URL(
      site.startsWith("http") ? site : `https://${site}`
    ).hostname;

    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return "";
  }
}

/**
 * Helper: mapClaim
 * What it does:
 * - Takes raw claim data returned by the Google API and formats it into a clean, predictable
 *   structure that the frontend UI can easily display (claim text, claimant, rating, publisher, URL).
 */
function mapClaim(claim, index) {
  const review =
    Array.isArray(claim.claimReview) && claim.claimReview.length > 0
      ? claim.claimReview[0]
      : {};

  return {
    id: `fc-${index}-${Date.now()}`,
    claim: claim.text || "",
    claimant: claim.claimant || "Unknown",
    claimDate: claim.claimDate || "",
    title: review.title || claim.text || "",
    publisher: review.publisher?.name || "Unknown Publisher",
    publisherUrl: review.publisher?.site || "",
    rating: review.textualRating || "No Rating",
    reviewDate: review.reviewDate || "",
    url: review.url || "",
    image: extractImage(review),
  };
}

/**
 * Controller: searchFactChecks
 * What it does:
 * 1. Reads the search 'query', 'pageSize', 'languageCode', and 'pageToken' from query params.
 * 2. Checks that 'query' is not empty (returns 400 Bad Request if missing).
 * 3. Sends a GET request to Google's Fact Check Tools API with the configured API key.
 * 4. Transforms each claim found using mapClaim().
 * 5. Returns a list of structured fact-checks along with pagination tokens.
 */
const searchFactChecks = async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Query parameter is required",
      });
    }

    const pageSize = Math.min(
      Math.max(Number(req.query.pageSize) || DEFAULT_PAGE_SIZE, 1),
      50
    );

    const params = {
      key: getApiKey(),
      query,
      pageSize,
      languageCode: req.query.languageCode || "en",
    };

    if (req.query.pageToken) {
      params.pageToken = req.query.pageToken;
    }

    const response = await axios.get(FACTCHECK_API_URL, {
      params,
      timeout: 15000,
    });

    const claims = response.data?.claims || [];
    const results = claims.map(mapClaim);

    res.json({
      success: true,
      results,
      totalResults: results.length,
      nextPageToken: response.data?.nextPageToken || null,
    });
  } catch (error) {
    if (error.message === "GOOGLE_FACTCHECK_API_KEY is not configured") {
      return res.status(500).json({
        success: false,
        error: "Fact check service is not configured",
      });
    }

    const status = error.response?.status || 500;
    const detail =
      error.response?.data?.error?.message || error.message || "Unknown error";

    console.error("Fact check API error:", detail);

    res.status(status).json({
      success: false,
      error: `Fact check search failed: ${detail}`,
    });
  }
};

/**
 * Controller: fetchArticleImage
 * What it does:
 * 1. Takes an external article URL from req.query.url.
 * 2. Fetches the article's web page HTML using axios with a browser User-Agent.
 * 3. Uses Cheerio to scrape the meta tag <meta property="og:image"> or <meta name="twitter:image">.
 * 4. Resolves relative URLs to absolute URLs and returns the image URL for article card previews.
 */
const fetchArticleImage = async (req, res) => {
  try {
    const targetUrl = req.query.url;

    if (!targetUrl || !targetUrl.startsWith("http")) {
      return res.status(400).json({ success: false, error: "Valid URL is required" });
    }

    const response = await axios.get(targetUrl, {
      timeout: 4000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const $ = cheerio.load(response.data);
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');

    if (ogImage) {
      // Handle relative URLs
      const absoluteImageUrl = new URL(ogImage, targetUrl).href;
      return res.json({ success: true, imageUrl: absoluteImageUrl });
    }

    return res.json({ success: false, error: "No image found" });
  } catch (error) {
    return res.status(500).json({ success: false, error: "Failed to fetch image" });
  }
};

module.exports = { searchFactChecks, fetchArticleImage };
