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

const SOURCE_NAME_TO_GROUP = Object.entries(rssFeeds).reduce(
  (mapping, [group, feeds]) => {
    for (const feed of feeds) {
      mapping[feed.name.toLowerCase()] = group;
    }

    return mapping;
  },
  {}
);

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

function countKeywordMatches(text, keywords) {
  return keywords.reduce(
    (count, keyword) => count + (text.includes(keyword) ? 1 : 0),
    0
  );
}

function isWarContent(text) {
  const warPrimaryMatches = countKeywordMatches(text, WAR_PRIMARY_KEYWORDS);
  const warContextMatches = countKeywordMatches(text, WAR_CONTEXT_KEYWORDS);
  const warSecondaryMatches = countKeywordMatches(text, WAR_SECONDARY_KEYWORDS);

  return warPrimaryMatches >= 1 || warContextMatches >= 2 || warSecondaryMatches >= 2;
}

function isStockContent(text) {
  return STOCK_KEYWORDS.some((keyword) => text.includes(keyword));
}

function inferSourceGroup(source = "", existingSourceGroup = "") {
  const normalizedExistingSourceGroup = normalizeSourceGroup(existingSourceGroup);

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
    category:
      classified.category !== "general" ? classified.category : normalizedCategory,
    subCategory: subCategory || "",
    sourceGroup: resolvedSourceGroup,
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
