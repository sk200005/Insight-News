import React from "react";

const publisherLogos = [
  { label: "Politics", src: "/homeLogo/image.png" },
  { label: "Sports", src: "/homeLogo/image copy.png" },
  { label: "Technology", src: "/homeLogo/image copy 2.png" },
  { label: "Stocks", src: "/homeLogo/image copy 3.png" },
  { label: "War", src: "/homeLogo/image copy 4.png" },
  { label: "Economy", src: "/homeLogo/image copy 5.png" },
  { label: "Entertainment", src: "/homeLogo/image copy 6.png" },
  { label: "Local News", src: "/homeLogo/image copy 7.png" },
  { label: "World Affairs", src: "/homeLogo/image copy 8.png" },
];

function PublisherSection() {
  return (
    <section
      id="about"
      className="deferred-section bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_22%,#ffffff_100%)] pt-20 pb-24 sm:pt-24 sm:pb-28"
    >
      <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
        <div className="max-w-xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-sky-700">
            InSight News
          </p>

          <h2 className="mt-5 text-4xl font-black uppercase leading-tight text-slate-950 sm:text-5xl">
            Different sources one destination
          </h2>

          <p className="mt-6 text-lg leading-8 text-slate-600">
            InSight AI transforms complex news streams into clear, digestible 
            insights through automated summarization, bias detection, and topic categorization. 
            It helps readers quickly understand key stories while maintaining awareness of perspective 
            and context.
          </p>

          <button className="mt-9 rounded-full border border-slate-900 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-slate-900 transition hover:bg-slate-900 hover:text-white">
            My Feed
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
          {publisherLogos.map((publisher) => (
            <div
              key={publisher.label}
              className="flex aspect-square items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
            >
              <img
                src={publisher.src}
                alt={publisher.label}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PublisherSection;
