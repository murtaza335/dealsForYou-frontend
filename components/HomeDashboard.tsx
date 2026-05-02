"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { DealCard } from "@/components/deal-card";
import { DealModal } from "@/components/deal-modal";
import {
  apiBaseUrl,
  withBearerToken,
  type ApiResponse,
  type Deal,
} from "@/lib/deals";

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
    return <p className="mt-4 text-sm text-slate-500">Loading...</p>;
  }

  if (items.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">{emptyText}</p>;
  }

  return null;
}



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
      const response = await fetch(
        `${apiBaseUrl}/api/deals/recommended?userId=${encodeURIComponent(userId)}&limit=6`,
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
      const token = await getToken();
      const response = await fetch(`${apiBaseUrl}/api/analytics/trending/deals`, {
        headers: withBearerToken(token),
      });
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
  }, [getToken]);

  useEffect(() => {
    if (!isSignedIn) {
      return;
    }

    const timer = setTimeout(() => {
      void fetchRecommendedDeals();
      void fetchTopDeals();
    }, 0);

    return () => clearTimeout(timer);
  }, [isSignedIn, fetchRecommendedDeals, fetchTopDeals]);



  return (
    <div className="relative z-10 px-4 pb-6 pt-25 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">

        {errorMessage ? (
            <p className="mt-6 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
            </p>
        ) : null}

        <section className="mt-6">
            <div className="flex items-center justify-between gap-4">
            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">Recommended</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-yellow-500">Deals matched to your activity</h2>
            </div>
            {!isSignedIn ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Sign in required
                </span>
            ) : null}
            </div>

            <SectionEmptyState loading={loadingRecommended} items={recommendedDeals} emptyText="No recommendations yet." />
            <div className="mt-8 grid gap-16 sm:grid-cols-2 xl:grid-cols-3">
            {recommendedDeals.map((deal) => (
                <DealCard key={deal.externalId} deal={deal} onOpen={() => setSelectedDeal(deal)} />
            ))}
            </div>
        </section>

        <section className="mt-6">
            <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow-500">Top deals</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-yellow-500">Popular picks right now</h2>
            </div>

            <SectionEmptyState loading={loadingTop} items={topDeals} emptyText="No top deals available." />
            <div className="mt-8 grid gap-16 sm:grid-cols-2 xl:grid-cols-3">
            {topDeals.map((deal) => (
                <DealCard key={deal.externalId} deal={deal} onOpen={() => setSelectedDeal(deal)} />
            ))}
            </div>
        </section>
        </div>
        <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}