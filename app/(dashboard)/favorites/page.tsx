"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowUpRight } from "lucide-react";
import { formatPrice, apiBaseUrl, withBearerToken } from "@/lib/deals";
import { DealCard } from "@/components/deal-card";
import { DealModal } from "@/components/deal-modal";
import { DealSkeleton } from "@/components/deal-skeleton";
import type { Deal } from "@/lib/deals";

export default function FavoritesPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [favorites, setFavorites] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    async function loadFavorites() {
      if (!isLoaded || !isSignedIn) {
        setLoading(false);
        return;
      }

      try {
        const token = await getToken();
        if (!token || !apiBaseUrl) return;

        const response = await fetch(`${apiBaseUrl}/api/analytics/favourites/details`, {
          headers: withBearerToken(token),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch favorite details");
        }

        const payload = await response.json();
        const data = payload.data ?? [];
        
        // Map data to Deal objects and set isFavorited to true
        setFavorites(data.map((d: any) => ({ ...d, isFavorited: true })));
      } catch (error) {
        console.error("Failed to load favorites:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFavorites();
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="relative z-10 px-4 pb-6 pt-25 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <h1 className="text-3xl font-bold text-white mb-8">My Favorites</h1>
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <DealSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="relative z-10 px-4 pb-6 pt-25 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-7xl text-center">
          <h1 className="text-3xl font-bold text-white mb-4">My Favorites</h1>
          <p className="text-slate-400">Please sign in to view your favorites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 px-4 pb-6 pt-25 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-1 w-12 bg-gradient-to-r from-red-400 to-red-600 rounded-full"></div>
          <h1 className="text-3xl font-bold text-white">My Favorites</h1>
          <div className="h-1 flex-1 bg-gradient-to-r from-red-600 via-red-600/30 to-transparent rounded-full"></div>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white/5 mb-4">
              <svg className="h-10 w-10 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-slate-400 text-lg">You haven&apos;t added any favorites yet.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {favorites.map((deal) => (
              <DealCard 
                key={deal.dealId} 
                deal={deal} 
                onOpen={() => setSelectedDeal(deal)} 
                onFavoriteToggle={(isFav) => {
                  if (!isFav) {
                    setFavorites(prev => prev.filter(f => f.dealId !== deal.dealId));
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
      <DealModal deal={selectedDeal} onClose={() => setSelectedDeal(null)} />
    </div>
  );
}
