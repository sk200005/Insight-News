let activeProvider = "groq";

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

function setActiveProvider(provider) {
  if (provider === "gemini" || provider === "groq") {
    activeProvider = provider;
  }
  return getProviderStatus();
}

function getActiveProvider() {
  return activeProvider;
}

module.exports = {
  getProviderStatus,
  setActiveProvider,
  getActiveProvider,
};
