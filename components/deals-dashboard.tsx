"use client";

import Image from "next/image";
import { UserButton, SignUpButton, useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { DealCard } from "@/components/deal-card";
import { DealModal } from "@/components/deal-modal";
import { DealSkeleton } from "@/components/deal-skeleton";
import {
  apiBaseUrl,
  buildQuery,
  recommendationBaseUrl,
  withBearerToken,
  type ApiResponse,
  type Deal,
  type DealsPagination,
} from "@/lib/deals";
import { motion, AnimatePresence } from "framer-motion";
import { HomeSlider } from "./home_slider";

const FILTERED_DEALS_PAGE_SIZE = 20;

const buildPageItems = (page: number, totalPages: number) => {
  const pages = new Set<number>();
  const safeTotal = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotal);

  if (safeTotal <= 5) {
    for (let i = 1; i <= safeTotal; i += 1) {
      pages.add(i);
    }
  } else {
    pages.add(1);
    pages.add(safeTotal);
    pages.add(safePage);
    pages.add(safePage - 1);
    pages.add(safePage + 1);
  }

  const sorted = [...pages].filter((item) => item >= 1 && item <= safeTotal).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  sorted.forEach((value, index) => {
    const previous = sorted[index - 1];
    if (previous && value - previous > 1) {
      items.push("ellipsis");
    }
    items.push(value);
  });

  return items;
};

function PaginationControls({
  label,
  page,
  totalPages,
  onPageChange,
}: Readonly<{
  label: string;
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}>) {
  if (totalPages <= 1) {
    return null;
  }

  const items = buildPageItems(page, totalPages);

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-300 sm:text-sm"
      aria-label={`${label} pagination`}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-300/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
      >
        Prev
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${index}`} className="px-2 text-white/40">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={`min-w-[32px] rounded-full border px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
              item === page
                ? "border-amber-300/80 bg-amber-400/20 text-amber-200"
                : "border-white/15 text-white/70 hover:border-amber-300/60 hover:text-white"
            }`}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:border-amber-300/60 hover:text-white disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/30"
      >
        Next
      </button>

      <span className="ml-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
        Page {page} of {totalPages}
      </span>
    </nav>
  );
}

function SectionEmptyState({
  loading,
  items,
  emptyText,
}: Readonly<{
  loading: boolean;
  items: Deal[];
  emptyText: string;
}>) {
  if (loading) {
    return (
      <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <DealSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return null;
}

export function DealsDashboard() {
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const userId = user?.id;

  const [brand, setBrand] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [query, setQuery] = useState("");

  const [filteredDeals, setFilteredDeals] = useState<Deal[]>([]);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filteredPage, setFilteredPage] = useState(1);
  const [filteredPagination, setFilteredPagination] = useState<DealsPagination | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [brandsList, setBrandsList] = useState<{ name: string }[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const fetchFilteredDeals = useCallback(async (pageOverride?: number) => {
    const pageToUse = pageOverride ?? filteredPage;
    setLoadingFiltered(true);
    setErrorMessage(null);

    try {
      const queryParam = buildQuery({
        maxPrice,
        query,
        brand,
        page: String(pageToUse),
        limit: String(FILTERED_DEALS_PAGE_SIZE),
      });

      const response = await fetch(`${apiBaseUrl}/api/deals/filtered?${queryParam}`);
      if (!response.ok) {
        throw new Error("Could not fetch filtered deals.");
      }

      const payload: ApiResponse = await response.json();
      console.log("Fetched deals:", payload.data);
      const fetchedDeals = payload.data ?? [];
      setFilteredDeals(fetchedDeals);
      setFilteredPagination(payload.pagination ?? null);
      setFilteredPage(pageToUse);

      if (query.trim()) {
        fetch(`${apiBaseUrl}/api/analytics/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "SEARCH_QUERY",
            ...(userId && { userId }),
            dealId: fetchedDeals.map((d: Deal) => d.dealId).join(","),
            brandSlug: fetchedDeals.map((d: Deal) => d.brandSlug).join(","),
            queryText: query,
          }),
        }).catch((err) => console.error("Failed to track search event:", err));
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
      setFilteredDeals([]);
      setFilteredPagination(null);
    } finally {
      setLoadingFiltered(false);
    }
  }, [brand, filteredPage, maxPrice, query]);

  const fetchBrands = useCallback(async () => {
    try {

      const response = await fetch(`${apiBaseUrl}/api/deals/filters/brands`);
      if (!response.ok) {
        throw new Error("Could not fetch brands.");
      }

      const payload = await response.json();
      console.log("Fetched brands:", payload.data);
      setBrandsList(payload.data ?? []);
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  }, []);

  useEffect(() => {
    void fetchFilteredDeals(1);
  }, []);

  useEffect(() => {
    void fetchBrands();
  }, []);

  const onFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void fetchFilteredDeals(1);
  };

  const filteredTotalPages = Math.max(1, filteredPagination?.totalPages ?? 1);

  useEffect(() => {
    if (filteredPagination && filteredPage > filteredTotalPages) {
      void fetchFilteredDeals(filteredTotalPages);
    }
  }, [filteredPage, filteredPagination, filteredTotalPages, fetchFilteredDeals]);








  return (
    <>
    
    <div className="relative z-10 min-h-screen px-6 pb-6 pt-25 sm:px-8 md:px-12 lg:px-16 xl:px-20">
      <div className="mx-auto w-full max-w-7xl">

        {errorMessage ? (
          <p className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-8">
          <div className="relative">

            {/* container for both */}
            <motion.div
              layout
              className="flex items-center mb-4"
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* all deal heading */}
              {!isExpanded && (
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-1 w-12 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"></div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full whitespace-nowrap">
                    All deals
                  </p>
                  <div className="h-1 flex-1 bg-gradient-to-r from-yellow-600 via-yellow-600/30 to-transparent rounded-full"></div>
                </div>
              )}

              {/* the search bar*/}
              <motion.div
                layout
                transition={{
                  duration: 0.6,
                  ease: [0.25, 0.46, 0.45, 0.94],
                  layout: {
                    duration: 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94]
                  }
                }}
                className={`flex items-center gap-3 px-6 py-3 rounded-full border text-white text-base font-semibold cursor-pointer h-12 ml-4
                  ${isExpanded
                    ? "flex-1 bg-slate-900 border-yellow-400/50"
                    : "w-auto bg-gradient-to-r from-slate-800 to-slate-900 border-slate-700 hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-400/20"
                  }`}
                onClick={() => {
                  if (!isExpanded) setIsExpanded(true);
                }}
              >
                <AnimatePresence mode="wait" initial={false}>

                  {!isExpanded ? (
                    <motion.div
                      key="mood"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex items-center gap-3 whitespace-nowrap"
                    >
                      <svg className="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>What&apos;s your mood?</span>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="search"
                      noValidate
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex items-center w-full gap-2 lg:gap-3"
                      onSubmit={onFilterSubmit}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="h-5 w-5 lg:h-6 lg:w-6 flex-shrink-0 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        autoFocus
                        placeholder="Search deals..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 min-w-[100px] bg-transparent outline-none text-white placeholder-gray-400 h-full resize-none text-sm lg:text-base"
                      />

                      <div className="hidden lg:block h-6 w-px bg-slate-700 mx-1"></div>

                      <select
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="hidden md:block bg-transparent outline-none text-white [&>option]:text-slate-900 cursor-pointer text-sm lg:text-base w-24 lg:w-32"
                      >
                        <option value="">All Brands</option>
                        {brandsList.map((b, i) => (
                          <option key={i} value={b.name}>{b.name}</option>
                        ))}
                      </select>

                      <div className="hidden lg:block h-6 w-px bg-slate-700 mx-1"></div>

                      <div className="hidden sm:flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Max Rs"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          min="0"
                          max="100000"
                          step="500"
                          className="w-20 lg:w-24 bg-transparent outline-none text-white placeholder-gray-400 text-sm lg:text-base"
                        />
                      </div>

                      <button
                        type="submit"
                        className="ml-auto rounded-full bg-yellow-500 px-3 lg:px-4 py-1.5 text-xs lg:text-sm font-bold text-slate-900 hover:bg-yellow-400 transition-colors flex-shrink-0"
                      >
                        Search
                      </button>

                      {/* closing */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsExpanded(false)}
                        className="p-1 ml-1 lg:ml-2 rounded-full hover:bg-white/10 transition-colors duration-200 flex-shrink-0"
                      >
                        <svg className="h-5 w-5 lg:h-6 lg:w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </motion.button>
                    </motion.form>
                  )}

                </AnimatePresence>
              </motion.div>
            </motion.div>

          </div>

          <SectionEmptyState loading={loadingFiltered} items={filteredDeals} emptyText="No deals match this filter." />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.externalId} deal={deal} onOpen={() => setSelectedDeal(deal)} />
            ))}
          </div>
          {filteredPagination && filteredPagination.totalPages > 1 ? (
            <PaginationControls
              label="Filtered deals"
              page={filteredPagination.page ?? filteredPage}
              totalPages={filteredTotalPages}
              onPageChange={(nextPage) => {
                void fetchFilteredDeals(nextPage);
              }}
            />
          ) : null}
        </section>
      </div>
      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
    </>
  );
}