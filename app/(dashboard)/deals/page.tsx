import { Suspense } from "react";
import { DealsDashboard } from "@/components/deals-dashboard";

export default function DealsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white/50">Loading deals...</div>}>
      <DealsDashboard />
    </Suspense>
  );
}
