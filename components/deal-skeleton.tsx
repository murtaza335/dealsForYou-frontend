"use client";

type DealSkeletonProps = {
  className?: string;
};

export function DealSkeleton({ className = "" }: DealSkeletonProps) {
  return (
    <div className={`overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0f0f0f] shadow-lg ${className}`}>
      <div className="relative h-[420px] w-full animate-pulse">
        <div className="h-[72%] w-full bg-white/10" />

        <div className="flex h-[28%] flex-col justify-between px-5 pb-5 pt-4">
          <div>
            <div className="h-4 w-4/5 rounded bg-white/10" />
            <div className="mt-3 h-3 w-3/5 rounded bg-white/10" />
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div className="flex flex-col gap-2">
              <div className="h-2.5 w-10 rounded bg-white/10" />
              <div className="h-6 w-20 rounded bg-white/10" />
            </div>

            <div className="h-10 w-10 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </div>
  );
}
