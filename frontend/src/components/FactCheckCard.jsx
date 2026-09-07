import React, { memo, useState } from "react";

function getVerdictBadgeStyle(rating) {
  const normalized = String(rating || "").trim().toLowerCase();

  const falseKeywords = ["false", "fake", "pants on fire", "incorrect", "fabricated", "hoax", "scam", "misleading"];
  const trueKeywords = ["true", "correct", "accurate", "verified", "confirmed"];
  const partialKeywords = ["partly", "half", "mixture", "partially", "mostly", "altered", "missing context", "exaggerated", "unproven"];

  if (falseKeywords.some((kw) => normalized.includes(kw))) {
    return "bg-red-50 text-red-700 ring-red-200/60";
  }

  if (trueKeywords.some((kw) => normalized.includes(kw))) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/60";
  }

  if (partialKeywords.some((kw) => normalized.includes(kw))) {
    return "bg-amber-50 text-amber-700 ring-amber-200/60";
  }

  return "bg-slate-50 text-slate-700 ring-slate-200/60";
}

function formatDate(dateStr) {
  if (!dateStr) {
    return "";
  }

  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function FactCheckCard({ factCheck }) {
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(factCheck.image) && !imgError;
  const verdictStyle = getVerdictBadgeStyle(factCheck.rating);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.10)] transition-[transform,box-shadow,border-color,background-color] duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:scale-[1.001] hover:border-slate-200 hover:bg-white hover:shadow-[0_16px_34px_rgba(15,23,42,0.12)]"
    >
      {/* Hover gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.16),transparent_38%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_34%)] opacity-0 transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:opacity-100" />

      <div className="flex flex-col items-stretch sm:flex-row">
        {/* Image / Placeholder */}
        <div className="relative flex h-48 w-full flex-shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 sm:h-auto sm:w-72 sm:self-stretch">
          {hasImage ? (
            <img
              src={factCheck.image}
              alt={factCheck.publisher}
              className="h-16 w-16 rounded-xl object-contain transition-[transform,filter] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="h-12 w-12 text-slate-400/70"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
              <span className="text-xs font-medium text-slate-400">Fact Check</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/5 via-transparent to-white/8 opacity-70 transition-opacity duration-500 group-hover:opacity-40" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex w-full flex-col gap-5 p-7 transition-[transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 pr-4 lg:pr-8">
            {/* Title */}
            <h2 className="mb-2 text-[1.55rem] font-semibold leading-[1.3] text-gray-900 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-slate-950 group-hover:translate-x-0.5">
              {factCheck.title || factCheck.claim}
            </h2>

            {/* Meta line */}
            <p className="mb-3 text-[0.92rem] text-gray-500 transition-colors duration-300 group-hover:text-slate-500">
              {factCheck.claimant && factCheck.claimant !== "Unknown" && (
                <>
                  <span className="font-medium">Claimed by: {factCheck.claimant}</span>
                  <span className="mx-2">•</span>
                </>
              )}
              <span className="font-medium">{factCheck.publisher}</span>
              {factCheck.reviewDate && (
                <>
                  <span className="mx-2">•</span>
                  {formatDate(factCheck.reviewDate)}
                </>
              )}
            </p>

            {/* Claim text */}
            {factCheck.claim && factCheck.claim !== factCheck.title && (
              <p className="text-[0.98rem] leading-7 text-gray-600 transition-colors duration-300 group-hover:text-slate-600">
                <span className="font-semibold text-slate-500">Claim: </span>
                {factCheck.claim}
              </p>
            )}
          </div>

          {/* Right column: verdict + link */}
          <div className="flex flex-col gap-5 lg:min-w-[280px] lg:max-w-[340px] lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-3 lg:justify-end">
              {/* Verdict badge */}
              <span
                className={`rounded-full px-5 py-2.5 text-sm font-bold whitespace-nowrap ring-1 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_18px_rgba(15,23,42,0.08)] ${verdictStyle}`}
              >
                {factCheck.rating}
              </span>
            </div>

            {factCheck.url ? (
              <a
                href={factCheck.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-blue-600 transition-[color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-blue-700 hover:underline group-hover:translate-x-0.5"
                onClick={(event) => event.stopPropagation()}
              >
                Read Full Fact Check →
              </a>
            ) : (
              <span className="text-sm font-medium text-slate-400">
                No article link available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(FactCheckCard);
