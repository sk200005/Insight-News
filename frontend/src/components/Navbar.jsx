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
  // fallback: longest prefix match
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

function SpotlightNav() {
  const navRef = useRef(null);
  const routeActiveIndex = useActiveIndex(NAV_ITEMS);
  const [activeIndex, setActiveIndex] = useState(routeActiveIndex);
  const [hoverX, setHoverX] = useState(null);

  // Mutable refs so animate() can read & write without re-renders
  const spotlightX = useRef(0);
  const ambienceX = useRef(0);

  // Sync active index with route changes
  useEffect(() => {
    setActiveIndex(routeActiveIndex);
  }, [routeActiveIndex]);

  // Mouse-move / mouse-leave spotlight effect
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

  // Spring-animate the bottom ambience line to the active item
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
      {/* Nav items */}
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

      {/* Moving spotlight that follows the mouse */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] transition-opacity duration-300"
        style={{
          opacity: hoverX !== null ? 1 : 0,
          background:
            "radial-gradient(120px circle at var(--spotlight-x) 100%, var(--spotlight-color) 0%, transparent 50%)",
        }}
      />

      {/* Active-item ambience bar at the bottom */}
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

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#F4F5F6]/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src={navLogoSrc}
            alt="InSight AI"
            className="h-10 w-auto object-contain"
            decoding="async"
            fetchPriority="high"
          />
        </Link>

        {/* Spotlight nav — desktop */}
        <div className="hidden md:block">
          <SpotlightNav />
        </div>

        {/* Mobile pill CTA */}
        <Link
          to="/news"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition hover:bg-slate-800 md:hidden"
        >
          News
        </Link>
      </div>
    </header>
  );
}

export default Navbar;
