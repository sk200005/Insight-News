// ==========================================
// ARTICLE CONTROLLER OVERVIEW:
// ==========================================
// This controller directly queries and aggregates data from the MongoDB "Article" model.
// It handles:
// 1. Fetching news feeds with optional category and limit filters.
// 2. Fetching scraped/in-progress articles.
// 3. Calculating category-level and system-wide bias analytics using MongoDB Aggregation Pipelines.
// 4. Recommending related articles based on category and sentiment.
// ==========================================

const Article = require("../models/Article");

/**
 * Helper: getAnalyticsBiasExpression
 * Motive: Resolves the standardized bias score across varying article schema versions
 * (prioritizes bias.biasScoreFinal -> bias.biasScore -> root biasScore).
 */
function getAnalyticsBiasExpression() {
  return {
    $ifNull: [                   //$ifNull: [value, fallback]
      "$bias.biasScoreFinal",
      {
        $ifNull: [
          "$bias.biasScore",
          "$biasScore",
        ],
      },
    ],
  };
}

/**
 * Controller: getAllArticles
 * Motive: Retrieves all articles from the database with optional category filtering,
 * sorted descending by creation and publication date.
 */
const getAllArticles = async (req, res) => {
  try {
    const category =
      req.query.category && req.query.category !== "all"
        ? req.query.category
        : undefined;

    const query = category ? { category } : {};

    const articles = await Article.find(query)       // find all articles with category (if specified), 
      .sort({ createdAt: -1, publishedAt: -1 });     // sort by createdAt and then by publishedAt in descending order

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: getScrapedArticles
 * Motive: Fetches articles that have at least completed web scraping or analysis
 * (processingStatus: 'scraped', 'analyzed', or 'bias_analyzed') with optional category filter.
 */
const getScrapedArticles = async (req, res) => {
  try {
    const category =
      req.query.category && req.query.category !== "all"
        ? req.query.category
        : undefined;

    const query = {
      processingStatus: { $in: ["scraped", "analyzed", "bias_analyzed"] },
    };

    if (category) {
      query.category = category;
    }

    const articles = await Article.find(query).sort({ createdAt: -1, publishedAt: -1 });

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: getNewsArticles
 * Motive: Retrieves ready-to-display news articles (either NLP & bias analyzed or verified PDF uploads),
 * with optional category filtering and result limits for feed/homepage display.
 */

// This function is an Express controller that fetches 
// news articles from MongoDB and sends them as JSON.
const getNewsArticles = async (req, res) => {
  try {      // For eg. news?category=sports&limit=10
    const category =
      req.query.category && req.query.category !== "all"
        ? req.query.category
        : undefined;
    // Limits the number of articles to be fetched to 10 ? means if the limit is not provided then it will fetch 10 articles
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    //Checks whether the article has been processed (analyzed and bias analyzed) or 
    // not or if the article is from pdf upload and has summary and bias
    const query = {     
      // filter/condition object that tells MongoDB which documents to find.
      $or: [
        { processingStatus: { $in: ["analyzed", "bias_analyzed"] } },
        {
          articleOrigin: "pdf_upload",
          summary: { $exists: true, $ne: "" }, // checks if the summary exists and is not empty
          bias: { $exists: true, $ne: null },  // checks if the bias exists and is not null
        },
      ],
    };

    if (category) {
      query.category = category;    
      //query is a JavaScript object, you can 
      // add a new property to it even though it was declared with const.
      //So query.category simply means:
      // Access or create the category property inside the query object.
    }

    let articleQuery = Article.find(query).sort({ createdAt: -1, publishedAt: -1 }); //newest first

    if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
      articleQuery = articleQuery.limit(requestedLimit);
    }

    const articles = await articleQuery;  // "await" causes Mongoose to execute the query against MongoDB.

    res.status(200).json(articles);  //returns the articles as JSON
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

  //Article.find(query) creates a Mongoose Query object, which is not executed immediately. 
  // When we use await, the query is executed against MongoDB, and the variable receives the resulting documents. 
  // So await Article.find(query).sort(...) directly gives us the matching articles as an array.
};

/**
 * Controller: getCategoryBiasAnalytics
 * Motive: Aggregates average bias scores and article volumes grouped by category
 * for all bias-analyzed articles to power comparative charts.
 */
const getCategoryBiasAnalytics = async (req, res) => {
  try {
    const analytics = await Article.aggregate([
      {
        $match: {
          processingStatus: "bias_analyzed",
        },
      },
      {
        $addFields: {
          analyticsBiasScore: {
            $cond: [
              { $ne: ["$bias.biasScore", null] },
              "$bias.biasScore",       //$ before a field name means "take the value from this document's field."
              "$biasScore",
            ],
          },
          // IF bias.biasScore is NOT null 
          //    → use bias.biasScore
          // ELSE → use biasScore
        },
      },
      {
        $match: {
          analyticsBiasScore: {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: "$category",
          avgBias: { $avg: "$analyticsBiasScore" },
          totalArticles: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          avgBias: { $round: ["$avgBias", 3] },
          totalArticles: 1,
        },
      },
      {
        $sort: {
          totalArticles: -1,
          category: 1,
        },
      },
    ]);

    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: getBiasSummaryAnalytics
 * Motive: Powers the analytics dashboard by concurrently aggregating 7 distinct metrics:
 * category averages, overall bias stats, most biased article, top neutral sources,
 * 7-day bias trends, source publication volume, and political lean distribution.
 */
const getBiasSummaryAnalytics = async (req, res) => {
  try {
    const matchStage = {
      processingStatus: "bias_analyzed",  /// only articles that are bias_analyzed
    };
    const analyticsBiasScore = getAnalyticsBiasExpression();

    // Here we are using Promise.all to fetch all the 7 metrics concurrently/parallelly
    // Because we are making 7 different requests to the database and if we do it sequentially then it will take more time
    // If we do it concurrently then it will take less time
    const [
      categories,
      overallStats,
      mostBiasedArticle,
      sourceNeutrality,
      biasTrend,
      sourceContribution,
      politicalLeanDistribution,
    ] = await Promise.all([
      Article.aggregate([          //calculates bias statistics for each category.
        { $match: matchStage },
        {
          $addFields: {
            analyticsBiasScore,
          },
        },
        {
          $match: {
            analyticsBiasScore: { $ne: null },
            category: { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$category",
            avgBias: { $avg: "$analyticsBiasScore" },      // Calculates the average bias for each group.
            totalArticles: { $sum: 1 },                // calculates total articles
          }, 
        },
        {
          $project: {
            _id: 0,
            category: "$_id",
            avgBias: { $round: ["$avgBias", 3] },
            totalArticles: 1,
          },
        },
        {
          $sort: {
            avgBias: -1,
            totalArticles: -1,
            category: 1,
          },
        },
      ]),


      Article.aggregate([         // calculates the overall bias statistics across all articles.   
        { $match: matchStage },
        {
          $addFields: {
            analyticsBiasScore,       // It doesn't permanently add this field to your database. 
                                      // It's available during this aggregation.
          },
        },
        {
          $match: {
            analyticsBiasScore: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            overallBias: { $avg: "$analyticsBiasScore" },
            totalArticles: { $sum: 1 },    // Article 1 → +1     //Article 2 → +1  //Article 3 → +1
          },
        },
        {
          $project: {
            _id: 0,    //remove _id from output.
            overallBias: { $round: ["$overallBias", 3] },
            totalArticles: 1,      //keep totalArticles
          },
        },
        // [
      //   {
      //     overallBias: 0.532,
      //     totalArticles: 100
      //   }
      // ]
      ]),
      


      Article.aggregate([        //finds the single most biased article.
        { $match: matchStage },
        {
          $addFields: {
            analyticsBiasScore,
          },
        },
        {
          $match: {
            analyticsBiasScore: { $ne: null },
          },
        },
        {
          $sort: {
            analyticsBiasScore: -1,
            createdAt: -1,
            publishedAt: -1,
          },
        },
        {
          $limit: 1,
        },
        {
          $project: {
            _id: 0,
            title: 1,
            source: 1,
            link: 1,
            category: 1,
            biasScore: { $round: ["$analyticsBiasScore", 3] },
          },
        },
      ]),


      Article.aggregate([       //finds the top 3 news sources based on their neutrality score.
        { $match: matchStage },
        {
          $addFields: {        // Add two temporary fields: analyticsBiasScore and sourceNeutralityScore
            analyticsBiasScore,
            sourceNeutralityScore: {
              $ifNull: [
                "$leanDeviation",
                {
                  $ifNull: [
                    "$bias.leanDeviation",
                    {
                      $abs: {
                        $subtract: [analyticsBiasScore, 0],
                      },
                    },
                  ],
                },
              ],
            },
          },
        },
        {
          $match: {
            source: { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$source",
            avgNeutralityScore: { $avg: "$sourceNeutralityScore" },
            avgBias: { $avg: "$analyticsBiasScore" },
            articleCount: { $sum: 1 },
          },
        },
        {
          $sort: {
            avgNeutralityScore: 1,
            avgBias: 1,
            articleCount: -1,
            _id: 1,
          },
        },
        {
          $limit: 3,
        },
        {
          $project: {
            _id: 0,
            source: "$_id",
            neutralityScore: { $round: ["$avgNeutralityScore", 3] },
            avgBias: { $round: ["$avgBias", 3] },
            articleCount: 1,
          },
        },
      ]),


      Article.aggregate([
        { $match: matchStage },
        {
          $addFields: {
            analyticsBiasScore,
            trendDate: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: { $ifNull: ["$publishedAt", "$createdAt"] },
              },
            },
          },
        },
        {
          $match: {
            analyticsBiasScore: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$trendDate",
            avgBias: { $avg: "$analyticsBiasScore" },
            totalArticles: { $sum: 1 },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
        {
          $limit: 7,
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $project: {
            _id: 0,
            date: "$_id",
            avgBias: { $round: ["$avgBias", 3] },
            totalArticles: 1,
          },
        },
      ]),
      Article.aggregate([
        { $match: matchStage },
        {
          $addFields: {
            analyticsBiasScore,
          },
        },
        {
          $match: {
            analyticsBiasScore: { $ne: null },
            source: { $exists: true, $ne: "" },
          },
        },
        {
          $group: {
            _id: "$source",
            avgBias: { $avg: "$analyticsBiasScore" },
            totalArticles: { $sum: 1 },
          },
        },
        {
          $sort: {
            totalArticles: -1,
            avgBias: -1,
            _id: 1,
          },
        },
        {
          $limit: 8,
        },
        {
          $project: {
            _id: 0,
            source: "$_id",
            avgBias: { $round: ["$avgBias", 3] },
            totalArticles: 1,
          },
        },
      ]),
      Article.aggregate([
        { $match: matchStage },
        {
          $addFields: {
            leanLabel: {
              $ifNull: ["$bias.politicalLean", "center"],
            },
          },
        },
        {
          $group: {
            _id: "$leanLabel",
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            name: "$_id",
            value: 1,
          },
        },
        {
          $sort: {
            value: -1,
            name: 1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      categories,
      overallBias: overallStats[0]?.overallBias || 0,
      totalArticles: overallStats[0]?.totalArticles || 0,
      mostBiasedArticle: mostBiasedArticle[0] || null,
      sourceNeutrality,
      biasTrend,
      sourceContribution,
      politicalLeanDistribution,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: getRecommendedArticles
 * Motive: Generates contextual recommendations for a given article (by ID), matching
 * similar category and sentiment first, with a fallback to category-only matches.
 */
const getRecommendedArticles = async (req, res) => {
  try {
    const article = await Article.findById(req.params.articleId);

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    const recommendations = await Article.find({
      category: article.category,
      sentiment: article.sentiment,
      _id: { $ne: article._id },
    })
      .sort({ publishedAt: -1 })
      .limit(5);

    if (recommendations.length > 0) {
      return res.status(200).json(recommendations);
    }

    const fallbackRecommendations = await Article.find({
      category: article.category,
      _id: { $ne: article._id },
    })
      .sort({ publishedAt: -1 })
      .limit(5);

    return res.status(200).json(fallbackRecommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Controller: getClusterArticles
 * Motive: Fetches articles that belong to the same event cluster, optionally excluding a specific article.
 */
const getClusterArticles = async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { excludeId } = req.query;

    if (!clusterId) {
      return res.status(400).json({ error: "Cluster ID is required" });
    }

    const query = { eventClusterId: clusterId };
    
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .limit(4);

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllArticles,
  getScrapedArticles,
  getNewsArticles,
  getCategoryBiasAnalytics,
  getBiasSummaryAnalytics,
  getRecommendedArticles,
  getClusterArticles,
};
