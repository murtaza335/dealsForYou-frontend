"use client";

import { formatPrice, type Deal } from "@/lib/deals";
import { apiBaseUrl } from "@/lib/deals";
import { withBearerToken } from "@/lib/deals";
import { useAuth } from "@clerk/nextjs";

type DealCardProps = {
  deal: Deal;
  onOpen: () => void;
};

export function DealCard({ deal, onOpen }: DealCardProps) {
  const { getToken, userId } = useAuth();

  const handleDealClick = async (dealId: string) => {
    onOpen();
    if (!apiBaseUrl) {
      return;
    }

    try {
      const token = await getToken();
      await fetch(`${apiBaseUrl}/api/analytics/event`, {
        method: "POST",
        headers: withBearerToken(token, {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          eventType: "CLICK_VIEW_DETAIL",
          userId: userId,
          dealId: dealId,
          brandSlug: deal.brandSlug,
        }),
      });
    } catch (error) {
      console.error("Failed to track click:", error);
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/50 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-200/50">
      <button type="button" onClick={() => void handleDealClick(deal.dealId)} className="block w-full text-left">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <img
            src={deal.imgUrl}
            alt={deal.title}
            className="h-48 w-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute top-3 left-3 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
            {deal.brandSlug}
          </div>
        </div>
        <div className="p-3">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-red-600 transition-colors duration-200">
              {deal.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600 line-clamp-2">
              {deal.description}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <p className="text-2xl font-bold text-slate-900">
              {formatPrice(deal.price)}
            </p>
            <div className="rounded-full bg-red-500 p-2 text-white transition-transform duration-200 group-hover:scale-110">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </button>
    </article>
  );
}
