import React, { useEffect, useMemo, useState } from "react";
import api, { API_BASE_URL } from "../api/axios";
import ArticleCard from "../components/ArticleCard";
import Navbar from "../components/Navbar";

const categories = [
  { label: "All", value: "all" },
  { label: "Politics", value: "politics" },
  { label: "Sports", value: "sports" },
  { label: "War", value: "war" },
  { label: "Stocks", value: "stocks" },
  // { label: "Technology", value: "technology" },
  { label: "Economy", value: "economy" },
  // { label: "World", value: "world" },
  // { label: "Entertainment", value: "entertainment" },
];
function hasRenderableContent(article) {
  const hasImage = Boolean(article.image?.trim());
  const hasSummary = Boolean(article.summary?.trim());
  const hasSummaryPoints = Array.isArray(article.summaryPoints)
    && article.summaryPoints.some((point) => String(point || "").trim());
  const hasBiasAnalysis = Boolean(
    article.bias?.biasScore !== undefined ||
      article.bias?.politicalLean ||
      article.bias?.sentiment ||
      article.biasScore !== undefined
  );

  return hasImage || hasSummary || hasSummaryPoints || hasBiasAnalysis;
}

function getApiErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.code === "ERR_NETWORK") {
    return `Could not connect to the backend at ${API_BASE_URL}.`;
  }

  return error.message || "Unknown error";
}

function News() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");

  const fetchArticles = async (selectedCategory = "all") => {
    const params =
      selectedCategory !== "all" ? { category: selectedCategory } : undefined;
    const res = await api.get("/news", { params });
    setArticles(res.data);
  };

  const regionFilteredArticles = useMemo(
    () =>
      articles
        .filter((article) => {
          if (region === "india") {
            return [
              "Indian Politics",
              "Indian economy",
              "Indian sports",
            ].includes(article.subCategory);
          }

          if (region === "world") {
            return [
              "World Politics",
              "World economy",
              "World sports",
            ].includes(article.subCategory);
          }

          return true;
        })
        .filter(hasRenderableContent),
    [articles, region]
  );

  const sortedArticles = useMemo(
    () =>
      [...regionFilteredArticles].sort((firstArticle, secondArticle) => {
        const firstCreatedAt = new Date(
          firstArticle.createdAt || firstArticle.publishedAt || 0
        ).getTime();
        const secondCreatedAt = new Date(
          secondArticle.createdAt || secondArticle.publishedAt || 0
        ).getTime();
        const firstBias =
          typeof (firstArticle.bias?.biasScore ?? firstArticle.biasScore) === "number"
            ? (firstArticle.bias?.biasScore ?? firstArticle.biasScore)
            : Number(firstArticle.bias?.biasScore ?? firstArticle.biasScore) || 0;
        const secondBias =
          typeof (secondArticle.bias?.biasScore ?? secondArticle.biasScore) === "number"
            ? (secondArticle.bias?.biasScore ?? secondArticle.biasScore)
            : Number(secondArticle.bias?.biasScore ?? secondArticle.biasScore) || 0;

        if (sortOrder === "oldest") {
          return firstCreatedAt - secondCreatedAt;
        }

        if (sortOrder === "most-biased") {
          return secondBias - firstBias;
        }

        if (sortOrder === "least-biased") {
          return firstBias - secondBias;
        }

        return secondCreatedAt - firstCreatedAt;
      }),
    [regionFilteredArticles, sortOrder]
  );

  const articleCountLabel = useMemo(
    () =>
      region === "all" && category === "all"
        ? `${sortedArticles.length} total articles shown`
        : `${sortedArticles.length} articles shown`,
    [category, region, sortedArticles.length]
  );

  const reloadArticles = async () => {
    const runStep = async (label, request, { optional = false } = {}) => {
      try {
        const response = await request();

        if (response?.data?.success === false) {
          throw new Error(response.data.error || response.data.message || `${label} failed.`);
        }

        return { ok: true, response };
      } catch (error) {
        const message = getApiErrorMessage(error);

        if (optional) {
          console.error(`${label} failed:`, error);
          return { ok: false, message };
        }

        throw new Error(`${label} failed: ${message}`);
      }
    };

    try {
      const optionalFailures = [];

      setLoading(true);
      setStatusMessage("Fetching 3 fresh articles from rotating RSS sources...");
      const reloadResult = await runStep("RSS reload", () => api.get("/news/reload-news"));
      const ingestedArticleIds = reloadResult.response?.data?.articles?.map((article) => article._id) || [];

      setStatusMessage("Scraping 3 fetched articles...");
      let scrapedArticleIds = [];
      {
        const result = await runStep(
          "Scraping",
          () => api.post("/scraper/run", { articleIds: ingestedArticleIds }),
          { optional: true }
        );

        if (!result.ok) {
          optionalFailures.push(result.message);
        } else {
          scrapedArticleIds = result.response?.data?.articleIds || [];

          if (scrapedArticleIds.length !== ingestedArticleIds.length) {
            optionalFailures.push(
              `Only ${scrapedArticleIds.length} of ${ingestedArticleIds.length} fetched articles were scraped successfully.`
            );
          }
        }
      }

      setStatusMessage("Generating summaries...");
      let summarizedArticleIds = [];
      {
        const result = await runStep(
          "Summarization",
          () => api.post("/summarize", { articleIds: scrapedArticleIds }),
          { optional: true }
        );

        if (!result.ok) {
          optionalFailures.push(result.message);
        } else {
          summarizedArticleIds = result.response?.data?.articleIds || [];

          if (summarizedArticleIds.length !== scrapedArticleIds.length) {
            optionalFailures.push(
              `Only ${summarizedArticleIds.length} of ${scrapedArticleIds.length} scraped articles were summarized successfully.`
            );
          }
        }
      }

      setStatusMessage("Analyzing bias for 3 articles...");
      let analyzedArticleIds = [];
      let biasFailures = [];
      {
        const result = await runStep(
          "Bias analysis",
          () => api.post("/bias/run", { articleIds: summarizedArticleIds }),
          { optional: true }
        );

        if (!result.ok) {
          optionalFailures.push(result.message);
        } else {
          analyzedArticleIds = result.response?.data?.articleIds || [];
          biasFailures = result.response?.data?.failures || [];

          if (analyzedArticleIds.length !== summarizedArticleIds.length) {
            optionalFailures.push(
              biasFailures[0]?.error ||
              `Only ${analyzedArticleIds.length} of ${summarizedArticleIds.length} summarized articles completed bias analysis.`
            );
          }
        }
      }

      await fetchArticles(category);

      if (analyzedArticleIds.length === 3) {
        setStatusMessage("3 articles reloaded, analyzed, and displayed successfully.");
      } else if (optionalFailures.length > 0) {
        setStatusMessage(`Articles loaded with partial issues: ${optionalFailures[0]}`);
      } else {
        setStatusMessage(`Reload completed with ${analyzedArticleIds.length} fully analyzed article(s).`);
      }
    } catch (error) {
      console.error("Pipeline error:", error);
      setStatusMessage(error.message || "Reload failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadArticlesByCategory = async () => {
      try {
        await fetchArticles(category);
      } catch (error) {
        console.error("Error fetching filtered articles:", error);
        setStatusMessage("Could not load filtered articles.");
      }
    };

    loadArticlesByCategory();
  }, [category]);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#374e68_0%,#425a75_45%,#4d6784_100%)]">
      <Navbar />

      <div className="w-full px-6 pb-20 pt-8 md:px-10 xl:px-16 space-y-5">

        {/* ── Control Panel ── */}
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden">

          {/* Top accent bar */}
          <div className="h-[2px] w-full bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.6),transparent)]" />

          <div className="px-7 pt-6 pb-5 flex flex-col gap-5">

            {/* Row 1: title + reload */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#7fc6ff]/70">
                  News Dashboard
                </p>
                <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
                  {statusMessage
                    ? <span className="text-base font-normal text-slate-300">{statusMessage}</span>
                    : "Filter · Analyse · Relate"}
                </h1>
                <p className="mt-1.5 text-sm font-medium text-[#7fc6ff]/80">
                  {articleCountLabel}
                </p>
              </div>

              <button
                onClick={reloadArticles}
                disabled={loading}
                className="shrink-0 flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-5 py-2.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-[0_4px_20px_rgba(6,182,212,0.45)] transition-all duration-200 hover:from-cyan-400 hover:to-sky-400 hover:shadow-[0_6px_28px_rgba(6,182,212,0.6)] hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Processing…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    Reload News
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-white/[0.07]" />

            {/* Row 2: category chips + sort */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              {/* Category filter track */}
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] p-1">
                {categories.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setCategory(item.value)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 ${
                      category === item.value
                        ? "bg-[rgba(125,211,252,0.18)] text-cyan-200 shadow-[0_0_0_1px_rgba(125,211,252,0.35)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="self-start rounded-lg border border-white/[0.1] bg-[rgba(0,0,0,0.25)] px-3.5 py-2 text-sm font-medium text-slate-300 outline-none transition focus:border-cyan-400/60 focus:text-white sm:self-auto"
              >
                <option value="latest">Latest first</option>
                <option value="oldest">Oldest first</option>
                <option value="most-biased">Most biased</option>
                <option value="least-biased">Least biased</option>
              </select>
            </div>

            {/* Row 3: region chips */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 pr-1">Region</span>
              {[
                { label: "All", value: "all" },
                { label: "India", value: "india" },
                { label: "World", value: "world" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setRegion(item.value)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-semibold tracking-wide transition-all duration-200 ${
                    region === item.value
                      ? "bg-[rgba(52,211,153,0.18)] text-emerald-300 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* ── Article list ── */}
        <section className="space-y-4">
          {sortedArticles.length > 0 ? (
            sortedArticles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-10 text-center text-sm text-slate-400">
              No articles match the current filters yet.
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default News;
