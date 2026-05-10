"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl, authHeaders, formatPrice, readJsonResponse, type BrandProfile, type Deal } from "@/lib/deals";


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

type BrandTab = "overview" | "details" | "deals";

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

function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "danger";
}) {
  const classes = {
    neutral: "border-slate-200 bg-white text-slate-600",
    good: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warn: "border-yellow-200 bg-yellow-50 text-yellow-700",
    danger: "border-red-200 bg-red-50 text-red-700",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${classes[tone]}`}>
      {children}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AdminDealCard({ deal }: { deal: Deal }) {
  return (
    <article
      className={[
        "relative flex h-[420px] flex-col overflow-hidden rounded-3xl",
        "bg-white",
        "shadow-sm",
      ].join(" ")}
    >
      <div className="flex h-full w-full flex-col">
        <div className="relative flex-[0_0_72%] overflow-hidden bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={deal.imgUrl || "/next.svg"}
            alt={deal.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />

          {deal.brandLogoUrl ? (
            <div className="absolute bottom-3 left-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deal.brandLogoUrl}
                alt={deal.brandSlug ?? "brand"}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col justify-between px-5 pb-5 pt-4">
          <div>
            <h3 className="truncate text-base font-semibold leading-tight tracking-tight text-slate-900">{deal.title}</h3>
            <p className="mt-1 line-clamp-1 text-[12px] font-medium leading-relaxed text-slate-500">{deal.description}</p>
          </div>

          <div className="mt-3 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-400">From</span>
              <p className="mt-0.5 text-xl font-extrabold leading-none tracking-tight text-slate-900">{formatPrice(deal.price)}</p>
            </div>
            {deal.isHot ? <StatusPill tone="danger">Hot</StatusPill> : null}
          </div>
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
  const [activeTab, setActiveTab] = useState<BrandTab>("overview");

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
    <main className="min-h-screen bg-[#f6f6f6] px-4 py-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">App admin</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Brand review page</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-500">Inspect one brand in detail, review its deals, and approve or reject the request from a dedicated page.</p>
            </div>
            <Link
              href="/app-admin/approvals"
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
            >
              ← Back to dashboard
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            {([
              { id: "overview", label: "Overview" },
              { id: "details", label: "Details" },
              { id: "deals", label: "Deals" },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-white text-red-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-500">Loading brand details...</p> : null}

        {!loading && brand ? (
          <section className="mt-6 grid gap-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-3xl font-semibold text-slate-900">{brand.name}</h2>
                    <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>
                      {brand.approvalStatus}
                    </StatusPill>
                    {brand.scrapeRequested ? <StatusPill tone="warn">Scraper requested</StatusPill> : null}
                    {brand.manualDealManagementEnabled ? <StatusPill tone="good">Manual deals enabled</StatusPill> : null}
                  </div>
                  {brand.tagline ? <p className="mt-2 text-sm text-slate-500">{brand.tagline}</p> : null}
                  <p className="mt-4 text-sm leading-6 text-slate-600">{brand.description ?? "No description provided."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {brand.approvalStatus === "PENDING" ? (
                    <>
                      <button
                        disabled={working}
                        onClick={() => void decide("approve")}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        disabled={working}
                        onClick={() => void decide("reject")}
                        className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {activeTab === "overview" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Detail label="Brand ID" value={brand.brandId} />
                <Detail label="Slug" value={brand.slug} />
                <Detail label="Website" value={brand.website ?? "Not provided"} />
                <Detail label="Contact email" value={brand.contactEmail ?? "Not provided"} />
                <Detail label="Contact phone" value={brand.contactPhone ?? "Not provided"} />
                <Detail label="Cities" value={formatList(brand.cities)} />
              </div>
            ) : null}

            {activeTab === "details" ? (
              <div className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Detail label="Country" value={brand.country ?? "Not provided"} />
                  <Detail label="Areas" value={formatList(brand.areas)} />
                  <Detail label="Cuisine tags" value={formatList(brand.cuisineTags)} />
                  <Detail label="Scraper status" value={brand.scraperStatus} />
                  <Detail label="Created" value={formatDate(brand.createdAt)} />
                  <Detail label="Updated" value={formatDate(brand.updatedAt)} />
                </div>

                {brand.notes ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Reviewer notes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{brand.notes}</p>
                  </div>
                ) : null}

                {brand.rejectionReason ? (
                  <div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-600">Rejection reason</p>
                    <p className="mt-2 text-sm leading-6 text-red-700">{brand.rejectionReason}</p>
                  </div>
                ) : null}

                {socials.length > 0 ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Social links</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      {socials.map(([key, value]) => (
                        <p key={key}>
                          {key}: {value}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTab === "deals" ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Brand deals</h2>
                    <p className="mt-1 text-sm text-slate-500">Every active or historical deal linked to this brand.</p>
                  </div>
                  <StatusPill tone="good">{deals.length} deals</StatusPill>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {deals.map((deal) => (
                    <AdminDealCard key={deal.dealId} deal={deal} />
                  ))}
                  {deals.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                      <h3 className="font-semibold text-slate-900">No deals found</h3>
                      <p className="mt-2 text-sm text-slate-500">This brand has not published any deals yet.</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
