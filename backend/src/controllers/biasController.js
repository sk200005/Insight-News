// ==========================================
// IMPORTED SERVICE FUNCTIONS & THEIR WORKING:
// ==========================================
// 1. runBiasAnalysisBatch(provider, articleIds):
//    - Found in: ../services/biasAnalysisService
//    - How it works: Takes a list of article IDs (or picks pending ones), sends their content
//      to an AI model to detect political lean (left/right/center), sentiment, and bias score (0 to 1),
//      then updates the articles in MongoDB and sets their status to "bias_analyzed".
//
// 2. getProviderStatus():
//    - Found in: ../services/llmProviderService
//    - How it works: Checks which AI service is currently active (like Gemini, OpenAI, Ollama)
//      and verifies if API keys are configured and available.
//
// 3. setActiveProvider(provider):
//    - Found in: ../services/llmProviderService
//    - How it works: Switches the active AI service to the one chosen by the user/admin.
// ==========================================

const { runBiasAnalysisBatch } = require("../services/biasAnalysisService");
const { getProviderStatus, setActiveProvider } = require("../services/llmProviderService");

/**
 * Controller: runBiasAnalysis
 * What it does:
 * - Reads optional article IDs sent from the frontend request body.
 * - Calls runBiasAnalysisBatch() to run AI bias detection on those articles.
 * - Returns the analysis results (success count, details, errors) as a JSON response.
 */
async function runBiasAnalysis(req, res) {
  try {
    const articleIds = Array.isArray(req.body?.articleIds) ? req.body.articleIds : [];
    const result = await runBiasAnalysisBatch(undefined, articleIds);
    res.json(result);
  } catch (error) {
    console.error("Bias Controller Error:", error);
    res.status(500).json({ success: false, error: "Server error during bias analysis" });
  }
}

/**
 * Controller: getProvider
 * What it does:
 * - Fetches the current AI provider settings (e.g., whether we are using Gemini or OpenAI).
 * - Sends this status back to the frontend so users know which AI is currently running.
 */
async function getProvider(req, res) {
  res.json(getProviderStatus());
}

/**
 * Controller: setProvider
 * What it does:
 * - Receives a new AI provider name (like "gemini" or "openai") from the request body.
 * - Validates that a provider was actually provided.
 * - Calls setActiveProvider() to change the system's active AI provider and returns the updated status.
 */
async function setProvider(req, res) {
  const { provider } = req.body;
  if (!provider) {
    return res.status(400).json({ error: "Provider is required" });
  }
  const status = setActiveProvider(provider);
  res.json(status);
}

module.exports = { runBiasAnalysis, getProvider, setProvider };
