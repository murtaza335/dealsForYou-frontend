"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { formatPrice, type Deal, apiBaseUrl, withBearerToken } from "@/lib/deals";
import { useAuth } from "@clerk/nextjs";

type DealModalProps = {
  deal: Deal | null;
  onClose: () => void;
};

export function DealModal({ deal, onClose }: DealModalProps) {
  const { userId } = useAuth();

  const handleGetDealClick = async () => {
    if (!deal || !deal.baseUrl || !apiBaseUrl) return;

    try {
      await fetch(`${apiBaseUrl}/api/analytics/event`, {
        method: "POST",
        headers:{
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: "EXTERNAL_LINK",
          ...(userId && { userId }),
          dealId: deal.dealId,
          brandSlug: deal.brandSlug,
        }),
      });
    } catch (error) {
      console.error("Failed to track external link click:", error);
    }
  };

  useEffect(() => {
    if (!deal) {
      return;
    }

    const scrollY = window.scrollY;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyLeft = document.body.style.left;
    const originalBodyRight = document.body.style.right;
    const originalBodyWidth = document.body.style.width;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.left = originalBodyLeft;
      document.body.style.right = originalBodyRight;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
    };
  }, [deal]);

  if (typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {deal && (
        <div key="deal-modal-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
          <motion.div
            key="deal-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            key="deal-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-50 flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Mobile */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/80 p-2 text-slate-600 shadow-sm backdrop-blur-md transition-colors hover:bg-white hover:text-slate-900 md:hidden"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image Section */}
            <div className="relative flex h-64 w-full flex-shrink-0 items-center justify-center bg-slate-100 p-6 md:h-auto md:w-2/5">
              <img src={deal.imgUrl} alt={deal.title} className="max-h-full max-w-full object-contain drop-shadow-xl" />
              <div className="absolute left-4 top-4 hidden md:block">
                <div className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-bold text-white shadow-lg">
                  {deal.brandSlug}
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="flex flex-1 flex-col overflow-y-auto p-6 sm:p-8">
              {/* Close Button - Desktop */}
              <button
                onClick={onClose}
                className="absolute right-6 top-6 hidden rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 md:block"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="mb-4 md:hidden">
                <div className="inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
                  {deal.brandSlug}
                </div>
              </div>

              <h2 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl lg:text-4xl">{deal.title}</h2>
              <p className="mb-6 text-3xl font-extrabold text-red-600 sm:text-4xl">{formatPrice(deal.price)}</p>

              <div className="mb-8 flex-1 rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  About this deal
                </h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{deal.description}</p>
              </div>

              <div className="mt-auto pt-4">
                <a
                  href={deal.baseUrl || "#"}
                  target={deal.baseUrl ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="group flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-8 py-4 text-center text-lg font-bold text-white shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40 active:translate-y-0"
                  onClick={(e) => {
                    if (!deal.baseUrl) {
                      e.preventDefault();
                      alert("Deal link not available");
                    } else {
                      void handleGetDealClick();
                    }
                  }}
                >
                  <span>Get the Deal</span>
                  <svg className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </a>
                {!deal.baseUrl && (
                  <p className="mt-2 text-center text-xs text-slate-400">Link not provided by API</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
