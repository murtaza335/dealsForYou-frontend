"use client";

import { UserButton, useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiBaseUrl, authHeaders, formatPrice, readJsonResponse, type BrandProfile, type Deal, type DomainUser } from "@/lib/deals";
import { FoodBackground } from "@/components/food-background";

type AdminTab = "brands" | "users" | "scrapers" | "deals";

type AdminBrand = BrandProfile & {
  tagline?: string;
  country?: string;
  socials?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
};

type AdminUser = DomainUser & {
  brand?: AdminBrand | null;
};

type DealsResponse = {
  data?: Deal[];
};

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "brands", label: "Brand admins" },
  { id: "users", label: "End users" },
  { id: "scrapers", label: "Scraper requests" },
  { id: "deals", label: "Deals" },
];

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

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
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

function BrandDetailsModal({ brand, onClose }: { brand: AdminBrand; onClose: () => void }) {
  const socials = Object.entries(brand.socials ?? {}).filter(([, value]) => value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 text-white shadow-2xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Brand details</p>
            <h2 className="mt-2 text-3xl font-bold">{brand.name}</h2>
            {brand.tagline ? <p className="mt-1 text-sm text-slate-400">{brand.tagline}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">Close</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Approval status" value={brand.approvalStatus} />
          <Detail label="Brand ID" value={brand.brandId} />
          <Detail label="Slug" value={brand.slug} />
          <Detail label="Country" value={brand.country ?? "Not provided"} />
          <Detail label="Cities" value={formatList(brand.cities)} />
          <Detail label="Areas" value={formatList(brand.areas)} />
          <Detail label="Cuisines" value={formatList(brand.cuisineTags)} />
          <Detail label="Contact email" value={brand.contactEmail ?? "Not provided"} />
          <Detail label="Contact phone" value={brand.contactPhone ?? "Not provided"} />
          <Detail label="Website" value={brand.website ?? "Not provided"} />
          <Detail label="Scraper requested" value={brand.scrapeRequested ? "Yes" : "No"} />
          <Detail label="Scraper status" value={brand.scraperStatus} />
          <Detail label="Manual deals" value={brand.manualDealManagementEnabled ? "Enabled" : "Disabled"} />
          <Detail label="Created" value={formatDate(brand.createdAt)} />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-[#151515] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Description</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{brand.description ?? "No description provided."}</p>
        </div>

        {brand.notes ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Review notes</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{brand.notes}</p>
          </div>
        ) : null}

        {socials.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#151515] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Socials</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-300">
              {socials.map(([key, value]) => <p key={key}>{key}: {value}</p>)}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-200">{value}</p>
    </div>
  );
}

function BrandCard({
  brand,
  onApprove,
  onReject,
  onView,
  pending,
}: {
  brand: AdminBrand;
  onApprove?: (brandId: string) => void;
  onReject?: (brandId: string) => void;
  onView: (brand: AdminBrand) => void;
  pending?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#1f1f1f] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">{brand.name}</h3>
            <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>{brand.approvalStatus}</StatusPill>
            {brand.scrapeRequested ? <StatusPill tone="warn">Scraper requested</StatusPill> : null}
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-400">{brand.description ?? "No description provided."}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>{brand.contactEmail ?? "No contact email"}</span>
            <span>{brand.contactPhone ?? "No phone"}</span>
            <span>{formatList(brand.cities)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => onView(brand)} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">View details</button>
          {pending ? (
            <>
              <button onClick={() => onApprove?.(brand.brandId)} className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold hover:bg-red-500">Accept</button>
              <button onClick={() => onReject?.(brand.brandId)} className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/10">Decline</button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BrandAdminUserCard({
  user,
  onView,
  onSuspend,
  onDelete,
}: {
  user: AdminUser;
  onView: (brand: AdminBrand) => void;
  onSuspend: (userId: string) => void;
  onDelete: (userId: string) => void;
}) {
  const brand = user.brand;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#1f1f1f] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold">{brand?.name ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? user.email}</h3>
            <StatusPill tone={user.isActive ? "good" : "danger"}>{user.isActive ? "Active" : "Suspended"}</StatusPill>
            {brand ? <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>{brand.approvalStatus}</StatusPill> : null}
          </div>
          <p className="mt-2 text-sm text-slate-400">{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed admin"} / {user.email}</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>{brand?.contactEmail ?? "No brand email"}</span>
            <span>{brand?.contactPhone ?? "No brand phone"}</span>
            <span>{formatList(brand?.cities)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {brand ? (
            <button onClick={() => onView(brand)} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">View details</button>
          ) : null}
          <button onClick={() => onSuspend(user.id)} className="rounded-full border border-yellow-500/40 px-4 py-2 text-sm font-bold text-yellow-200 hover:bg-yellow-500/10">Suspend</button>
          <button onClick={() => onDelete(user.id)} className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/10">Remove</button>
        </div>
      </div>
    </article>
  );
}

function UserCard({ user, onDelete }: { user: DomainUser; onDelete: (userId: string) => void }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#1f1f1f] p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</h3>
            <StatusPill>{user.role}</StatusPill>
            <StatusPill tone={user.isActive ? "good" : "danger"}>{user.isActive ? "Active" : "Inactive"}</StatusPill>
          </div>
          <p className="mt-2 text-sm text-slate-400">{user.email}</p>
          <p className="mt-1 text-xs text-slate-500">{user.clerkUserId}</p>
        </div>
        <button onClick={() => onDelete(user.id)} className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/10">Delete account</button>
      </div>
    </article>
  );
}

function DealTile({ deal }: { deal: Deal }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#1f1f1f]">
      <div className="flex h-44 items-center justify-center bg-[#151515]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getDealImage(deal)} alt={deal.title} className="h-full w-full object-contain" loading="lazy" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 font-bold">{deal.title}</h3>
          {"isHot" in deal && deal.isHot ? <StatusPill tone="danger">Hot</StatusPill> : null}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-400">{deal.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="font-bold text-yellow-400">{formatPrice(deal.price)}</p>
          <p className="text-xs font-semibold text-slate-500">{deal.brandSlug}</p>
        </div>
      </div>
    </article>
  );
}

export default function AppAdminApprovalsPage() {
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("brands");
  const [pendingBrands, setPendingBrands] = useState<AdminBrand[]>([]);
  const [brandAdmins, setBrandAdmins] = useState<AdminUser[]>([]);
  const [endUsers, setEndUsers] = useState<DomainUser[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [hotDeals, setHotDeals] = useState<Deal[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<AdminBrand | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    const token = await getToken();
    const headers = authHeaders(token);

    const [pendingResponse, brandAdminsResponse, endUsersResponse, dealsResponse, hotDealsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/app-admin/brands/pending`, { headers }),
      fetch(`${apiBaseUrl}/api/app-admin/brand-admins`, { headers }),
      fetch(`${apiBaseUrl}/api/app-admin/end-users`, { headers }),
      fetch(`${apiBaseUrl}/api/deals/filtered?limit=24&sortBy=createdAt&sortOrder=desc`, { headers }),
      fetch(`${apiBaseUrl}/api/deals/filtered?limit=8&isHot=true`, { headers }),
    ]);

    const pendingPayload = await readJsonResponse<{ data?: AdminBrand[]; message?: string }>(pendingResponse);
    if (!pendingResponse.ok) {
      throw new Error(pendingPayload?.message ?? "Could not load pending brands.");
    }

    const brandAdminsPayload = await readJsonResponse<{ data?: AdminUser[]; message?: string }>(brandAdminsResponse);
    if (!brandAdminsResponse.ok) {
      throw new Error(brandAdminsPayload?.message ?? "Could not load brand admins.");
    }

    const endUsersPayload = await readJsonResponse<{ data?: DomainUser[]; message?: string }>(endUsersResponse);
    if (!endUsersResponse.ok) {
      throw new Error(endUsersPayload?.message ?? "Could not load end users.");
    }

    const dealsPayload = await readJsonResponse<DealsResponse>(dealsResponse);
    const hotDealsPayload = await readJsonResponse<DealsResponse>(hotDealsResponse);

    setPendingBrands(pendingPayload?.data ?? []);
    setBrandAdmins(brandAdminsPayload?.data ?? []);
    setEndUsers(endUsersPayload?.data ?? []);
    setDeals(dealsResponse.ok ? dealsPayload?.data ?? [] : []);
    setHotDeals(hotDealsResponse.ok ? hotDealsPayload?.data ?? [] : []);
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not load app admin dashboard.");
      setLoading(false);
    });
  }, [load]);

  const decide = async (brandId: string, action: "approve" | "reject") => {
    setMessage(null);
    const token = await getToken();
    const response = await fetch(`${apiBaseUrl}/api/app-admin/brands/${brandId}/${action}`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: action === "reject" ? JSON.stringify({ reason: "Rejected from app admin dashboard" }) : undefined,
    });

    const payload = await readJsonResponse<{ message?: string }>(response);
    if (!response.ok) {
      setMessage(payload?.message ?? `Could not ${action} brand.`);
      return;
    }

    await load();
  };

  const suspendBrandAdmin = async (userId: string) => {
    if (!confirm("Suspend this brand admin and disable their linked brand/deals?")) return;

    setMessage(null);
    const token = await getToken();
    const response = await fetch(`${apiBaseUrl}/api/app-admin/brand-admins/${encodeURIComponent(userId)}/suspend`, {
      method: "PATCH",
      headers: authHeaders(token),
    });
    const payload = await readJsonResponse<{ message?: string }>(response);

    if (!response.ok) {
      setMessage(payload?.message ?? "Could not suspend brand admin.");
      return;
    }

    await load();
  };

  const deleteBrandAdmin = async (userId: string) => {
    if (!confirm("Permanently remove this brand admin, their brand, and that brand's deals?")) return;

    setMessage(null);
    const token = await getToken();
    const response = await fetch(`${apiBaseUrl}/api/app-admin/brand-admins/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    const payload = await readJsonResponse<{ message?: string }>(response);

    if (!response.ok) {
      setMessage(payload?.message ?? "Could not remove brand admin.");
      return;
    }

    await load();
  };

  const deleteEndUser = async (userId: string) => {
    if (!confirm("Permanently delete this end user account?")) return;

    setMessage(null);
    const token = await getToken();
    const response = await fetch(`${apiBaseUrl}/api/app-admin/end-users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    const payload = await readJsonResponse<{ message?: string }>(response);

    if (!response.ok) {
      setMessage(payload?.message ?? "Could not delete end user.");
      return;
    }

    await load();
  };

  const scraperRequests = useMemo(
    () => brandAdmins
      .map((user) => user.brand)
      .filter((brand): brand is AdminBrand => Boolean(brand?.scrapeRequested)),
    [brandAdmins]
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={5} />
      <div className="fixed right-5 top-5 z-30 sm:right-7">
        <UserButton />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="rounded-3xl border border-white/10 bg-[#1f1f1f]/95 p-6 pr-20 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">App admin</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin control center</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">Review brands, inspect scraper requests, browse deals, and prepare account actions from one place.</p>
            </div>
            <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#151515] p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? "bg-red-600 text-white" : "text-slate-300 hover:bg-white/5"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {message ? <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p> : null}
        {loading ? <p className="mt-6 text-sm text-slate-400">Loading dashboard...</p> : null}

        {!loading && activeTab === "brands" ? (
          <section className="mt-6 grid gap-8">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Pending brands</h2>
                  <p className="mt-1 text-sm text-slate-400">Review new brand admin requests before they unlock the dashboard.</p>
                </div>
                <StatusPill tone="warn">{pendingBrands.length} pending</StatusPill>
              </div>
              <div className="mt-4 grid gap-4">
                {pendingBrands.map((brand) => (
                  <BrandCard
                    key={brand.brandId}
                    brand={brand}
                    pending
                    onView={setSelectedBrand}
                    onApprove={(brandId) => void decide(brandId, "approve")}
                    onReject={(brandId) => void decide(brandId, "reject")}
                  />
                ))}
                {pendingBrands.length === 0 ? <EmptyState title="No pending brands" body="New brand admin requests will appear here." /> : null}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">All brand admins</h2>
              <p className="mt-1 text-sm text-slate-400">Suspend an admin to disable their account and linked brand. Remove permanently deletes the account, brand, and that brand&apos;s deals.</p>
              <div className="mt-4 grid gap-4">
                {brandAdmins.map((user) => (
                  <BrandAdminUserCard
                    key={user.id}
                    user={user}
                    onView={setSelectedBrand}
                    onSuspend={(userId) => void suspendBrandAdmin(userId)}
                    onDelete={(userId) => void deleteBrandAdmin(userId)}
                  />
                ))}
                {brandAdmins.length === 0 ? <EmptyState title="No brand admins" body="Brand admins will appear here once accounts are created." /> : null}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "users" ? (
          <section className="mt-6">
            <h2 className="text-2xl font-bold">End users</h2>
            <p className="mt-1 text-sm text-slate-400">Review and permanently remove consumer accounts.</p>
            <div className="mt-4 grid gap-4">
              {endUsers.map((user) => <UserCard key={user.id} user={user} onDelete={(userId) => void deleteEndUser(userId)} />)}
              {endUsers.length === 0 ? <EmptyState title="No end users" body="Consumer accounts will appear here once users sign up." /> : null}
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "scrapers" ? (
          <section className="mt-6">
            <h2 className="text-2xl font-bold">Scraper requests</h2>
            <p className="mt-1 text-sm text-slate-400">Brands that asked for scraper setup are listed here for visibility.</p>
            <div className="mt-4 grid gap-4">
              {scraperRequests.map((brand) => (
                <article key={brand.brandId} className="rounded-2xl border border-white/10 bg-[#1f1f1f] p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-bold">{brand.name}</h3>
                        <StatusPill tone="warn">{brand.scraperStatus}</StatusPill>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">Requested scraper setup for {brand.website ?? "an unspecified website"}.</p>
                      <p className="mt-1 text-xs text-slate-500">Requested: {formatDate(brand.createdAt)}</p>
                    </div>
                    <button onClick={() => setSelectedBrand(brand)} className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 hover:bg-white/5">View details</button>
                  </div>
                </article>
              ))}
              {scraperRequests.length === 0 ? <EmptyState title="No scraper requests" body="Requests will appear here when brand admins ask for scraper setup." /> : null}
            </div>
          </section>
        ) : null}

        {!loading && activeTab === "deals" ? (
          <section className="mt-6 grid gap-8">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Current hot deals</h2>
                  <p className="mt-1 text-sm text-slate-400">Deals marked hot by the deals service.</p>
                </div>
                <StatusPill tone="danger">{hotDeals.length} hot</StatusPill>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {hotDeals.map((deal) => <DealTile key={deal.dealId} deal={deal} />)}
                {hotDeals.length === 0 ? <EmptyState title="No hot deals" body="Hot deals will appear here once the deals service marks them." /> : null}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold">All deals</h2>
              <p className="mt-1 text-sm text-slate-400">Read-only catalog view for app admins.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {deals.map((deal) => <DealTile key={deal.dealId} deal={deal} />)}
                {deals.length === 0 ? <EmptyState title="No deals loaded" body="Deals will appear here once the gateway and deals service return data." /> : null}
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {selectedBrand ? <BrandDetailsModal brand={selectedBrand} onClose={() => setSelectedBrand(null)} /> : null}
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-[#1f1f1f]/70 p-6 text-center">
      <h3 className="font-bold text-slate-200">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{body}</p>
    </div>
  );
}
