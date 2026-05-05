"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { formatPrice, type Deal } from "@/lib/deals";
import { apiBaseUrl } from "@/lib/deals";
import { useAuth } from "@clerk/nextjs";
import { addToFavorites, removeFromFavorites } from "@/lib/favorites";

type DealCardProps = {
  deal: Deal;
  onOpen: () => void;
};

export function DealCard({ deal, onOpen }: DealCardProps) {
  const { getToken, userId } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoadingFav, setIsLoadingFav] = useState(false);

  const handleDealClick = async (dealId: string) => {
    onOpen();
    if (!apiBaseUrl) {
      return;
    }

    try {
      await fetch(`${apiBaseUrl}/api/analytics/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "CLICK_VIEW_DETAIL",
          ...(userId && { userId }),
          dealId: dealId,
          brandSlug: deal.brandSlug,
        }),
      });
    } catch (error) {
      console.error("Failed to track click:", error);
    }
  };

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isLoadingFav) return;

    setIsLoadingFav(true);
    try {
      const token = await getToken();
      
      if (isFavorited) {
        const success = await removeFromFavorites(deal.dealId, userId, token);
        if (success) {
          setIsFavorited(false);
        }
      } else {
        const success = await addToFavorites(deal.dealId, userId, token);
        if (success) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
    } finally {
      setIsLoadingFav(false);
    }
  };

  function cn(...classes: (string | undefined | false)[]): string {
    return classes.filter(Boolean).join(" ");
  }

 return (
    <article className={cn(
      "group relative flex h-[420px] cursor-pointer flex-col overflow-hidden rounded-3xl",
      "bg-[#0f0f0f] border border-white/[0.08]",
      "shadow-lg transition-all duration-500 ease-[cubic-bezier(.22,.68,0,1.2)]",
      "hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.1)]"
    )}>
      <button
        type="button"
        onClick={() => void handleDealClick(deal.dealId)}
        className="flex h-full w-full flex-col text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {/* Image — hero focus, ~72% */}
        <div className="relative flex-[0_0_72%] overflow-hidden bg-white flex items-center justify-center">
          <img
            src={deal.imgUrl}
            alt={deal.title}
            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(.22,.68,0,1.2)] group-hover:scale-[1.06]"
            loading="lazy"
          />
          {/* Subtle bottom gradient for depth */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0" />

          {/* Favorite */}
          <button
  type="button"
  onClick={handleFavoriteToggle}
  disabled={isLoadingFav}
  aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
  className={cn(
    "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-md transition-all duration-200",
    "hover:scale-110 disabled:opacity-50",
    isFavorited
      ? "bg-white/95 shadow-md"
      : "bg-white/75 hover:bg-white/95 shadow-sm"
  )}
>
  <svg
    className={cn(
      "h-4 w-4 transition-all duration-200",
      isFavorited
        ? "fill-red-500 stroke-red-500"
        : "fill-none stroke-gray-900"
    )}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
</button>

          {/* Brand badge — over image, bottom-left */}
          {deal.brandLogoUrl && (
            <div className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl border border-white/40 bg-white/90 p-1.5 shadow-sm backdrop-blur-sm">
              <img
                src={deal.brandLogoUrl}
                alt={deal.brandSlug ?? "brand"}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between px-5 pb-5 pt-4">
          <div>
            <h3 className="truncate text-base font-bold leading-tight tracking-tight text-white">
              {deal.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-[12px] font-medium leading-relaxed text-white/70">
              {deal.description}
            </p>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/60">
                From
              </span>
              <p className="mt-0.5 text-xl font-extrabold leading-none tracking-tight text-white">
                {formatPrice(deal.price)}
              </p>
            </div>

            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900",
                "shadow-md transition-all duration-300 ease-[cubic-bezier(.22,.68,0,1.2)]",
                "group-hover:scale-110 group-hover:rotate-[8deg]"
              )}
            >
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
