// It receives the scraped article text and returns cleaned text.

const headerNoise = [
  "First Day First Show",
  "News and reviews from the world of cinema and streaming",
  "The View From India",
  "Looking at World Affairs from the Indian perspective",
];

const marketingNoise = [
  "Get our breaking news email",
  "free app or daily news podcast",
  "subscribe to our telegram",
  "sign up for our newsletter",
  "weekly top picks",
  "stock reports plus",
  "share market alerts",
  "ETMarkets",
];

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeNoise(text) {
  if (!text) {
    return "";
  }

  let cleaned = String(text);

  headerNoise.forEach((phrase) => {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(phrase), "gi"), "");
  });

  marketingNoise.forEach((phrase) => {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(phrase), "gi"), "");
  });

  cleaned = cleaned
    .replace(
      /Updated\s*-\s*\w+\s+\d{1,2},\s+\d{4}(?:\s+\d{1,2}:\d{2}\s*(?:am|pm)\s*IST)?/gi,
      ""
    )
    .replace(/\b\d{1,2}:\d{2}\s*(am|pm)\s*IST\b/gi, "")
    .replace(/e-?Paper/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

module.exports = {
  removeNoise,
};
