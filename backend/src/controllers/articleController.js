const Article = require("../models/Article");

function getAnalyticsBiasExpression() {
  return {
    $ifNull: [
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

const getAllArticles = async (req, res) => {
  try {
    const category =
      req.query.category && req.query.category !== "all"
        ? req.query.category
        : undefined;

    const query = category ? { category } : {};

    const articles = await Article.find(query)
      .sort({ createdAt: -1, publishedAt: -1 });

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

const getNewsArticles = async (req, res) => {
  try {
    const category =
      req.query.category && req.query.category !== "all"
        ? req.query.category
        : undefined;
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const query = {
      $or: [
        { processingStatus: { $in: ["analyzed", "bias_analyzed"] } },
        {
          articleOrigin: "pdf_upload",
          summary: { $exists: true, $ne: "" },
          bias: { $exists: true, $ne: null },
        },
      ],
    };

    if (category) {
      query.category = category;
    }

    let articleQuery = Article.find(query).sort({ createdAt: -1, publishedAt: -1 });

    if (Number.isFinite(requestedLimit) && requestedLimit > 0) {
      articleQuery = articleQuery.limit(requestedLimit);
    }

    const articles = await articleQuery;

    res.status(200).json(articles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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
              "$bias.biasScore",
              "$biasScore",
            ],
          },
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

const getBiasSummaryAnalytics = async (req, res) => {
  try {
    const matchStage = {
      processingStatus: "bias_analyzed",
    };
    const analyticsBiasScore = getAnalyticsBiasExpression();

    const [
      categories,
      overallStats,
      mostBiasedArticle,
      sourceNeutrality,
      biasTrend,
      sourceContribution,
      politicalLeanDistribution,
    ] = await Promise.all([
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
            category: { $exists: true, $ne: "" },
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
            avgBias: -1,
            totalArticles: -1,
            category: 1,
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
          },
        },
        {
          $group: {
            _id: null,
            overallBias: { $avg: "$analyticsBiasScore" },
            totalArticles: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            overallBias: { $round: ["$overallBias", 3] },
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
      Article.aggregate([
        { $match: matchStage },
        {
          $addFields: {
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

module.exports = {
  getAllArticles,
  getScrapedArticles,
  getNewsArticles,
  getCategoryBiasAnalytics,
  getBiasSummaryAnalytics,
  getRecommendedArticles,
};
