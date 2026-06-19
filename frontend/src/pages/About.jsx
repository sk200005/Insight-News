import React from "react";
import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import PublisherSection from "../components/PublisherSection";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');

  .about-hero-title { font-family: 'Playfair Display', Georgia, serif; }

  .dev-card { transition: transform 0.28s ease, box-shadow 0.28s ease; }
  .dev-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,0.10) !important; }
`;

const developer = {
  name: "Swayam Korde",
  role: "FullStack & AI/ML Developer",
  email: "swayamkorde2005@gmail.com",
  img: "/swayam_photo.png",
  accent: "#0ea5e9",
  bg: "#f0f9ff",
  border: "#bae6fd",
};

function About() {
  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#0f172a_0%,#1e293b_55%,#0f172a_100%)] text-white">
      <style>{styles}</style>
      <Navbar />

      <main>
        <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-28 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-96 opacity-30"
            style={{
              background:
                "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(125,211,252,0.35) 0%, transparent 70%)",
            }}
          />
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-[#7fc6ff]/60">
            Introducing
          </p>
          <h1 className="about-hero-title text-[clamp(4rem,12vw,9rem)] font-black italic leading-none tracking-tight text-white drop-shadow-[0_2px_40px_rgba(125,211,252,0.25)]">
            InSight News
          </h1>
          <p className="about-hero-title mt-5 text-[clamp(1rem,2.8vw,1.6rem)] font-bold italic tracking-[0.04em] text-[#7fc6ff]/75">
            Beyond the headline.
          </p>
          <div className="mt-14 h-px w-24 bg-gradient-to-r from-transparent via-[rgba(125,211,252,0.4)] to-transparent" />
        </section>

        <div className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
          <PublisherSection />
        </div>

        <section className="bg-white px-6 pb-24 pt-4 md:px-10 xl:px-16">
          <div className="mx-auto mb-14 max-w-5xl border-t border-slate-100" />

          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-500">
              The team
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
              Meet the Developers
            </h2>
            <p className="mt-3 text-base text-slate-500">
              Built with purpose by a developer who cares about informed reading.
            </p>
          </div>

          <div className="mx-auto flex justify-center max-w-sm">
            <div
              className="dev-card flex flex-col items-center rounded-2xl p-8 text-center w-full"
              style={{
                background: developer.bg,
                border: `1px solid ${developer.border}`,
                boxShadow: "0 4px 18px rgba(0,0,0,0.05)",
              }}
            >
              <div
                className="mb-6 h-44 w-44 overflow-hidden rounded-full shadow-md"
                style={{ border: `3px solid ${developer.border}` }}
              >
                <img
                  src={developer.img}
                  alt={`${developer.name} - ${developer.role}`}
                  className="h-full w-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <h3 className="text-xl font-black tracking-tight text-slate-900">
                {developer.name}
              </h3>

              <span
                className="mt-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em]"
                style={{ background: developer.border, color: developer.accent }}
              >
                {developer.role}
              </span>

              <a
                href={`mailto:${developer.email}`}
                className="mt-4 text-sm font-medium transition-colors hover:underline"
                style={{ color: developer.accent }}
              >
                {developer.email}
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default About;
