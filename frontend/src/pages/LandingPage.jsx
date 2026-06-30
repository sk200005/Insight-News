import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

import Footer from "../components/Footer";
import HeroSection from "../components/HeroSection";
import Navbar from "../components/Navbar";
import NewsCarousel from "../components/NewsCarousel";
import Skiper39 from "../components/CrowdCanvas";

// SectionBreak removed as it's no longer used here

function LandingPage() {
  const [latestNews, setLatestNews] = useState([]);

  useEffect(() => {
    const loadLatestNews = async () => {
      try {
        const response = await api.get("/news");
        setLatestNews(response.data);
      } catch (error) {
        console.error("Error loading latest news for homepage:", error);
      }
    };

    loadLatestNews();
  }, []);

  const latestNewsItems = useMemo(
    () =>
      [...latestNews]
        .filter((article) => article.title?.trim() && (article.image || article.isUserUploaded))
        .sort(
          (firstArticle, secondArticle) =>
            new Date(secondArticle.createdAt || secondArticle.publishedAt || 0).getTime() -
            new Date(firstArticle.createdAt || firstArticle.publishedAt || 0).getTime()
        )
        .slice(0, 8),
    [latestNews]
  );

  // handleUploadedArticle removed

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <main>
        <HeroSection />
        <NewsCarousel news={latestNewsItems} />
        <Skiper39 />
      </main>
      <Footer />
    </div>
  );
}

export default LandingPage;
