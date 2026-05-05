"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl, authHeaders, formatPrice, readJsonResponse, type BrandProfile, type Deal } from "@/lib/deals";
import { FoodBackground } from "@/components/food-background";


type BrandDetails = BrandProfile & {
  country?: string;
  tagline?: string;
  description?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  socials?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
};

const formatList = (items?: string[]) => {
  if (!items?.length) return "Not provided";
  return items.join(", ");
};

const formatDate = (value?: string) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getDealImage = (deal: Deal) => deal.imgUrl || "/next.svg";

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const classes = {
    neutral: "border-white/10 bg-white/5 text-slate-300",
    good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    warn: "border-yellow-500/30 bg-yellow-500/10 text-yellow-200",
    danger: "border-red-500/30 bg-red-500/10 text-red-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${classes[tone]}`}>
      {children}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#151515] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[#1f1f1f] shadow-lg shadow-black/20">
      <div className="flex h-44 items-center justify-center bg-[#151515]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getDealImage(deal)} alt={deal.title} className="h-full w-full object-contain" loading="lazy" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-bold">{deal.title}</h3>
          {deal.isHot ? <StatusPill tone="danger">Hot</StatusPill> : null}
        </div>
        <p className="mt-2 line-clamp-3 text-sm text-slate-400">{deal.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-bold text-yellow-400">{formatPrice(deal.price)}</p>
          <p className="text-xs font-semibold text-slate-500">{deal.brandSlug}</p>
        </div>
      </div>
    </article>
  );
}

export default function AppAdminBrandPage() {
  const { getToken } = useAuth();
  const params = useParams<{ brandId: string | string[] }>();
  const brandId = useMemo(() => {
    const value = params?.brandId;
    return Array.isArray(value) ? value[0] : value ?? "";
  }, [params]);

  const [brand, setBrand] = useState<BrandDetails | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!brandId) return;

    setLoading(true);
    setMessage(null);
    const token = await getToken();
    const headers = authHeaders(token);

    const [brandResponse, dealsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/app-admin/brands/${encodeURIComponent(brandId)}`, { headers }),
      fetch(`${apiBaseUrl}/api/app-admin/brands/${encodeURIComponent(brandId)}/deals`, { headers }),
    ]);

    const brandPayload = await readJsonResponse<{ data?: BrandDetails; message?: string }>(brandResponse);
    if (!brandResponse.ok) {
      throw new Error(brandPayload?.message ?? "Could not load brand details.");
    }

    const dealsPayload = await readJsonResponse<{ data?: Deal[]; message?: string }>(dealsResponse);
    if (!dealsResponse.ok) {
      throw new Error(dealsPayload?.message ?? "Could not load brand deals.");
    }

    setBrand(brandPayload?.data ?? null);
    setDeals(dealsPayload?.data ?? []);
    setLoading(false);
  }, [brandId, getToken]);

  useEffect(() => {
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not load brand page.");
      setLoading(false);
    });
  }, [load]);

  const decide = async (action: "approve" | "reject") => {
    if (!brand) return;

    setWorking(true);
    setMessage(null);
    const token = await getToken();
    const response = await fetch(`${apiBaseUrl}/api/app-admin/brands/${encodeURIComponent(brand.brandId)}/${action}`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: action === "reject" ? JSON.stringify({ reason: "Rejected after app admin review" }) : undefined,
    });

    const payload = await readJsonResponse<{ data?: BrandDetails; message?: string }>(response);
    if (!response.ok) {
      setMessage(payload?.message ?? `Could not ${action} brand.`);
      setWorking(false);
      return;
    }

    await load();
    setWorking(false);
  };

  const socials = useMemo(
    () => Object.entries(brand?.socials ?? {}).filter(([, value]) => value),
    [brand]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={5} />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="rounded-3xl border border-white/10 bg-[#1f1f1f]/95 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">App admin</p>
              <h1 className="mt-2 text-3xl font-bold">Brand review page</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">Inspect one brand in detail, review its deals, and approve or reject the request from a dedicated page.</p>
            </div>
            <Link
              href="/app-admin/approvals"
              className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-slate-200 hover:bg-white/5"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-400">Loading brand details...</p> : null}

        {!loading && brand ? (
          <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 shadow-lg shadow-black/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-3xl font-bold">{brand.name}</h2>
                      <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>
                        {brand.approvalStatus}
                      </StatusPill>
                      {brand.scrapeRequested ? <StatusPill tone="warn">Scraper requested</StatusPill> : null}
                      {brand.manualDealManagementEnabled ? <StatusPill tone="good">Manual deals enabled</StatusPill> : null}
                    </div>
                    {brand.tagline ? <p className="mt-2 text-sm text-slate-400">{brand.tagline}</p> : null}
                    <p className="mt-4 text-sm leading-6 text-slate-300">{brand.description ?? "No description provided."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brand.approvalStatus === "PENDING" ? (
                      <>
                        <button
                          disabled={working}
                          onClick={() => void decide("approve")}
                          className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={working}
                          onClick={() => void decide("reject")}
                          className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Detail label="Brand ID" value={brand.brandId} />
                <Detail label="Slug" value={brand.slug} />
                <Detail label="Country" value={brand.country ?? "Not provided"} />
                <Detail label="Website" value={brand.website ?? "Not provided"} />
                <Detail label="Contact email" value={brand.contactEmail ?? "Not provided"} />
                <Detail label="Contact phone" value={brand.contactPhone ?? "Not provided"} />
                <Detail label="Cities" value={formatList(brand.cities)} />
                <Detail label="Areas" value={formatList(brand.areas)} />
                <Detail label="Cuisine tags" value={formatList(brand.cuisineTags)} />
                <Detail label="Scraper status" value={brand.scraperStatus} />
                <Detail label="Created" value={formatDate(brand.createdAt)} />
                <Detail label="Updated" value={formatDate(brand.updatedAt)} />
              </div>

              {brand.notes ? (
                <div className="rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 shadow-lg shadow-black/20">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Reviewer notes</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{brand.notes}</p>
                </div>
              ) : null}

              {brand.rejectionReason ? (
                <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 shadow-lg shadow-black/20">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-200">Rejection reason</p>
                  <p className="mt-2 text-sm leading-6 text-red-100">{brand.rejectionReason}</p>
                </div>
              ) : null}

              {socials.length > 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 shadow-lg shadow-black/20">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Social links</p>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    {socials.map(([key, value]) => (
                      <p key={key}>
                        {key}: {value}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold">Brand deals</h2>
                    <p className="mt-1 text-sm text-slate-400">Every active or historical deal linked to this brand.</p>
                  </div>
                  <StatusPill tone="good">{deals.length} deals</StatusPill>
                </div>
                <div className="mt-4 grid gap-4">
                  {deals.map((deal) => (
                    <DealCard key={deal.dealId} deal={deal} />
                  ))}
                  {deals.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-[#151515] p-6 text-center">
                      <h3 className="font-bold text-slate-200">No deals found</h3>
                      <p className="mt-2 text-sm text-slate-500">This brand has not published any deals yet.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
