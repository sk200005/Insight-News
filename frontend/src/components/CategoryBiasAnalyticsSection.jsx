import React, { useEffect, useMemo, useState } from "react";
import CountUp from "react-countup";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../api/axios";

const PIE_COLORS = ["#7fc6ff", "#f7b267", "#8ad6c9", "#f58fa8", "#c7d2fe"];
const ANALYTICS_EASE = [0.22, 1, 0.36, 1];
const COUNTUP_DURATION = 2.4;
const BAR_FILL_DURATION = 2.8;
const CARD_REVEAL_DURATION = 0.8;

function formatCategoryLabel(category) {
  if (!category) {
    return "General";
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatLeanLabel(value) {
  return String(value || "center")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeLeanBucket(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["left", "center-left"].includes(normalized)) {
    return "left";
  }

  if (["right", "center-right"].includes(normalized)) {
    return "right";
  }

  if (normalized === "neutral") {
    return "neutral";
  }

  if (normalized === "center") {
    return "center";
  }

  return "neutral";
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getReadableLinkLabel(url) {
  if (!url) {
    return "Article URL unavailable";
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "Open article";
  }
}

function MetricCard({ label, value, helper, accent = "text-[#7fc6ff]" }) {
  return (
    <div className="rounded-[1.4rem] border border-[rgba(220,232,245,0.12)] bg-[rgba(255,255,255,0.08)] px-4 py-4">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#bfd8ed]">
        {label}
      </p>
      <p className={`mt-3 text-3xl font-semibold text-[#fbf8f1] ${accent}`}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#dfe8ef]">{helper}</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-[1.4rem] border border-dashed border-[rgba(220,232,245,0.18)] bg-[rgba(255,255,255,0.05)] px-6 text-center text-sm text-[#dfe8ef]">
      {label}
    </div>
  );
}

function CategoryBiasAnalyticsSection({ className = "" }) {
  const sectionRef = React.useRef(null);
  const [analytics, setAnalytics] = useState({
    categories: [],
    overallBias: 0,
    totalArticles: 0,
    mostBiasedArticle: null,
    sourceNeutrality: [],
    biasTrend: [],
    sourceContribution: [],
    politicalLeanDistribution: [],
  });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await api.get("/analytics/bias-summary");
        setAnalytics({
          categories: res.data?.categories || [],
          overallBias: Number(res.data?.overallBias || 0),
          totalArticles: Number(res.data?.totalArticles || 0),
          mostBiasedArticle: res.data?.mostBiasedArticle || null,
          sourceNeutrality: res.data?.sourceNeutrality || [],
          biasTrend: res.data?.biasTrend || [],
          sourceContribution: res.data?.sourceContribution || [],
          politicalLeanDistribution: res.data?.politicalLeanDistribution || [],
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      }
    };

    loadAnalytics();
  }, []);

  useEffect(() => {
    if (analytics.categories.length === 0) {
      return undefined;
    }

    const updateAnimationState = () => {
      const element = sectionRef.current;

      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

      if (viewportHeight <= 0) {
        return;
      }

      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
      );
      const referenceHeight = Math.min(rect.height, viewportHeight);
      const visibleRatio = referenceHeight > 0 ? visibleHeight / referenceHeight : 0;

      if (visibleRatio >= 0.68) {
        setHasAnimated(true);
        return;
      }

      if (visibleRatio <= 0.28) {
        setHasAnimated(false);
      }
    };

    updateAnimationState();
    window.addEventListener("scroll", updateAnimationState, { passive: true });
    window.addEventListener("resize", updateAnimationState);

    return () => {
      window.removeEventListener("scroll", updateAnimationState);
      window.removeEventListener("resize", updateAnimationState);
    };
  }, [analytics.categories.length]);

  const sortedCategories = useMemo(
    () =>
      [...analytics.categories].sort(
        (firstItem, secondItem) => Number(secondItem.avgBias || 0) - Number(firstItem.avgBias || 0)
      ),
    [analytics.categories]
  );
  const highestBiasCategory = sortedCategories[0];
  const mostCoveredCategory = useMemo(
    () =>
      [...analytics.categories].sort(
        (firstItem, secondItem) => (secondItem.totalArticles || 0) - (firstItem.totalArticles || 0)
      )[0],
    [analytics.categories]
  );
  const overallBiasPercentage = Math.round(analytics.overallBias * 100);
  const chartOverallData = useMemo(
    () => [
      {
        name: "Overall bias",
        value: Math.max(0, Math.min(100, overallBiasPercentage)),
        fill: "#9bd1ff",
      },
    ],
    [overallBiasPercentage]
  );
  const categoryArticleTotals = useMemo(
    () =>
      [...analytics.categories]
        .sort((firstItem, secondItem) => (secondItem.totalArticles || 0) - (firstItem.totalArticles || 0))
        .map((item) => ({
          ...item,
          label: formatCategoryLabel(item.category),
        })),
    [analytics.categories]
  );
  const formattedSourceContribution = useMemo(
    () =>
      analytics.sourceContribution.map((item) => ({
        ...item,
        avgBiasPercent: Math.round(Number(item.avgBias || 0) * 100),
      })),
    [analytics.sourceContribution]
  );
  const formattedLeanDistribution = useMemo(() => {
    const bucketTotals = analytics.politicalLeanDistribution.reduce(
      (totals, item) => {
        const bucket = normalizeLeanBucket(item.name);
        totals[bucket] = (totals[bucket] || 0) + Number(item.value || 0);
        return totals;
      },
      {
        left: 0,
        center: 0,
        right: 0,
        neutral: 0,
      }
    );

    return [
      { name: "Center", value: bucketTotals.center },
      { name: "Left", value: bucketTotals.left },
      { name: "Right", value: bucketTotals.right },
      { name: "Neutral", value: bucketTotals.neutral },
    ].filter((item) => item.value > 0);
  }, [analytics.politicalLeanDistribution]);

  return (
    <section
      id="bias-analytics"
      ref={sectionRef}
      className={`rounded-[2.2rem] border border-[#48637f] bg-[linear-gradient(135deg,#374e68_0%,#425a75_45%,#4d6784_100%)] shadow-[0_20px_46px_rgba(43,60,79,0.18)] ${className}`.trim()}
    >
      <div className="w-full px-5 py-8 sm:px-12 sm:py-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[2rem] font-semibold text-[#fbf8f1]">Category Bias Analytics</h2>
            {/* <p className="mt-2 max-w-3xl text-base leading-7 text-[#dfe8ef]">
              Explore animated bias metrics, category performance, source influence, and political lean signals inside one analytics window.
            </p> */}
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end lg:justify-end">
            <div className="rounded-[1.25rem] border border-[rgba(224,235,247,0.16)] bg-[rgba(255,255,255,0.08)] px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#b5d8f6]">
                Total articles
              </p>
              <p className="mt-2 text-3xl font-semibold leading-none text-[#fbf8f1]">
                <CountUp
                  key={`total-articles-${hasAnimated ? "live" : "idle"}`}
                  start={0}
                  end={hasAnimated ? analytics.totalArticles : 0}
                  duration={COUNTUP_DURATION}
                />
              </p>
              <p className="mt-2 text-sm text-[#dfe8ef]">news articles indexed</p>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-sm uppercase tracking-[0.22em] text-[#b5d8f6]">
                Live analytics snapshot
              </p>
              <p className="mt-2 text-base text-[#dfe8ef]">
                Average bias score per category
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.8fr_0.95fr]">
          <div className="rounded-[1.85rem] border border-[#5d7a98] bg-[linear-gradient(180deg,#48627d_0%,#53708d_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                Bias Distribution
              </p>
              <p className="text-xs text-[#dfe8ef]">Animated average bias by category</p>
            </div>

            <div className="space-y-4">
              {sortedCategories.map((category, index) => {
                const biasPercent = Math.max(
                  0,
                  Math.min(100, Number(category.avgBias || 0) * 100)
                );

                return (
                  <motion.div
                    key={category.category}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: index * 0.12,
                      duration: CARD_REVEAL_DURATION,
                      ease: ANALYTICS_EASE,
                    }}
                    className="rounded-[1.35rem] border border-[rgba(224,235,247,0.16)] bg-[rgba(255,255,255,0.08)] px-5 py-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold uppercase tracking-wide text-[#fbf8f1]">
                          {formatCategoryLabel(category.category)}
                        </p>
                        <p className="mt-1 text-sm text-[#dfe8ef]">
                          {category.totalArticles} articles indexed
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-semibold text-[#fbf8f1]">
                          <CountUp
                            key={`${category.category}-${hasAnimated ? "live" : "idle"}`}
                            start={0}
                            end={hasAnimated ? biasPercent : 0}
                            duration={COUNTUP_DURATION}
                            decimals={0}
                            suffix="%"
                          />
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#b5d8f6]">
                          avg bias
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#bfd8ed]">
                        <span>Bias intensity</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-[rgba(255,255,255,0.14)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: hasAnimated ? `${biasPercent}%` : 0 }}
                          transition={{
                            duration: BAR_FILL_DURATION,
                            delay: index * 0.16,
                            ease: ANALYTICS_EASE,
                          }}
                          className="h-full rounded-full bg-[linear-gradient(90deg,#7fc6ff_0%,#b5d8f6_100%)]"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[1.85rem] border border-[#6f8bac] bg-[linear-gradient(180deg,#4f6b88_0%,#5b7897_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                Bias Snapshot
              </p>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
                <div className="relative h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="68%"
                      outerRadius="96%"
                      barSize={20}
                      data={chartOverallData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar background clockWise dataKey="value" cornerRadius={999} />
                    </RadialBarChart>
                  </ResponsiveContainer>

                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="max-w-[9rem] text-center">
                      <p className="text-[2.1rem] font-semibold leading-none text-[#fbf8f1]">
                        <CountUp
                          key={`overall-${hasAnimated ? "live" : "idle"}`}
                          start={0}
                          end={hasAnimated ? overallBiasPercentage : 0}
                          duration={COUNTUP_DURATION + 0.4}
                          suffix="%"
                        />
                      </p>
                      <p className="mt-3 text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[#b5d8f6]">
                        Overall Bias Level
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-[#dfe8ef]">Average across all categories</p>
                    {/* <p className="mt-2 text-sm leading-7 text-[#dfe8ef]">
                      The donut highlights the current average bias signal across all tracked categories.
                    </p> */}
                  </div>

                  <div className="grid gap-3">
                    <MetricCard
                      label="Highest bias"
                      value={
                        highestBiasCategory
                          ? formatCategoryLabel(highestBiasCategory.category)
                          : "N/A"
                      }
                      helper={
                        highestBiasCategory
                          ? `${Math.round(Number(highestBiasCategory.avgBias || 0) * 100)}% average score`
                          : "No category data available yet."
                      }
                    />
                    <MetricCard
                      label="Most coverage"
                      value={
                        mostCoveredCategory
                          ? formatCategoryLabel(mostCoveredCategory.category)
                          : "N/A"
                      }
                      helper={
                        mostCoveredCategory
                          ? `${mostCoveredCategory.totalArticles} indexed articles`
                          : "Coverage stats will appear once data is available."
                      }
                      accent="text-[#fbf8f1]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.65rem] border border-[#6f8bac] bg-[linear-gradient(180deg,#4f6b88_0%,#5b7897_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                  Most Biased Article
                </p>
                {analytics.mostBiasedArticle ? (
                  <div className="mt-4 flex min-h-[17rem] flex-col justify-between">
                    <div className="space-y-3">
                      <p className="text-lg font-semibold leading-7 text-[#fbf8f1]">
                        {analytics.mostBiasedArticle.title}
                      </p>
                      <p className="text-sm text-[#dfe8ef]">
                        {analytics.mostBiasedArticle.source} • {formatCategoryLabel(analytics.mostBiasedArticle.category)}
                      </p>
                      <p className="text-2xl font-semibold text-[#7fc6ff]">
                        <CountUp
                          key={`most-biased-${hasAnimated ? "live" : "idle"}`}
                          start={0}
                          end={
                            hasAnimated
                              ? Math.round(Number(analytics.mostBiasedArticle.biasScore || 0) * 100)
                              : 0
                          }
                          duration={COUNTUP_DURATION}
                          suffix="%"
                        />
                      </p>
                    </div>

                    <div className="mt-6 border-t border-[rgba(223,232,239,0.12)] pt-4">
                      <p className="mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#bfd8ed]">
                        Article Link
                      </p>
                      {analytics.mostBiasedArticle.link || analytics.mostBiasedArticle.url ? (
                        <a
                          href={analytics.mostBiasedArticle.link || analytics.mostBiasedArticle.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-between gap-3 rounded-2xl bg-[rgba(191,225,255,0.12)] px-4 py-3 text-sm font-semibold text-[#dff0ff] transition hover:bg-[rgba(191,225,255,0.2)] hover:text-white"
                        >
                          <span>Read full article</span>
                          <span className="truncate text-right text-[#bfe1ff]">
                            {getReadableLinkLabel(
                              analytics.mostBiasedArticle.link || analytics.mostBiasedArticle.url
                            )}
                          </span>
                          <span aria-hidden="true">→</span>
                        </a>
                      ) : (
                        <div className="rounded-2xl bg-[rgba(255,255,255,0.08)] px-4 py-3 text-sm text-[#dfe8ef]">
                          Article URL unavailable
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <EmptyState label="Most biased article insight will appear when articles have completed bias analysis." />
                )}
              </div>

              <div className="rounded-[1.65rem] border border-[#6f8bac] bg-[linear-gradient(180deg,#4f6b88_0%,#5b7897_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                  Source Neutrality Ranking
                </p>
                {analytics.sourceNeutrality.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {analytics.sourceNeutrality.map((item, index) => (
                      <div
                        key={item.source}
                        className="flex items-center justify-between rounded-[1.2rem] bg-[rgba(255,255,255,0.08)] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm uppercase tracking-[0.18em] text-[#bfd8ed]">
                            #{index + 1}
                          </p>
                          <p className="mt-1 text-base font-semibold text-[#fbf8f1]">
                            {item.source}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-[#7fc6ff]">
                            {Math.round(Number(item.avgBias || 0) * 100)}%
                          </p>
                          <p className="text-xs text-[#dfe8ef]">
                            {item.articleCount} articles
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState label="Neutrality rankings will populate once source-level bias history is available." />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-[1.75rem] border border-[#5d7a98] bg-[rgba(255,255,255,0.07)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                Category Totals
              </p>
              <p className="text-xs text-[#dfe8ef]">Total articles per category</p>
            </div>
            {categoryArticleTotals.length > 0 ? (
              <div className="space-y-2.5">
                {categoryArticleTotals.map((item, index) => {
                  const maxArticles = Math.max(
                    ...categoryArticleTotals.map((category) => Number(category.totalArticles || 0)),
                    1
                  );
                  const widthPercent = (Number(item.totalArticles || 0) / maxArticles) * 100;

                  return (
                    <motion.div
                      key={item.category}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.08,
                        duration: CARD_REVEAL_DURATION,
                        ease: ANALYTICS_EASE,
                      }}
                      className="rounded-[1.1rem] bg-[rgba(255,255,255,0.06)] px-4 py-2.5"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#fbf8f1]">
                          {item.label}
                        </p>
                        <p className="text-lg font-semibold text-[#dff0ff]">
                          <CountUp
                            key={`${item.category}-articles-${hasAnimated ? "live" : "idle"}`}
                            start={0}
                            end={hasAnimated ? Number(item.totalArticles || 0) : 0}
                            duration={COUNTUP_DURATION}
                          />
                        </p>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.12)]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: hasAnimated ? `${widthPercent}%` : 0 }}
                          transition={{
                            duration: BAR_FILL_DURATION,
                            delay: index * 0.12,
                            ease: ANALYTICS_EASE,
                          }}
                          className="h-full rounded-full bg-[linear-gradient(90deg,#90d4ff_0%,#c6e6ff_100%)]"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <EmptyState label="Category totals will appear once analyzed articles are available." />
            )}
          </div>

          <div className="rounded-[1.75rem] border border-[#5d7a98] bg-[rgba(255,255,255,0.07)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                Source Bias Contribution
              </p>
              <p className="text-xs text-[#dfe8ef]">Top indexed sources</p>
            </div>
            {formattedSourceContribution.length > 0 ? (
              <div className="h-[22rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formattedSourceContribution}
                    layout="vertical"
                    barCategoryGap="12%"
                    margin={{ top: 8, left: 18, right: 10, bottom: 8 }}
                  >
                    <CartesianGrid stroke="rgba(223,232,239,0.1)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#dfe8ef", fontSize: 12 }} axisLine={false} tickLine={false} unit="%" />
                    <YAxis
                      type="category"
                      dataKey="source"
                      width={110}
                      tick={{ fill: "#dfe8ef", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#425a75",
                        border: "1px solid rgba(223,232,239,0.14)",
                        borderRadius: "16px",
                        color: "#fbf8f1",
                      }}
                    />
                    <Bar dataKey="avgBiasPercent" fill="#9bd1ff" radius={[0, 10, 10, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState label="Source contribution charts will render once bias-analyzed source coverage is available." />
            )}
          </div>

          <div className="rounded-[1.75rem] border border-[#5d7a98] bg-[rgba(255,255,255,0.07)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#b5d8f6]">
                Political Lean Distribution
              </p>
              <p className="text-xs text-[#dfe8ef]">Bias analyzed articles</p>
            </div>
            {formattedLeanDistribution.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formattedLeanDistribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={92}
                      paddingAngle={3}
                    >
                      {formattedLeanDistribution.map((item, index) => (
                        <Cell key={`${item.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#425a75",
                        border: "1px solid rgba(223,232,239,0.14)",
                        borderRadius: "16px",
                        color: "#fbf8f1",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#dfe8ef", fontSize: "12px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState label="Political lean distribution will appear once bias results are available." />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default CategoryBiasAnalyticsSection;
