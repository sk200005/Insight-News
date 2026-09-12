const mongoose = require("mongoose");
const {
  categorizeArticle,
} = require("../services/categoryClassifier");

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  link: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    type: String,
    required: true
  },
  publishedAt: {
    type: Date
  },

  content: {
    type: String,
    default: ""
  },
  rawContent: {
    type: String,
    default: ""
  },
  summary: {
    type: String,
    default: ""
  },
  summaryText: {
    type: String,
    default: ""
  },
  summaryPoints: {
    type: [String],
    default: []
  },
  category: {
    type: String,
    default: "general"
  },
  subCategory: {
    type: String,
    default: ""
  },
  sourceGroup: {
    type: String,
    default: ""
  },
  sourceLean: {
    type: String,
    default: "center"
  },
  leanDeviation: {
    type: Number,
    default: 0
  },
  articleHash: {
    type: String,
    default: ""
  },
  eventClusterId: {
    type: String,
    default: ""
  },
  biasScore: {
    type: Number,
    default: 0
  },
  sentiment: {
    type: String,
    default: "neutral"
  },
  image: {
    type: String,
    default: ""
  },
  isUserUploaded: {
    type: Boolean,
    default: false
  },
  articleOrigin: {
    type: String,
    enum: ["rss", "pdf_upload"],
    default: "rss",
    index: true
  },
  originalFilename: {
    type: String,
    default: ""
  },

  processingStatus: {
  type: String,
  enum: ["pending", "scraped", "analyzed", "bias_analyzed", "failed"]
  },
  
  bias: {
    politicalLean: String,
    sentiment: String,
    biasScore: Number,
    biasScoreFinal: Number,
    perspectiveBalanceScore: Number,
    framingInsight: String,
    framingType: String,
    missingPerspective: String,
    loadedLanguageCount: Number,
    topic: String,
    confidence: Number,
    sourceLean: String,
    leanDeviation: Number,
    emotionalTone: String,
    explanation: String,
    loadedWords: [String],
    emotionalLanguage: [String],
    opposingViewsPresent: Boolean
  }


}, { timestamps: true });

// pre() registers a middleware/hook that runs before "save" operation.
// and function setDerivedArticleFields() is the function will run after "save" ops


articleSchema.pre("save", function setDerivedArticleFields() {
  if (!this.summaryText && this.summary) {
    this.summaryText = this.summary;
  }

  if (!this.summary && this.summaryText) {
    this.summary = this.summaryText;
  }

  if (!Array.isArray(this.summaryPoints)) {
    this.summaryPoints = [];
  }

  const summaryOrContent = this.summaryText || this.summary || this.content || "";
  const categorized = categorizeArticle({
    title: this.title,
    summary: summaryOrContent,
    rawContent: this.rawContent || "",
    source: this.source,
    sourceGroup: this.sourceGroup,
    category: this.category,
    subCategory: this.subCategory,
  });

  this.category = categorized.category;
  this.subCategory = categorized.subCategory;
  this.sourceGroup = categorized.sourceGroup;

  if (this.bias?.biasScoreFinal !== undefined && this.bias?.biasScoreFinal !== null) {
    this.biasScore = this.bias.biasScoreFinal;
  } else if (this.bias?.biasScore !== undefined && this.bias?.biasScore !== null) {
    this.biasScore = this.bias.biasScore;
  }

  if (this.bias?.sentiment) {
    this.sentiment = this.bias.sentiment;
  }

  if (!this.sourceLean) {
    this.sourceLean = "center";
  }

  if (this.bias?.sourceLean) {
    this.sourceLean = this.bias.sourceLean;
  }

  if (this.bias?.leanDeviation !== undefined && this.bias?.leanDeviation !== null) {
    this.leanDeviation = this.bias.leanDeviation;
  } else if (this.leanDeviation === undefined || this.leanDeviation === null) {
    this.leanDeviation = 0;
  }
});

module.exports = mongoose.model("Article", articleSchema);
