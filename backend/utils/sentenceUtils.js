// splitIntoSentences() → breaks text into individual sentences.
// buildSummaryInput() → takes as many complete sentences as possible without exceeding a character limit.

function splitIntoSentences(text) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  // \s+  -> one or more whitespace characters
  // g     -> all occurrences.
  // .trim() -> removes whitespace from both ends of a string.

  if (!normalized) {
    return [];
  }
  // Intl.Segmenter -> built-in JavaScript API for splitting text into meaningful segments.
  const segmenter = new Intl.Segmenter("en", {
    granularity: "sentence",   // Split the text based on sentence boundaries.
  });
  // segmenter.segment(text) -> Produces sentence segments. { segment: "India is a country."}
  return Array.from(segmenter.segment(normalized), (segment) => segment.segment.trim())
    .filter(Boolean);
}

function buildSummaryInput(text, limit = 1800) {
  const sentences = splitIntoSentences(text);
  let result = "";

  //      [
  //      "India is a country.",
  //      "Delhi is its capital.",
  //      "Mumbai is a major financial center."
  //      ]

  for (const sentence of sentences) {
    const nextChunk = result ? `${result} ${sentence}` : sentence;

    if (nextChunk.length > limit) {
      break;
    }

    result = nextChunk;
  }

  if (result) {
    return result.trim();
  }

  return String(text || "").slice(0, limit).trim();
}

module.exports = {
  buildSummaryInput,
  splitIntoSentences,
};
