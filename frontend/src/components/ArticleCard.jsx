import React, { memo, useMemo, useState } from "react";
import BiasInsightPanel from "./BiasInsightPanel";

function formatCategory(category) {
  if (!category) {
    return "";
  }

  return category
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function getPreviewText(article) {
  const summary = article.summary?.trim();
  if (summary) {
    return summary;
  }

  const rawContent = article.rawContent?.trim();
  if (rawContent) {
    return `${rawContent.slice(0, 120)}...`;
  }

  const content = article.content?.trim();
  if (content) {
    return `${content.slice(0, 120)}...`;
  }

  return "";
}

function getSummaryPoints(article) {
  if (!Array.isArray(article.summaryPoints)) {
    return [];
  }

  return article.summaryPoints
    .map((point) => String(point || "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeLean(lean) {
  const normalized = String(lean || "").trim().toLowerCase();
  return normalized || "center";
}

function getBiasLevelMeta(score) {
  const numericScore = Number(score) || 0;

  if (numericScore < 0.2) {
    return {
      label: "neutral",
      className: "bias-badge bg-yellow-50 text-yellow-700",
    };
  }

  if (numericScore < 0.4) {
    return {
      label: "slight bias",
      className: "bias-badge bg-amber-50 text-amber-700",
    };
  }

  if (numericScore < 0.7) {
    return {
      label: "moderate bias",
      className: "bias-badge bg-orange-50 text-orange-700",
    };
  }

  return {
    label: "strong bias",
    className: "bias-badge bg-red-50 text-red-700",
  };
}

function getPerspectiveBalanceMeta(score) {
  const numericScore = Number(score);

  if (numericScore > 0.7) {
    return {
      label: "balanced",
      className: "balance-badge bg-green-50 text-green-700",
      insight: "presents multiple viewpoints",
    };
  }

  if (numericScore >= 0.4) {
    return {
      label: "limited views",
      className: "balance-badge bg-yellow-50 text-yellow-700",
      insight: "includes limited opposing viewpoints",
    };
  }

  return {
    label: "one-sided",
    className: "balance-badge bg-red-50 text-red-700",
    insight: "presents a one-sided narrative",
  };
}

function getLeanBadgeClass(lean) {
  switch (normalizeLean(lean)) {
    case "left":
      return "center-badge bg-sky-50 text-sky-700";
    case "right":
      return "center-badge bg-rose-50 text-rose-700";
    case "center":
    default:
      return "center-badge bg-blue-50 text-blue-700";
  }
}

function isExternalArticleLink(link) {
  return /^https?:\/\//i.test(String(link || ""));
}

function ArticleCard({ article }) {
  const previewText = getPreviewText(article);
  const summaryPoints = getSummaryPoints(article);
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleExpand();
    }
  };

  const bias = article.bias || {};
  const politicalLean = normalizeLean(bias.politicalLean);
  const biasScoreFinal = Number(
    bias.biasScoreFinal ?? bias.biasScore ?? article.biasScore ?? 0
  );
  const perspectiveBalanceScore = Number(bias.perspectiveBalanceScore ?? 0);

  const biasLevelMeta = useMemo(
    () => getBiasLevelMeta(biasScoreFinal),
    [biasScoreFinal]
  );
  const perspectiveMeta = useMemo(
    () => getPerspectiveBalanceMeta(perspectiveBalanceScore),
    [perspectiveBalanceScore]
  );
  const articleLink = isExternalArticleLink(article.link) ? article.link : "";

  return (
    <div
        className={`deferred-card group relative cursor-pointer overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.10)] transition-[max-height,transform,box-shadow,border-color,background-color] duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:scale-[1.001] hover:border-slate-200 hover:bg-white hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)] focus-visible:-translate-y-0.5 focus-visible:scale-[1.001] focus-visible:border-cyan-300 focus-visible:bg-white focus-visible:shadow-[0_18px_38px_rgba(34,211,238,0.16)] focus-visible:outline-none ${
        expanded ? "max-h-[2500px] lg:max-h-[1180px]" : "max-h-[800px] lg:max-h-[260px]"
      }`}
      onClick={toggleExpand}
      onKeyDown={handleKeyDown}
      role="button"
      aria-expanded={expanded}
      tabIndex={0}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_34%)] opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100 group-focus-visible:opacity-100" />
      <div className="flex h-full flex-col">
        <div className="flex flex-col items-stretch sm:flex-row">
          {article.image && (
            <div className="relative h-56 w-full flex-shrink-0 overflow-hidden sm:h-auto sm:w-72 sm:self-stretch">
              <img
                src={article.image}
                alt={article.title}
                className="h-full w-full object-cover transition-[transform,filter] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.008] group-hover:saturate-[1.02] group-focus-visible:scale-[1.008] group-focus-visible:saturate-[1.02]"
                loading="lazy"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/12 via-transparent to-white/8 opacity-70 transition-opacity duration-500 group-hover:opacity-40 group-focus-visible:opacity-40" />
            </div>
          )}

          <div className="relative z-10 flex w-full flex-col gap-5 p-7 transition-[transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 pr-4 lg:pr-8">
              <div className="flex items-start justify-between gap-4">
                <h2 className="mb-2 text-[1.75rem] font-semibold leading-[1.28] text-gray-900 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-slate-950 group-hover:translate-x-0.5 group-focus-visible:text-slate-950 group-focus-visible:translate-x-0.5">
                  {article.title}
                </h2>
                <span className="mt-1 flex-shrink-0 text-lg font-semibold text-slate-400 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-y-0.5 group-hover:text-sky-500 group-focus-visible:translate-y-0.5 group-focus-visible:text-cyan-500">
                  {expanded ? "▲" : "▼"}
                </span>
              </div>

              <p className="mb-3 text-[0.98rem] text-gray-500 transition-colors duration-300 group-hover:text-slate-500 group-focus-visible:text-slate-500">
                <span className="font-medium">{article.source}</span>
                {article.category && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:bg-blue-100 group-hover:shadow-[0_8px_18px_rgba(59,130,246,0.12)] group-focus-visible:-translate-y-0.5 group-focus-visible:bg-blue-100 group-focus-visible:shadow-[0_8px_18px_rgba(59,130,246,0.12)]">
                      {formatCategory(article.category)}
                    </span>
                  </>
                )}
                <span className="mx-2">•</span>
                {new Date(article.publishedAt).toLocaleDateString()}
              </p>

              {summaryPoints.length > 0 ? (
                <ul className="space-y-3 text-[1.02rem] leading-8 text-gray-600 transition-colors duration-300 group-hover:text-slate-600 group-focus-visible:text-slate-600">
                  {summaryPoints.map((point, index) => (
                    <li
                      key={`${article._id || article.link || article.title}-summary-${index}`}
                      className={`flex items-start gap-3 ${expanded ? "" : index > 1 ? "hidden" : ""}`}
                    >
                      <span className="mt-[0.82rem] h-2 w-2 flex-shrink-0 rounded-full bg-sky-500" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              ) : previewText ? (
                <p className={`text-[1.02rem] leading-8 text-gray-600 transition-colors duration-300 group-hover:text-slate-600 group-focus-visible:text-slate-600 ${expanded ? "" : "line-clamp-4"}`}>
                  {previewText}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-5 lg:min-w-[390px] lg:max-w-[430px] lg:items-end lg:justify-between">
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold capitalize whitespace-nowrap transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] group-focus-visible:-translate-y-0.5 group-focus-visible:shadow-[0_10px_18px_rgba(15,23,42,0.08)] ${getLeanBadgeClass(
                    politicalLean
                  )}`}
                >
                  {politicalLean}
                </span>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] group-focus-visible:-translate-y-0.5 group-focus-visible:shadow-[0_10px_18px_rgba(15,23,42,0.08)] ${biasLevelMeta.className}`}
                >
                  {biasLevelMeta.label} {Math.round(biasScoreFinal * 100)}%
                </span>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] group-focus-visible:-translate-y-0.5 group-focus-visible:shadow-[0_10px_18px_rgba(15,23,42,0.08)] ${perspectiveMeta.className}`}
                >
                  {perspectiveMeta.label}
                </span>
              </div>

              {articleLink ? (
                <a
                  href={articleLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-blue-600 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-blue-700 hover:underline group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
                  onClick={(event) => event.stopPropagation()}
                >
                  Read Full Article →
                </a>
              ) : (
                <span className="text-sm font-medium text-slate-500">
                  Uploaded PDF Article
                </span>
              )}
            </div>
          </div>
        </div>

        {expanded ? (
          <div className="border-t border-gray-200/90 px-5 py-6 sm:px-7">
            <BiasInsightPanel bias={bias} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(ArticleCard);
