"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DealModal } from "@/components/deal-modal";
import {
  apiBaseUrl,
  buildQuery,
  withBearerToken,
  type ApiResponse,
  type Deal,
  type DealsPagination,
} from "@/lib/deals";
import { HomeSlider } from "@/components/home_slider";
import { RecommendDealsSlider } from "@/components/recommend-deals-slider";
import { HotDealsSlider } from "@/components/hot-deals-slider";
import { JoinAsBrandSection } from "./join-as-brand-section";
import { LoginToPersonalizeSection } from "./login-to-personalize-section";

const RECOMMENDED_DEALS_PAGE_SIZE = 4;
const RECOMMENDED_DEALS_FETCH_LIMIT = 12;
const TOP_DEALS_PAGE_SIZE = 8;

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

export function HomeDashboard() {
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const userId = user?.id;

  const [recommendedDeals, setRecommendedDeals] = useState<Deal[]>([]);
  const [topDeals, setTopDeals] = useState<Deal[]>([]);
  const [topDealsPagination, setTopDealsPagination] = useState<DealsPagination | null>(null);

  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [recommendedPage, setRecommendedPage] = useState(1);
  const [topDealsPage, setTopDealsPage] = useState(1);


  const fetchRecommendedDeals = useCallback(async () => {
    if (!userId) {
      setRecommendedDeals([]);
      return;
    }

    setLoadingRecommended(true);
    setErrorMessage(null);

    try {
      const token = await getToken();
      console.log(token)
      const response = await fetch(
        `${apiBaseUrl}/api/deals/recommended?userId=${encodeURIComponent(userId)}&limit=${RECOMMENDED_DEALS_FETCH_LIMIT}`,
        {
          headers: withBearerToken(token),
        }
      );

      if (!response.ok) {
        throw new Error("Could not fetch recommended deals.");
      }

      const payload: ApiResponse = await response.json();
      setRecommendedDeals(payload.data ?? []);
      setRecommendedPage(1);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
      setRecommendedDeals([]);
    } finally {
      setLoadingRecommended(false);
    }
  }, [userId, getToken]);

  const fetchTopDeals = useCallback(async () => {
    setLoadingTop(true);
    setErrorMessage(null);

    try {
      const queryParam = buildQuery({
        page: String(topDealsPage),
        limit: String(TOP_DEALS_PAGE_SIZE),
      });
      const response = await fetch(`${apiBaseUrl}/api/deals/top?${queryParam}`);
      if (!response.ok) {
        throw new Error("Could not fetch top deals.");
      }

      const payload: ApiResponse = await response.json();
      console.log("Top deals:", payload.data);
      setTopDeals(payload.data ?? []);
      setTopDealsPagination(payload.pagination ?? null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
      setTopDeals([]);
      setTopDealsPagination(null);
    } finally {
      setLoadingTop(false);
    }
  }, [topDealsPage]);

  useEffect(() => {
    void fetchRecommendedDeals();
  }, [fetchRecommendedDeals]);

  useEffect(() => {
    void fetchTopDeals();
  }, [fetchTopDeals]);

  const recommendedTotalPages = Math.max(
    1,
    Math.ceil(recommendedDeals.length / RECOMMENDED_DEALS_PAGE_SIZE)
  );
  const recommendedPageDeals = recommendedDeals.slice(
    (recommendedPage - 1) * RECOMMENDED_DEALS_PAGE_SIZE,
    recommendedPage * RECOMMENDED_DEALS_PAGE_SIZE
  );

  const topDealsTotalPages = Math.max(1, topDealsPagination?.totalPages ?? 1);

  useEffect(() => {
    if (recommendedPage > recommendedTotalPages) {
      setRecommendedPage(recommendedTotalPages);
    }
  }, [recommendedPage, recommendedTotalPages]);

  useEffect(() => {
    if (topDealsPage > topDealsTotalPages) {
      setTopDealsPage(topDealsTotalPages);
    }
  }, [topDealsPage, topDealsTotalPages]);

  const images = ['https://res.cloudinary.com/durv0rf9u/image/upload/v1777748574/banner1_ptoawz.png', 'https://res.cloudinary.com/durv0rf9u/image/upload/v1777748573/banner2_grh4tn.png', 'https://res.cloudinary.com/durv0rf9u/image/upload/v1777749246/banner3_wjdqp2.png']



  return (
    <>
      <div>
        <HomeSlider images={images} />
      </div>
      <div className="relative z-10 w-full px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="w-full max-w-none space-y-12 lg:space-y-16">



          <HotDealsSlider
            key={`top-${topDealsPage}`}
            loading={loadingTop}
            deals={topDeals}
            onDealOpen={setSelectedDeal}
          />

          {/* {topDealsPagination && topDealsPagination.totalPages > 1 && (
            <PaginationControls
              label="Top deals"
              page={topDealsPage}
              totalPages={topDealsTotalPages}
              onPageChange={setTopDealsPage}
            />
          )} */}

          <div className="flex justify-center pt-2">
            <Link
              href="/deals"
              className="group inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 px-4 py-2.5 text-xs font-semibold text-black shadow-lg shadow-amber-500/20 transition duration-300 hover:-translate-y-0.5 hover:shadow-amber-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:px-6 sm:py-3 sm:text-sm"
              aria-label="Dive deeper into deals"
            >
              {/* Pizza icon */}
              <span className="relative inline-flex items-center justify-center">
                <span className="text-base transition-transform duration-500 group-hover:-translate-y-1 group-hover:rotate-180">
                  🍕
                </span>
                {/* subtle glow pulse */}
                <span className="absolute inset-0 rounded-full bg-amber-300/30 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </span>

              <span>Explore All Deals</span>

              <svg
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M7.5 5.5L12 10l-4.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {isSignedIn && (
            <>
              <RecommendDealsSlider
                key={`recommended-${recommendedPage}`}
                isSignedIn={isSignedIn ?? false}
                loading={loadingRecommended}
                deals={recommendedPageDeals}
                onDealOpen={setSelectedDeal}
              />
              {recommendedTotalPages > 1 && !loadingRecommended && (
                <PaginationControls
                  label="Recommended deals"
                  page={recommendedPage}
                  totalPages={recommendedTotalPages}
                  onPageChange={setRecommendedPage}
                />
              )}
            </>
          )}

          {!isSignedIn && <LoginToPersonalizeSection />}

          <JoinAsBrandSection></JoinAsBrandSection>

        </div>
        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      </div>
    </>
  );
}
