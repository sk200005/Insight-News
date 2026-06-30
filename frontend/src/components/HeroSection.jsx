import React from "react";
import { Link } from "react-router-dom";
import FlipText from "./FlipText";

const heroLogoSrc = encodeURI("/webLogo/home.png");

const logoBadges = [
  {
    id: "bbc",
    // desktop absolute positions unchanged
    position: "top-[42%] left-[2.5%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy.png",
    alt: "BBC News",
  },
  {
    id: "hindu",
    position: "top-[62%] left-[16%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 2.png",
    alt: "The Hindu",
  },
  {
    id: "toi",
    position: "bottom-[2.5%] left-[2.5%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 3.png",
    alt: "Times of India",
  },
  {
    id: "cnn",
    position: "bottom-[2.5%] left-[29.5%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 4.png",
    alt: "CNN",
  },
  {
    id: "ht",
    position: "top-[42%] left-[29.5%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 5.png",
    alt: "Hindustan Times",
  },
  {
    id: "ndtv",
    position: "top-[42%] right-[23%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 6.png",
    alt: "NDTV 24x7",
  },
  {
    id: "indian-express",
    position: "top-[56%] right-[4%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 7.png",
    alt: "The Indian Express",
  },
  {
    id: "india-today",
    position: "bottom-[2.5%] right-[4%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 8.png",
    alt: "India Today",
  },
  {
    id: "wire",
    position: "bottom-[2.5%] right-[23%]",
    shell: "h-40 w-40 xl:h-44 xl:w-44",
    src: "/logos/image copy 9.png",
    alt: "The Wire",
  },
];

// Badge circle shared styles
function BadgeCircle({ badge, size = "h-16 w-16" }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border-2 border-white/90 bg-white/60 shadow-[0_8px_18px_rgba(15,23,42,0.08)] ${size}`}
    >
      <div className="relative h-[98%] w-[98%] overflow-hidden rounded-full bg-white">
        <img
          src={badge.src}
          alt={badge.alt}
          className="h-full w-full scale-[1.18] object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-white/45" />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="top" className="relative overflow-x-hidden overflow-y-visible bg-[#f7f6f2]">
      {/* Desktop blue band — 40% height */}
      <div className="absolute inset-x-0 top-0 h-[40%] bg-[#304660]" />

      {/* Desktop logo — absolutely positioned on the left */}
      <div className="absolute left-[3%] top-[7%] hidden lg:block">
        <img
          src={heroLogoSrc}
          alt="InSight AI hero logo"
          className="w-full max-w-[31rem] object-contain xl:max-w-[35rem]"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      {/* Desktop badge circles — absolutely positioned, hidden on mobile */}
      {logoBadges.map((badge) => (
        <div
          key={badge.id}
          className={`absolute hidden items-center justify-center rounded-full border-2 border-white/90 bg-white/60 shadow-[0_8px_18px_rgba(15,23,42,0.08)] lg:flex ${badge.position} ${badge.shell}`}
        >
          <div className="relative h-[98%] w-[98%] overflow-hidden rounded-full bg-white">
            <img
              src={badge.src}
              alt={badge.alt}
              className="h-full w-full scale-[1.18] object-cover"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-white/45" />
          </div>
        </div>
      ))}

      {/* ── MOBILE LAYOUT (hidden on lg+) ── */}
      <div className="relative flex flex-col lg:hidden">
        {/* Blue upper half */}
        <div className="bg-[#304660] px-6 pb-6 pt-8 sm:px-8">
          {/* InSight logo */}
          <div className="mb-5 w-full max-w-[16rem] sm:max-w-[20rem]">
            <img
              src={heroLogoSrc}
              alt="InSight AI hero logo"
              className="w-full object-contain"
              decoding="async"
              fetchPriority="high"
            />
          </div>

          {/* Hero headline — stays fully within the blue area */}
          <h1 className="hero-title max-w-4xl text-[2.2rem] font-black uppercase leading-[0.9] tracking-tight text-white sm:text-[2.9rem]">
            <span>NEWS AUTHENTICATOR</span>
            <span>
              <span className="text-[#ebd469]">&amp;</span>
              <span className="hero-title-accent text-[#9cc7ef]">
                <span>ANALYZER</span>
              </span>
            </span>
          </h1>
        </div>

        {/* Light lower half */}
        <div className="bg-[#f7f6f2] px-6 pb-10 pt-6 sm:px-8">
          {/* Evenly spread badge row */}
          <div className="mb-6 grid grid-cols-4 place-items-center gap-3 sm:grid-cols-5">
            {logoBadges.map((badge) => (
              <BadgeCircle key={badge.id} badge={badge} size="h-16 w-16 sm:h-20 sm:w-20" />
            ))}
          </div>

          {/* Read News subtitle + CTA */}
          <div className="max-w-3xl pb-4">
            <FlipText
              className="hero-subtitle font-serif text-3xl font-black leading-[0.98] tracking-[-0.03em] text-[#1f2023] sm:text-4xl"
              duration={2.2}
              delay={1.1}
              loop={false}
            >
              Read News beyond Headlines
            </FlipText>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/news"
                className="inline-flex rounded-full bg-[#1f2023] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:text-sm"
              >
                Explore News
              </Link>
              <Link
                to="/bias-analysis"
                className="inline-flex rounded-full border border-slate-300 bg-white px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-900 shadow-[0_10px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 sm:text-sm"
              >
                Analyze Bias
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP LAYOUT (hidden on <lg) ── */}
      <div className="relative mx-auto hidden min-h-[calc(100vh-88px)] max-w-7xl px-6 pb-10 pt-10 lg:grid lg:grid-cols-[0.94fr_1.06fr] lg:px-10 lg:pb-12 lg:pt-10">
        <div className="hidden lg:block" />

        <div className="flex flex-col">
          <div className="pt-2 lg:pt-0">
            <h1 className="hero-title max-w-4xl pl-6 text-[2.7rem] font-black uppercase leading-[0.9] tracking-tight text-white sm:pl-8 sm:text-[3.3rem] lg:pl-14 lg:text-[3.95rem]">
              <span>NEWS AUTHENTICATOR</span>
              <span>
                <span className="text-[#ebd469]">&amp;</span>
                <span className="hero-title-accent text-[#9cc7ef]">
                  <span>ANALYZER</span>
                </span>
              </span>
            </h1>
          </div>

          <div className="h-24 lg:h-36" />

          <div className="mt-12 max-w-3xl pb-4 lg:ml-6 lg:mt-30">
            <FlipText
              className="hero-subtitle font-serif text-3xl font-black leading-[0.98] tracking-[-0.03em] text-[#1f2023] sm:text-4xl lg:text-[4rem]"
              duration={2.2}
              delay={1.1}
              loop={false}
            >
              Read News beyond Headlines
            </FlipText>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/news"
                className="inline-flex rounded-full bg-[#1f2023] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:text-sm"
              >
                Explore News
              </Link>
              <Link
                to="/bias-analysis"
                className="inline-flex rounded-full border border-slate-300 bg-white px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-900 shadow-[0_10px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 sm:text-sm"
              >
                Analyze Bias
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
