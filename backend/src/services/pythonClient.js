const axios = require("axios"); //Axios is used to make HTTP requests (GET, POST, etc.)

const PYTHON_BIAS_URL =
  process.env.PYTHON_BIAS_URL || "http://127.0.0.1:9000/analyze-bias";

const PYTHON_BIAS_TIMEOUT_MS = Number(process.env.PYTHON_BIAS_TIMEOUT_MS || 1500);

async function analyzeLocalBiasSignals(text) {
  try {
    const response = await axios.post(
      PYTHON_BIAS_URL,
      { text },
      { timeout: PYTHON_BIAS_TIMEOUT_MS }
    );

    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error(
        `Local bias analysis timed out after ${PYTHON_BIAS_TIMEOUT_MS}ms`
      );
    }

    if (error.code === "ECONNREFUSED") {                             //Python server is not running
      throw new Error("Local bias analysis service is unavailable");
    }

    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (status) {
      throw new Error(
        `Local bias analysis failed with ${status}${detail ? `: ${detail}` : ""}`
      );
    }

    throw new Error(`Local bias analysis failed: ${error.message}`);
  }
}

module.exports = { analyzeLocalBiasSignals };
