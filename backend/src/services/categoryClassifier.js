//This code is basically a news article categorization system. 
// It looks at the article's source + text + existing category and
// decides its final category, subCategory, and sourceGroup.


const { rssFeeds } = require("../config/rssFeeds");

const FEED_GROUP_CATEGORY_MAP = {
  indianPolitics: {
    category: "politics",
    subCategory: "Indian Politics",
  },
  indianEconomy: {
    category: "economy",
    subCategory: "Indian economy",
  },
  indianSports: {
    category: "sports",
    subCategory: "Indian sports",
  },
  worldPolitics: {
    category: "politics",
    subCategory: "World Politics",
  },
  worldEconomy: {
    category: "economy",
    subCategory: "World economy",
  },
  worldSports: {
    category: "sports",
    subCategory: "World sports",
  },
};

const WAR_PRIMARY_KEYWORDS = [
  "missile",
  "airstrike",
  "ceasefire",
  "battle",
  "invasion",
  "shelling",
  "drone strike",
  "artillery",
  "frontline",
  "bombing",
  "fighter jet",
  "rocket attack",
];

const WAR_CONTEXT_KEYWORDS = [
  "war",
  "troops",
  "military",
  "defense",
  "offensive",
  "armed forces",
  "border clash",
  "missile",
  "airstrike",
  "drone",
  "artillery",
  "frontline",
  "ceasefire",
  "gaza",
  "ukraine",
  "russia",
  "israel",
  "hamas",
  "iran",
  "syria",
  "Hormuz"
];

const WAR_SECONDARY_KEYWORDS = [
  "military",
  "defense",
  "conflict",
  "border clash",
  "rebel",
  "armed forces",
  "offensive",
  "hostilities",
];

const STOCK_KEYWORDS = [
  "stock",
  "stocks",
  "share price",
  "shares",
  "sensex",
  "nifty",
  "nasdaq",
  "dow jones",
  "s&p 500",
  "earnings",
  "bull market",
  "bear market",
  "ipo",
  "equity",
  "wall street",
];

const GENERAL_CATEGORY_KEYWORDS = {
  politics: [
    "election",
    "government",
    "policy",
    "minister",
    "parliament",
    "senate",
    "congress",
    "president",
    "political",
    "vote",
  ],
  sports: [
    "football",
    "cricket",
    "olympics",
    "soccer",
    "tennis",
    "match",
    "tournament",
    "league",
    "athlete",
    "coach",
  ],
  economy: [
    "market",
    "business",
    "economy",
    "trade",
    "company",
    "finance",
    "bank",
    "investment",
    "revenue",
  ],
  technology: [
    "ai",
    "software",
    "startup",
    "chip",
    "technology",
    "tech",
    "robot",
    "cloud",
    "app",
    "cyber",
  ],
  world: [
    "global",
    "international",
    "world",
    "diplomacy",
    "united nations",
    "summit",
    "border",
    "foreign",
  ],
  entertainment: [
    "movie",
    "music",
    "actor",
    "film",
    "show",
    "celebrity",
    "streaming",
    "series",
    "festival",
    "entertainment",
  ],
  health: [
    "health",
    "hospital",
    "doctor",
    "medical",
    "vaccine",
    "disease",
    "wellness",
    "fitness",
    "virus",
    "mental health",
  ],
};
// motive is to convert the legacy category to the new category

//reason: earlier there was no politics and stocks category
//but we need to add the politics and stocks category
//so we added the politics and stocks category from the rssFeeds.js
//but earlier the frontend was using the legacy category
//when we introduced the new category from the rssFeeds.js, the frontend was not able to display the articles
//so to make it backward compatible, we are using this map to convert the legacy category to the new category


const LEGACY_CATEGORY_MAP = {
  indianpolitics: "politics",
  worldpolitics: "politics",
  politics: "politics",
  indiansports: "sports",
  worldsports: "sports",
  sports: "sports",
  indianeconomy: "economy",
  worldeconomy: "economy",
  economy: "economy",
  business: "economy",
  stock: "stocks",
  stocks: "stocks",
  sharemarket: "stocks",
  stockmarket: "stocks",
  equities: "stocks",
  technology: "technology",
  tech: "technology",
  world: "world",
  international: "world",
  war: "war",
  entertainment: "entertainment",
  health: "health",
  general: "general",
};

const LEGACY_SOURCE_GROUP_MAP = {
  indianpolitics: "indianPolitics",
  indianeconomy: "indianEconomy",
  indiansports: "indianSports",
  worldpolitics: "worldPolitics",
  worldeconomy: "worldEconomy",
  worldsports: "worldSports",
};

const SOURCE_NAME_ALIASES = {
  "bbc news": "worldPolitics",
};

/**
 * Motive: Builds a fast lookup dictionary (map) to instantly find a news source's group based on its lowercase name.
 * Input: `rssFeeds` object from the configuration file (organized by group).
 * Output: `SOURCE_NAME_TO_GROUP` object mapping lowercase source names to their respective group.
 */
const SOURCE_NAME_TO_GROUP = {};

for (const [group, feeds] of Object.entries(rssFeeds)) {
  for (const feed of feeds) {
    SOURCE_NAME_TO_GROUP[feed.name.toLowerCase()] = group;
  }
}

/**
 * Normalizes a legacy or arbitrary category string into a standard category format.
 * @param {string} category - The raw category string.
 * @returns {string} The normalized category string (e.g., 'politics', 'sports') or 'general' if not matched.
 */
function normalizeCategory(category = "") {
  if (!category) {
    return "general";
  }

  const normalizedKey = category
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return LEGACY_CATEGORY_MAP[normalizedKey] || "general";
}

/**
 * Normalizes a legacy or arbitrary source group string into a standard source group format.
 * @param {string} sourceGroup - The raw source group string.
 * @returns {string} The normalized source group string (e.g., 'indianPolitics') or the original if not matched.
 */
function normalizeSourceGroup(sourceGroup = "") {
  if (!sourceGroup) {
    return "";
  }

  const normalizedKey = sourceGroup
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "");

  return LEGACY_SOURCE_GROUP_MAP[normalizedKey] || sourceGroup;
}

/**
 * Counts the number of times any keyword from the list appears in the text.
 * @param {string} text - The text to search within.
 * @param {Array<string>} keywords - The list of keywords to search for.
 * @returns {number} The total count of matched keywords.
 */
function countKeywordMatches(text, keywords) {
  return keywords.reduce(
    (count, keyword) => count + (text.includes(keyword) ? 1 : 0),
    0
  );
}

/**
 * Determines if the text content relates to war based on keyword matches.
 * @param {string} text - The text content to analyze.
 * @returns {boolean} True if the content is classified as war-related, false otherwise.
 */
function isWarContent(text) {
  const warPrimaryMatches = countKeywordMatches(text, WAR_PRIMARY_KEYWORDS);
  const warContextMatches = countKeywordMatches(text, WAR_CONTEXT_KEYWORDS);
  const warSecondaryMatches = countKeywordMatches(text, WAR_SECONDARY_KEYWORDS);

  return warPrimaryMatches >= 1 || warContextMatches >= 2 || warSecondaryMatches >= 2;
}

/**
 * Determines if the text content relates to stocks based on keyword matches.
 * @param {string} text - The text content to analyze.
 * @returns {boolean} True if the content is classified as stock-related, false otherwise.
 */
function isStockContent(text) {
  return STOCK_KEYWORDS.some((keyword) => text.includes(keyword));
}

/**
 * Figure out the source group from the source name or an existing source group.
 * @param {string} source - The source parameter is expected to contain a string.
 * @param {string} existingSourceGroup - An optionally existing source group.
 * @returns {string} The inferred source group or an empty string if it cannot be determined.
 */
function inferSourceGroup(source = "", existingSourceGroup = "") {
  const normalizedExistingSourceGroup = normalizeSourceGroup(existingSourceGroup);    // IndianEconomy -> indianEconomy 

  if (normalizedExistingSourceGroup && FEED_GROUP_CATEGORY_MAP[normalizedExistingSourceGroup]) {
    return normalizedExistingSourceGroup;
  }

  const normalizedSource = source.toLowerCase();

  return (
    SOURCE_NAME_TO_GROUP[normalizedSource] ||
    SOURCE_NAME_ALIASES[normalizedSource] ||
    ""
  );
}

/**
 * Classifies text into a category when the source group is unknown.
 * @param {string} text - The text content to classify.
 * @returns {Object} An object containing the inferred `category` and `subCategory`.
 */
function classifyWithoutSourceGroup(text) {
  if (isWarContent(text)) {
    return { category: "war", subCategory: "" };
  }

  if (isStockContent(text)) {
    return { category: "stocks", subCategory: "" };
  }

  for (const [category, keywords] of Object.entries(GENERAL_CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return { category, subCategory: "" };
    }
  }

  return { category: "general", subCategory: "" };
}

/**
 * Determines the final category, subcategory, and source group for an article.
 * Combines source-based grouping, keyword matching, and legacy normalization.
 * @param {Object} articleData - The data of the article to categorize.
 * @param {string} articleData.title - The title of the article.
 * @param {string} articleData.summary - The summary of the article.
 * @param {string} articleData.rawContent - The raw content of the article.
 * @param {string} articleData.source - The source name of the article.
 * @param {string} articleData.sourceGroup - The source group of the article.
 * @param {string} articleData.category - The original category of the article.
 * @param {string} articleData.subCategory - The original subcategory of the article.
 * @returns {Object} An object containing the finalized `category`, `subCategory`, and `sourceGroup`.
 */
function categorizeArticle({
  title = "",
  summary = "",
  rawContent = "",
  source = "",
  sourceGroup = "",
  category = "",
  subCategory = "",
}) {
  const text = `${title} ${summary} ${rawContent}`.toLowerCase();
  const resolvedSourceGroup = inferSourceGroup(source, sourceGroup);

  if (resolvedSourceGroup && FEED_GROUP_CATEGORY_MAP[resolvedSourceGroup]) {
    const mapped = FEED_GROUP_CATEGORY_MAP[resolvedSourceGroup];
    let resolvedCategory = mapped.category;

    if (
      (resolvedSourceGroup === "indianPolitics" ||
        resolvedSourceGroup === "worldPolitics") &&
      isWarContent(text)
    ) {
      resolvedCategory = "war";
    }

    if (
      (resolvedSourceGroup === "indianEconomy" ||
        resolvedSourceGroup === "worldEconomy") &&
      isStockContent(text)
    ) {
      resolvedCategory = "stocks";
    }

    return {
      category: resolvedCategory,
      subCategory: mapped.subCategory,
      sourceGroup: resolvedSourceGroup,
    };
  }

  const classified = classifyWithoutSourceGroup(text);
  const normalizedCategory = normalizeCategory(category);

  return {
    category:                           // "stocks",..... sports, general, war
      classified.category !== "general" ? classified.category : normalizedCategory,
    subCategory: subCategory || "",     //  "World Politics","Indian Politics", "World economy", "Indian Economy"
    sourceGroup: resolvedSourceGroup,   //  "worldPolitics" ..... "indianPolitics", "worldSports", "indianEconomy"
  };
}

module.exports = {
  categorizeArticle,
  inferSourceGroup,
  isStockContent,
  isWarContent,
  normalizeCategory,
  normalizeSourceGroup,
};



//                     categorizeArticle({
//                       title: "Sensex crashes by 1000 points today",
//                       summary: "A massive sell-off in shares led to a bear market.",
//                       source: "BBC News",
//                       category: "business"
//                     }); 
                         
//                     {
//                       category: "stocks",..... sports, general, war
//                       subCategory: "World Politics",.... "Indian Politics", "World economy", "Indian Economy"
//                       sourceGroup: "worldPolitics" ..... "indianPolitics", "worldSports", "indianEconomy"
//                     }