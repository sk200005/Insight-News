/**
 * The currently active LLM provider. Defaults to "groq".
 * @type {string}
 */
let activeProvider = "groq";

/**
 * Retrieves the current status of all LLM providers.
 * Checks which providers have their corresponding API keys set in the environment variables.
 * 
 * @returns {Object} An object containing the active provider, a map of configured providers, and a list of supported providers.
 */
function getProviderStatus() {
  const configuredProviders = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
  };

  return {
    activeProvider,
    configuredProviders,
    supportedProviders: ["gemini", "groq"],
  };
}

/**
 * Sets the active LLM provider if the provided value is a supported provider.
 * 
 * @param {string} provider - The name of the provider to set as active (e.g., "gemini" or "groq").
 * @returns {Object} The updated provider status.
 */
function setActiveProvider(provider) {
  if (provider === "gemini" || provider === "groq") {
    activeProvider = provider;
  }
  return getProviderStatus();
}

/**
 * Gets the name of the currently active LLM provider.
 * 
 * @returns {string} The active provider's name.
 */
function getActiveProvider() {
  return activeProvider;
}

module.exports = {
  getProviderStatus,
  setActiveProvider,
  getActiveProvider,
};
