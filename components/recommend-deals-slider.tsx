"use client";

import { useRef, type WheelEvent } from "react";
import { DealCard } from "@/components/deal-card";
import { DealSkeleton } from "@/components/deal-skeleton";
import { type Deal } from "@/lib/deals";

interface RecommendDealsSliderProps {
  isSignedIn: boolean;
  loading: boolean;
  deals: Deal[];
  onDealOpen: (deal: Deal) => void;
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
    return null;
  }

  if (items.length === 0) {
    return <p className="mt-2 text-sm text-slate-400">{emptyText}</p>;
  }

  return null;
}

export function RecommendDealsSlider({
  isSignedIn,
  loading,
  deals,
  onDealOpen,
}: RecommendDealsSliderProps) {
  const showSkeleton = loading && deals.length === 0;
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const handleWheelScroll = (event: WheelEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    container.scrollLeft += event.deltaY;
  };

  const scrollByAmount = (distance: number) => {
    sliderRef.current?.scrollBy({ left: distance, behavior: "smooth" });
  };

  const skeletonCards = Array.from({ length: 4 });

  return (
    <section className="py-6 sm:py-8">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
  <div>
    {/* <div className="mb-2 flex items-center gap-2">
      <span className="h-px w-4 bg-amber-400" />
      <p
        style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.2em" }}
        className="text-[11px] font-bold uppercase text-amber-400"
      >
        Recommended
      </p>
    </div> */}

    <h2
      style={{
        fontFamily: "'Georgia', serif",
        lineHeight: 1.15,
        letterSpacing: "-0.01em",
      }}
      className="text-2xl font-bold text-white sm:text-3xl"
    >
      We think you'll{" "}
      <span
        style={{
          fontFamily: "'Georgia', serif",
          fontStyle: "italic",
          background: "linear-gradient(90deg, #f59e0b, #fb923c)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        love these.
      </span>{" "}
    </h2>
  </div>

  {!isSignedIn && (
    <span
      style={{ fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}
      className="w-fit rounded-full border border-amber-400/40 bg-amber-900/20 px-3 py-1.5 text-[10px] font-bold uppercase text-amber-300"
    >
      Sign in to unlock
    </span>
  )}
</div>

      {/* <SectionEmptyState
        loading={showSkeleton}
        items={deals}
        emptyText="No recommendations yet."
      /> */}

      <div className="relative mt-4 min-h-[340px] sm:min-h-[420px]">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-black/70 via-black/35 to-transparent backdrop-blur-[1px] sm:w-14 lg:w-20" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-black/70 via-black/35 to-transparent backdrop-blur-[1px] sm:w-14 lg:w-20" />

        {!showSkeleton && (
          <button
            type="button"
            onClick={() => scrollByAmount(-360)}
            className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-transparent p-2 text-white/90 transition hover:border-white/60 hover:text-white sm:flex"
            aria-label="Scroll recommended deals left"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div
          ref={sliderRef}
          onWheel={handleWheelScroll}
          className="mx-4 flex gap-4 overflow-x-auto overflow-y-hidden scroll-smooth sm:mx-8 sm:gap-5 lg:mx-10 lg:gap-6 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {showSkeleton
            ? skeletonCards.map((_, index) => (
                <div key={index} className="w-[240px] shrink-0 sm:w-[280px] lg:w-[320px]">
                  <DealSkeleton />
                </div>
              ))
            : deals.map((deal) => (
                <div key={deal.externalId} className="w-[240px] shrink-0 sm:w-[280px] lg:w-[320px]">
                  <DealCard deal={deal} onOpen={() => onDealOpen(deal)} />
                </div>
              ))}
        </div>

        {!showSkeleton && (
          <button
            type="button"
            onClick={() => scrollByAmount(360)}
            className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-transparent p-2 text-white/90 transition hover:border-white/60 hover:text-white sm:flex"
            aria-label="Scroll recommended deals right"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>
    </section>
  );
}
