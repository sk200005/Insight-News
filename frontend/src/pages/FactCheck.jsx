import React, { useCallback, useEffect, useMemo, useState } from "react";
import api, { API_BASE_URL } from "../api/axios";
import FactCheckCard from "../components/FactCheckCard";
import Navbar from "../components/Navbar";

const topics = [
  { label: "All", value: "" },
  { label: "India", value: "India" },
  { label: "World", value: "World" },
  { label: "Politics", value: "Politics" },
  { label: "Economy", value: "Economy" },
  { label: "War", value: "War" },
  { label: "Technology", value: "Technology" },
  { label: "Health", value: "Health" },
];

const DEFAULT_QUERY = "India";

function getApiErrorMessage(error) {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.code === "ERR_NETWORK") {
    return `Could not connect to the backend at ${API_BASE_URL}.`;
  }

  return error.message || "Unknown error";
}

function FactCheck() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [searchText, setSearchText] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const fetchFactChecks = useCallback(async (query) => {
    const effectiveQuery = String(query || "").trim();

    if (!effectiveQuery) {
      setResults([]);
      setStatusMessage("Enter a search term or select a topic to find fact checks.");
      setHasSearched(false);
      return;
    }

    try {
      setLoading(true);
      setStatusMessage(`Searching fact checks for "${effectiveQuery}"...`);

      const res = await api.get("/fact-check", {
        params: { query: effectiveQuery },
      });

      if (res.data?.success) {
        setResults(res.data.results || []);
        const count = res.data.results?.length || 0;

        setStatusMessage(
          count > 0
            ? `Found ${count} fact check${count !== 1 ? "s" : ""} for "${effectiveQuery}"`
            : `No fact checks found for "${effectiveQuery}". Try a different search term.`
        );
      } else {
        throw new Error(res.data?.error || "Search failed");
      }

      setHasSearched(true);
    } catch (error) {
      console.error("Fact check search error:", error);
      setStatusMessage(getApiErrorMessage(error));
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTopicClick = useCallback(
    (topicValue) => {
      setActiveTopic(topicValue);
      setSearchText("");

      if (topicValue) {
        fetchFactChecks(topicValue);
      } else {
        fetchFactChecks(DEFAULT_QUERY);
      }
    },
    [fetchFactChecks]
  );

  const handleSearchSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const query = searchText.trim();

      if (query) {
        setActiveTopic("");
        fetchFactChecks(query);
      }
    },
    [searchText, fetchFactChecks]
  );

  // Load default results on mount
  useEffect(() => {
    fetchFactChecks(DEFAULT_QUERY);
  }, [fetchFactChecks]);

  const resultCountLabel = useMemo(
    () =>
      results.length > 0
        ? `${results.length} fact check${results.length !== 1 ? "s" : ""} shown`
        : "",
    [results.length]
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#374e68_0%,#425a75_45%,#4d6784_100%)]">
      <Navbar />

      <div className="w-full px-3 pb-20 pt-4 sm:px-6 md:px-10 xl:px-16 space-y-4 sm:space-y-5">

        {/* ── Control Panel ── */}
        <div className="rounded-xl sm:rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden">

          {/* Top accent bar */}
          <div className="h-[2px] w-full bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.6),transparent)]" />

          <div className="px-3 pt-3 pb-3 sm:px-7 sm:pt-6 sm:pb-5 flex flex-col gap-3 sm:gap-5">

            {/* Row 1: title + search */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-6">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.28em] sm:tracking-[0.32em] text-amber-300/70">
                  Fact Check Dashboard
                </p>
                <h1 className="mt-1 sm:mt-1.5 text-xl sm:text-3xl font-semibold tracking-tight text-white">
                  {statusMessage ? (
                    <span className="text-sm sm:text-base font-normal text-slate-300">
                      {statusMessage}
                    </span>
                  ) : (
                    "Search · Verify · Trust"
                  )}
                </h1>
                {resultCountLabel && (
                  <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm font-medium text-amber-300/80">
                    {resultCountLabel}
                  </p>
                )}
              </div>

              {/* Search form */}
              <form
                onSubmit={handleSearchSubmit}
                className="flex shrink-0 items-center gap-2"
              >
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search claims..."
                  className="rounded-lg sm:rounded-xl border border-white/[0.12] bg-[rgba(0,0,0,0.25)] px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium text-white placeholder-slate-400 outline-none transition focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/30 w-40 sm:w-56"
                />
                <button
                  type="submit"
                  disabled={loading || !searchText.trim()}
                  className="flex items-center gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3.5 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold uppercase tracking-[0.10em] text-white shadow-[0_4px_20px_rgba(245,158,11,0.45)] transition-all duration-200 hover:from-amber-400 hover:to-orange-400 hover:shadow-[0_6px_28px_rgba(245,158,11,0.6)] hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  )}
                  Search
                </button>
              </form>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-white/[0.07]" />

            {/* Row 2: topic chips */}
            <div className="flex flex-col gap-2 sm:gap-4 sm:flex-row sm:items-center">
              <div className="inline-flex flex-wrap items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-white/[0.08] bg-white/[0.04] p-0.5 sm:p-1">
                {topics.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleTopicClick(item.value)}
                    disabled={loading}
                    className={`rounded-md sm:rounded-lg px-2 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-sm font-semibold tracking-wide transition-all duration-200 ${
                      activeTopic === item.value
                        ? "bg-[rgba(251,191,36,0.18)] text-amber-200 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]"
                        : "text-slate-400 hover:text-slate-200"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && results.length === 0 && (
          <section className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.06] p-8"
              >
                <div className="flex flex-col sm:flex-row gap-6">
                  <div className="h-32 w-full sm:w-72 rounded-xl bg-white/[0.08]" />
                  <div className="flex-1 space-y-4">
                    <div className="h-6 w-3/4 rounded bg-white/[0.08]" />
                    <div className="h-4 w-1/2 rounded bg-white/[0.06]" />
                    <div className="h-4 w-full rounded bg-white/[0.05]" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── Results ── */}
        {!loading && (
          <section className="space-y-4">
            {results.length > 0 ? (
              results.map((factCheck) => (
                <FactCheckCard key={factCheck.id} factCheck={factCheck} />
              ))
            ) : hasSearched ? (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-6 py-10 text-center text-sm text-slate-400">
                No fact checks found. Try a different search term or topic.
              </div>
            ) : null}
          </section>
        )}

      </div>
    </div>
  );
}

export default FactCheck;
