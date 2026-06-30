import React, { useState } from "react";
import BiasInsightPreview from "../components/BiasInsightPreview";
import Footer from "../components/Footer";
import HowItWorksSection from "../components/HowItWorksSection";
import Navbar from "../components/Navbar";
import PdfArticleUpload from "../components/PdfArticleUpload";

function SectionBreak() {
  return (
    <div className="bg-[#f8fafc] px-6 py-7 md:px-10 xl:px-16">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <div className="h-px flex-1 bg-slate-200/80" />
        <div className="h-2 w-2 rounded-full border border-slate-300 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)]" />
        <div className="h-px flex-1 bg-slate-200/80" />
      </div>
    </div>
  );
}

function WorkingPage() {
  const [uploadedArticle, setUploadedArticle] = useState(null);

  const handleUploadedArticle = (article) => {
    setUploadedArticle(article);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <main className="pt-24">
        <HowItWorksSection />
        <BiasInsightPreview />
        <SectionBreak />
        <PdfArticleUpload onArticleUploaded={handleUploadedArticle} />
        {uploadedArticle && (
          <div className="mx-auto max-w-7xl px-6 py-8 text-center text-green-600 font-semibold">
            Article "{uploadedArticle.title || 'Uploaded PDF'}" processed successfully!
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default WorkingPage;
