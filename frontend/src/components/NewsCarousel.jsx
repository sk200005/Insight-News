import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

function clampBiasScore(score) {
  const numericScore = Number(score);

  if (Number.isNaN(numericScore)) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, numericScore));
}

function getBiasBarSegments(article) {
  const bias = article.bias || {};
  const lean = String(
    bias.politicalLean || bias.sourceLean || "center"
  )
    .trim()
    .toLowerCase();
  const score = clampBiasScore(
    bias.biasScoreFinal ?? bias.biasScore ?? article.biasScore
  );

  const weightedScore = Math.pow(score, 0.7);

  if (lean === "left") {
    const leftShare = Math.round(16 + weightedScore * 70);
    const centerShare = Math.max(8, Math.round(30 - weightedScore * 20));
    const rightShare = Math.max(4, 100 - leftShare - centerShare);

    return [
      { key: "left", value: leftShare, tone: "bg-blue-700" },
      { key: "center", value: centerShare, tone: "bg-slate-200" },
      { key: "right", value: rightShare, tone: "bg-rose-600" },
    ];
  }

  if (lean === "right") {
    const rightShare = Math.round(16 + weightedScore * 70);
    const centerShare = Math.max(8, Math.round(30 - weightedScore * 20));
    const leftShare = Math.max(4, 100 - rightShare - centerShare);

    return [
      { key: "left", value: leftShare, tone: "bg-blue-700" },
      { key: "center", value: centerShare, tone: "bg-slate-200" },
      { key: "right", value: rightShare, tone: "bg-rose-600" },
    ];
  }

  const centerShare = Math.round(72 - weightedScore * 42);
  const leftShare = Math.round((100 - centerShare) * (0.35 + weightedScore * 0.15));
  const rightShare = 100 - centerShare - leftShare;

  return [
    { key: "left", value: leftShare, tone: "bg-blue-700" },
    { key: "center", value: centerShare, tone: "bg-slate-200" },
    { key: "right", value: rightShare, tone: "bg-rose-600" },
  ];
}

function BiasBar({ article }) {
  const segments = useMemo(() => getBiasBarSegments(article), [article]);

  return (
    <div className="pt-4">
      <div
        className="overflow-hidden rounded-full border border-slate-200/80 bg-slate-100"
        aria-label="Bias analysis"
      >
        <div className="flex w-full">
          {segments.map((segment) => (
            <div
              key={segment.key}
              className={`h-5 ${segment.tone}`}
              style={{ width: `${segment.value}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function NewsCarouselCard({ article }) {
  return (
    <article
      className="group flex h-full w-[min(78vw,19rem)] shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white/90 shadow-[0_14px_34px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_46px_rgba(15,23,42,0.12)] sm:w-[18rem] lg:w-[19rem] xl:w-[20rem]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {article.image ? (
          <img
            src={article.image}
            alt={article.title || "Latest news"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#0f172a_0%,#0369a1_55%,#14b8a6_100%)] px-6 text-center">
            <span className="text-lg font-black uppercase tracking-[0.18em] text-white">
              PDF Article
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/35 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col px-5 py-5">
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between gap-3 text-[0.74rem] font-bold uppercase tracking-[0.24em] text-slate-400">
            <span>{article.source || "Latest Brief"}</span>
            <span>{article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : "Today"}</span>
          </div>

          <h3 className="news-carousel-summary text-[1.08rem] font-semibold leading-8 text-slate-800">
            {article.title?.trim() || "Fresh coverage and perspective highlights from the latest headlines."}
          </h3>

          <div className="mt-auto pt-6">
            <div className="flex items-center justify-between">
              <span className="text-[0.82rem] font-bold uppercase tracking-[0.24em] text-sky-700">
                Latest update
              </span>

              {article.link ? (
                <a
                  href={article.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[0.98rem] font-semibold text-slate-900 transition hover:text-sky-700"
                >
                  Read more
                </a>
              ) : (
                <Link
                  to="/news"
                  className="text-[0.98rem] font-semibold text-slate-900 transition hover:text-sky-700"
                >
                  Explore
                </Link>
              )}
            </div>
          </div>
        </div>

        <BiasBar article={article} />
      </div>
    </article>
  );
}

function NewsCarousel({ news = [] }) {
  const items = useMemo(
    () =>
      news
        .filter((article) => article.title?.trim() && (article.image || article.isUserUploaded))
        .slice(0, 8),
    [news]
  );
  const trackRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const scrollSpeed = 38;
  const loopItems = useMemo(() => [...items, ...items], [items]);
  const [loopWidth, setLoopWidth] = useState(0);

  useEffect(() => {
    const track = trackRef.current;

    if (!track || items.length <= 1) {
      return undefined;
    }

    const updateLoopWidth = () => {
      const half = track.scrollWidth / 2;
      setLoopWidth(half);
    };

    updateLoopWidth();
    window.addEventListener("resize", updateLoopWidth);

    return () => {
      window.removeEventListener("resize", updateLoopWidth);
    };
  }, [items.length, loopItems.length]);

  useEffect(() => {
    const track = trackRef.current;

    if (!track || items.length <= 1 || loopWidth <= 0) {
      return undefined;
    }

    const tick = (time) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      offsetRef.current += (scrollSpeed * delta) / 1000;

      if (offsetRef.current >= loopWidth) {
        offsetRef.current -= loopWidth;
      }

      track.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      lastTimeRef.current = 0;
      offsetRef.current = 0;
      track.style.transform = "translate3d(0, 0, 0)";
    };
  }, [items.length, loopWidth]);

  if (!items.length) {
    return null;
  }

  return (
    <section className="news-carousel deferred-section relative overflow-hidden bg-[linear-gradient(180deg,#f7f6f2_0%,#f8fafc_36%,#eef4fb_78%,#eef4fb_100%)] pb-10 pt-16 sm:pt-18">
      <div className="mx-auto max-w-7xl px-6 md:px-10 xl:px-16">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-700">
              Latest News
            </p>
            <h1 className="mt-4 text-3xl font-black uppercase leading-tight text-slate-950 sm:text-4xl">
              Daily Briefing
            </h1>
            {/* <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              A live-style stream of the latest coverage, designed to surface key updates quickly
              without interrupting the rhythm of the homepage.
            </p> */}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* <button
              type="button"
              onClick={() => stepByCard(-1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
              aria-label="Show previous news cards"
            >
              ←
            </button> */}
            {/* <button
              type="button"
              onClick={() => stepByCard(1)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
              aria-label="Show next news cards"
            >
              →
            </button> */}
            {/* <Link
              to="/news"
              className="inline-flex w-fit rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700"
            >
              View all news
            </Link>  */}
          </div>
        </div>
      </div>

      <div className="relative mt-10 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div
          ref={trackRef}
          className="flex w-max gap-6 will-change-transform"
        >
          {loopItems.map((article, index) => (
            <div
              key={`${index}-${article.id || article._id || article.link}`}
              data-news-card
              className="shrink-0"
              aria-hidden={index >= items.length}
            >
              <NewsCarouselCard article={article} />
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}

export default NewsCarousel;
