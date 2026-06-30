import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { animate } from "framer-motion";

const navLogoSrc = "/headLogo/insight-logo.png";

const NAV_ITEMS = [
  { label: "Home", to: "/" },
  { label: "News", to: "/news" },
  { label: "Bias Analysis", to: "/bias-analysis" },
  { label: "About", to: "/about" },
];

/** Derives which nav index should be active from the current pathname */
function useActiveIndex(items) {
  const { pathname } = useLocation();
  const exact = items.findIndex((it) => it.to === pathname);
  if (exact !== -1) return exact;
  let best = 0;
  let bestLen = 0;
  items.forEach((it, i) => {
    if (it.to !== "/" && pathname.startsWith(it.to) && it.to.length > bestLen) {
      best = i;
      bestLen = it.to.length;
    }
  });
  return best;
}

/* ─────────────────────────────────────────────
   DESKTOP — SpotlightNav (unchanged)
───────────────────────────────────────────── */
function SpotlightNav() {
  const navRef = useRef(null);
  const routeActiveIndex = useActiveIndex(NAV_ITEMS);
  const [activeIndex, setActiveIndex] = useState(routeActiveIndex);
  const [hoverX, setHoverX] = useState(null);

  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  useEffect(() => {
    setActiveIndex(routeActiveIndex);
  }, [routeActiveIndex]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const handleMouseMove = (e) => {
      const rect = nav.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      spotlightX.current = x;
      nav.style.setProperty("--spotlight-x", `${x}px`);
    };

    const handleMouseLeave = () => {
      setHoverX(null);
      const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
      if (activeItem) {
        const navRect = nav.getBoundingClientRect();
        const itemRect = activeItem.getBoundingClientRect();
        const targetX = itemRect.left - navRect.left + itemRect.width / 2;
        animate(spotlightX.current, targetX, {
          type: "spring",
          stiffness: 200,
          damping: 20,
          onUpdate: (v) => {
            spotlightX.current = v;
            nav.style.setProperty("--spotlight-x", `${v}px`);
          },
        });
      }
    };

    nav.addEventListener("mousemove", handleMouseMove);
    nav.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      nav.removeEventListener("mousemove", handleMouseMove);
      nav.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [activeIndex]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const activeItem = nav.querySelector(`[data-index="${activeIndex}"]`);
    if (!activeItem) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const targetX = itemRect.left - navRect.left + itemRect.width / 2;

    animate(ambienceX.current, targetX, {
      type: "spring",
      stiffness: 200,
      damping: 20,
      onUpdate: (v) => {
        ambienceX.current = v;
        nav.style.setProperty("--ambience-x", `${v}px`);
      },
    });
  }, [activeIndex]);

  return (
    <nav
      ref={navRef}
      className="relative h-12 overflow-hidden rounded-full border border-slate-200/80 bg-white/80 shadow-[0_4px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-300"
      style={{ "--spotlight-color": "rgba(0,0,0,0.07)", "--ambience-color": "rgba(15,23,42,0.85)" }}
    >
      <ul className="relative z-10 flex h-full items-center gap-0 px-2">
        {NAV_ITEMS.map((item, idx) => (
          <li key={item.to} className="relative flex h-full items-center justify-center">
            <Link
              to={item.to}
              data-index={idx}
              onClick={() => setActiveIndex(idx)}
              className={[
                "rounded-full px-6 py-2 text-[0.92rem] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                activeIndex === idx
                  ? "text-slate-950"
                  : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Spotlight follows mouse */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
        style={{
          opacity: hoverX !== null ? 1 : 0,
          background:
            "radial-gradient(120px circle at var(--spotlight-x) 100%, var(--spotlight-color) 0%, transparent 50%)",
        }}
      />

      {/* Active ambience bar */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 z-[2] h-[2px] w-full"
        style={{
          background:
            "radial-gradient(60px circle at var(--ambience-x) 0%, var(--ambience-color) 0%, transparent 100%)",
        }}
      />
    </nav>
  );
}

/* ─────────────────────────────────────────────
   MOBILE — Hamburger dropdown menu
───────────────────────────────────────────── */
function MobileMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const routeActiveIndex = useActiveIndex(NAV_ITEMS);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on route change (deferred to avoid synchronous setState in effect)
  const { pathname } = useLocation();
  useEffect(() => {
    const id = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(id);
  }, [pathname]);

  return (
    <div ref={menuRef} className="relative md:hidden">
      {/* Hamburger / X toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"
      >
        <span className="relative flex h-5 w-5 flex-col items-center justify-center gap-[5px]">
          {/* Top bar */}
          <span
            className={[
              "block h-[2px] w-5 rounded-full bg-slate-800 transition-all duration-300 origin-center",
              open ? "translate-y-[7px] rotate-45" : "",
            ].join(" ")}
          />
          {/* Middle bar */}
          <span
            className={[
              "block h-[2px] w-5 rounded-full bg-slate-800 transition-all duration-200",
              open ? "opacity-0 scale-x-0" : "",
            ].join(" ")}
          />
          {/* Bottom bar */}
          <span
            className={[
              "block h-[2px] w-5 rounded-full bg-slate-800 transition-all duration-300 origin-center",
              open ? "-translate-y-[7px] -rotate-45" : "",
            ].join(" ")}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      <div
        className={[
          "absolute right-0 top-[calc(100%+0.6rem)] z-50 w-52 origin-top-right overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 shadow-[0_16px_40px_rgba(15,23,42,0.14)] backdrop-blur-md transition-all duration-200",
          open
            ? "scale-100 opacity-100 pointer-events-auto"
            : "scale-95 opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <ul className="flex flex-col py-2">
          {NAV_ITEMS.map((item, idx) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setOpen(false)}
                className={[
                  "flex items-center gap-3 px-5 py-3 text-[0.92rem] font-semibold transition-colors duration-150",
                  routeActiveIndex === idx
                    ? "bg-slate-50 text-slate-950"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                ].join(" ")}
              >
                {/* Active dot indicator */}
                <span
                  className={[
                    "h-1.5 w-1.5 rounded-full transition-all duration-200",
                    routeActiveIndex === idx ? "bg-slate-900 scale-100" : "bg-transparent scale-0",
                  ].join(" ")}
                />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Bottom accent line */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-slate-900/20 to-transparent" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN Navbar
───────────────────────────────────────────── */
function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#F4F5F6]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center px-4 py-3 lg:px-6">

        {/* ── MOBILE: hamburger on LEFT, logo on RIGHT ── */}
        <div className="flex w-full items-center justify-between md:hidden">
          <MobileMenu />
          <Link to="/" className="flex items-center">
            <img
              src={navLogoSrc}
              alt="InSight AI"
              className="h-10 w-auto object-contain"
              decoding="async"
              fetchPriority="high"
            />
          </Link>
        </div>

        {/* ── DESKTOP: logo on LEFT, spotlight nav on RIGHT ── */}
        <div className="hidden w-full items-center justify-between md:flex">
          <Link to="/" className="flex items-center">
            <img
              src={navLogoSrc}
              alt="InSight AI"
              className="h-10 w-auto object-contain"
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <SpotlightNav />
        </div>

      </div>
    </header>
  );
}

export default Navbar;
