const axios = require("axios");
const cheerio = require("cheerio");

const FACTCHECK_API_URL =
  "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const DEFAULT_PAGE_SIZE = 20;

function getApiKey() {
  const key = process.env.GOOGLE_FACTCHECK_API_KEY;

  if (!key) {
    throw new Error("GOOGLE_FACTCHECK_API_KEY is not configured");
  }

  return key;
}

function extractImage(review) {
  // Google Fact Check API doesn't return images directly.
  // Use the publisher's favicon as a fallback visual.
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
