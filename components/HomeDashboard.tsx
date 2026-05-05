"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DealModal } from "@/components/deal-modal";
import {
  apiBaseUrl,
  withBearerToken,
  type ApiResponse,
  type Deal,
} from "@/lib/deals";
import { HomeSlider } from "@/components/home_slider";
import { RecommendDealsSlider } from "@/components/recommend-deals-slider";
import { HotDealsSlider } from "@/components/hot-deals-slider";
import { JoinAsBrandSection } from "./join-as-brand-section";
import { LoginToPersonalizeSection } from "./login-to-personalize-section";

const RECOMMENDED_DEALS_LIMIT = 12;

export function HomeDashboard() {
  const { user } = useUser();
  const { isSignedIn, getToken } = useAuth();
  const userId = user?.id;

  const [recommendedDeals, setRecommendedDeals] = useState<Deal[]>([]);
  const [topDeals, setTopDeals] = useState<Deal[]>([]);

  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [loadingTop, setLoadingTop] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);


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
        `${apiBaseUrl}/api/deals/recommended?userId=${encodeURIComponent(userId)}&limit=${RECOMMENDED_DEALS_LIMIT}`,
        {
          headers: withBearerToken(token),
        }
      );

      if (!response.ok) {
        throw new Error("Could not fetch recommended deals.");
      }

      const payload: ApiResponse = await response.json();
      setRecommendedDeals(payload.data ?? []);
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
      const response = await fetch(`${apiBaseUrl}/api/analytics/trending/deals`);
      if (!response.ok) {
        throw new Error("Could not fetch top deals.");
      }

      const payload: ApiResponse = await response.json();
      console.log("Top deals:", payload.data);
      setTopDeals(payload.data ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
      setTopDeals([]);
    } finally {
      setLoadingTop(false);
    }
  }, []);

  useEffect(() => {

    const timer = setTimeout(() => {
      void fetchRecommendedDeals();
      void fetchTopDeals();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchRecommendedDeals, fetchTopDeals]);

  const images = ['https://res.cloudinary.com/durv0rf9u/image/upload/v1777748574/banner1_ptoawz.png', 'https://res.cloudinary.com/durv0rf9u/image/upload/v1777748573/banner2_grh4tn.png', 'https://res.cloudinary.com/durv0rf9u/image/upload/v1777749246/banner3_wjdqp2.png']



  return (
    <>
      <div>
        <HomeSlider images={images} />
      </div>
      <div className="relative z-10 w-full px-4 pb-8 pt-24 sm:px-6 sm:pb-10 sm:pt-28 lg:px-8 lg:pt-32">
        <div className="w-full max-w-none space-y-12 lg:space-y-16">



          <HotDealsSlider
            loading={loadingTop}
            deals={topDeals}
            onDealOpen={setSelectedDeal}
          />

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

          {isSignedIn && <RecommendDealsSlider
            isSignedIn={isSignedIn ?? false}
            loading={loadingRecommended}
            deals={recommendedDeals}
            onDealOpen={setSelectedDeal}
          />}

          {!isSignedIn && <LoginToPersonalizeSection />}

          <JoinAsBrandSection></JoinAsBrandSection>

        </div>
        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
      </div>
    </>
  );
}
