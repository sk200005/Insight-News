// This utility maps media source names to political bias categories (left/center/right) 
// and assigns numerical 'lean' scores for mathematical calculations.

const sourceBiasMap = {
  "The Hindu": "center-left",
  "The Hindu Business": "center-left",
  "The Hindu Sport": "center-left",
  "ThePrint": "center-right",
  "OpIndia": "right",
  "Scroll": "left",
  "Economic Times": "center-right",
  "NDTV Sports": "center-left",
  "ESPN Cricinfo": "center",
  "BBC World": "center",
  "BBC Business": "center",
  "BBC Sport": "center",
  "Guardian World": "left",
  "Reuters Sports": "center",
};


const leanScore = {
  left: -2,
  "center-left": -1,
  center: 0,
  "center-right": 1,
  right: 2,
};

function getSourceLean(sourceName) {
  if (!sourceName) {
    return "center";
  }

  return sourceBiasMap[sourceName] || "center";
}

function calculateLeanDeviation(articleLean, sourceLean) {
  if (!articleLean || !sourceLean) {
    return 0;
  }

  const articleScore = leanScore[articleLean] ?? 0;
  const sourceScore = leanScore[sourceLean] ?? 0;

  return Math.abs(articleScore - sourceScore);
}

module.exports = {
  getSourceLean,
  calculateLeanDeviation,
};
