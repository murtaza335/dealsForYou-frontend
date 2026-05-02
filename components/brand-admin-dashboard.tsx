"use client";

import Image from "next/image";
import { UserButton, useAuth } from "@clerk/nextjs";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { apiBaseUrl, authHeaders, formatPrice, type BrandProfile, type Deal, uploadImage } from "@/lib/deals";
import { FoodBackground } from "@/components/food-background";

type DealDraft = {
  title: string;
  description: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  minPersons: string;
  maxPersons: string;
  cuisineTags: string;
  mealType: string;
  conditions: string;
  endTime: string;
};

const emptyDeal: DealDraft = {
  title: "",
  description: "",
  price: "",
  originalPrice: "",
  discountPercent: "",
  minPersons: "",
  maxPersons: "",
  cuisineTags: "",
  mealType: "",
  conditions: "",
  endTime: "",
};

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

const formatList = (values?: string[]) => (values?.length ? values.join(", ") : "Not set");

const formatDateTime = (value?: string) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatPercent = (value?: number) => (typeof value === "number" ? `${value}%` : "Not set");

const formatOptionalPrice = (value?: number) => (typeof value === "number" ? formatPrice(value) : "Not set");

const formatPersons = (deal: Deal) => {
  if (typeof deal.minPersons === "number" && typeof deal.maxPersons === "number") return `${deal.minPersons} to ${deal.maxPersons}`;
  if (typeof deal.minPersons === "number") return `At least ${deal.minPersons}`;
  if (typeof deal.maxPersons === "number") return `Up to ${deal.maxPersons}`;
  return "Not set";
};

const formatBoolean = (value?: boolean) => {
  if (typeof value !== "boolean") return "Not set";
  return value ? "Yes" : "No";
};

const requiredDealFields: Array<[keyof DealDraft, string]> = [
  ["title", "Deal title"],
  ["description", "Description"],
  ["price", "Price"],
  ["originalPrice", "Original price"],
  ["discountPercent", "Discount percent"],
  ["minPersons", "Minimum persons"],
  ["maxPersons", "Maximum persons"],
  ["cuisineTags", "Cuisine tags"],
  ["mealType", "Meal types"],
  ["conditions", "Conditions"],
  ["endTime", "Valid until"],
];

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-100">{value}</dd>
    </div>
  );
}

export function BrandAdminDashboard() {
  const { getToken } = useAuth();
  const [brand, setBrand] = useState<BrandProfile | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [draft, setDraft] = useState(emptyDeal);
  const [dealImage, setDealImage] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dealFormMessage, setDealFormMessage] = useState<string | null>(null);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [addingDeal, setAddingDeal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = await getToken();
    const [brandResponse, dealsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/api/brand-admin/brand`, { headers: authHeaders(token) }),
      fetch(`${apiBaseUrl}/api/brand-admin/deals`, { headers: authHeaders(token) }),
    ]);

    const brandPayload = await brandResponse.json();
    const dealsPayload = await dealsResponse.json();
    setBrand(brandPayload.data ?? null);
    setDeals(dealsPayload.data ?? []);
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Could not load dashboard.");
      setLoading(false);
    });
  }, [load]);

  const update = (key: keyof DealDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const validateDealDraft = () => {
    const missingField = requiredDealFields.find(([key]) => !draft[key].trim());
    if (missingField) return `${missingField[1]} is required.`;
    if (!dealImage) return "Deal image is required.";
    if (!dealImage.type.startsWith("image/")) return "Deal image must be an image file.";

    const price = Number(draft.price);
    const originalPrice = Number(draft.originalPrice);
    const discountPercent = Number(draft.discountPercent);
    const minPersons = Number(draft.minPersons);
    const maxPersons = Number(draft.maxPersons);
    const endTime = Date.parse(draft.endTime);

    if (!Number.isFinite(price) || price <= 0) return "Price must be greater than 0.";
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return "Original price must be greater than 0.";
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) return "Discount percent must be between 0 and 100.";
    if (!Number.isInteger(minPersons) || minPersons < 1) return "Minimum persons must be a whole number greater than 0.";
    if (!Number.isInteger(maxPersons) || maxPersons < minPersons) return "Maximum persons must be a whole number greater than or equal to minimum persons.";
    if (!Number.isFinite(endTime)) return "Valid until must be a valid date and time.";
    if (list(draft.cuisineTags).length === 0) return "Add at least one cuisine tag.";
    if (list(draft.mealType).length === 0) return "Add at least one meal type.";

    return null;
  };

  const addDeal = async () => {
    setDealFormMessage(null);
    if (!brand?.manualDealManagementEnabled) {
      setDealFormMessage("Manual add/delete is locked because scraper setup was requested for this brand.");
      return;
    }

    const validationError = validateDealDraft();
    if (validationError) {
      setDealFormMessage(validationError);
      return;
    }

    const selectedDealImage = dealImage;
    if (!selectedDealImage) return;

    setAddingDeal(true);
    try {
      const token = await getToken();
      const imgUrl = await uploadImage(selectedDealImage, "deals4you/manual-deals");
      const response = await fetch(`${apiBaseUrl}/api/brand-admin/deals`, {
        method: "POST",
        headers: { ...authHeaders(token), "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim(),
          price: Number(draft.price),
          originalPrice: Number(draft.originalPrice),
          discountPercent: Number(draft.discountPercent),
          minPersons: Number(draft.minPersons),
          maxPersons: Number(draft.maxPersons),
          cuisineTags: list(draft.cuisineTags),
          mealType: list(draft.mealType),
          conditions: draft.conditions.trim(),
          endTime: draft.endTime,
          imgUrl,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setDealFormMessage(payload?.message ?? "Could not add deal.");
        return;
      }

      setDraft(emptyDeal);
      setDealImage(null);
      setIsAddDealOpen(false);
      setMessage("Deal added successfully.");
      await load();
    } catch (error) {
      setDealFormMessage(error instanceof Error ? error.message : "Could not add deal.");
    } finally {
      setAddingDeal(false);
    }
  };

  const submitDeal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void addDeal();
  };

  const openAddDeal = () => {
    setMessage(null);
    setDealFormMessage(null);
    setIsAddDealOpen(true);
  };

  const closeAddDeal = () => {
    setIsAddDealOpen(false);
    setDealFormMessage(null);
    setDraft(emptyDeal);
    setDealImage(null);
  };

  const deleteDeal = async (dealId: string) => {
    const token = await getToken();
    await fetch(`${apiBaseUrl}/api/brand-admin/deals/${encodeURIComponent(dealId)}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    setSelectedDeal((current) => (current?.dealId === dealId ? null : current));
    await load();
  };

  if (loading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#151515] p-8 text-white">
        <FoodBackground blocks={4} />
        <div className="fixed right-5 top-5 z-30 sm:right-7">
          <UserButton />
        </div>
        <div className="relative z-10">Loading...</div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={5} />
      <div className="fixed right-5 top-5 z-30 sm:right-7">
        <UserButton />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 pr-20 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {brand?.logoUrl || brand?.imgUrl ? <Image src={brand.logoUrl || brand.imgUrl || ""} alt={brand.name} width={74} height={74} className="rounded-2xl object-contain" /> : null}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Brand admin</p>
              <h1 className="text-3xl font-bold">{brand?.name ?? "Your brand"}</h1>
              <p className="mt-1 text-sm text-slate-400">{brand?.scrapeRequested ? "Scraper setup requested" : "Manual deal management"}</p>
            </div>
          </div>
          <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">
            {brand?.approvalStatus} / {brand?.scraperStatus}
          </div>
        </header>

        {message ? <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</p> : null}

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#1f1f1f] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Add deals</h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">Create a manual deal with pricing, audience limits, tags, timing, and an image.</p>
            </div>
            <button
              type="button"
              onClick={openAddDeal}
              disabled={!brand?.manualDealManagementEnabled}
              className="w-full rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 md:w-auto"
            >
              Add deal
            </button>
          </div>
          {!brand?.manualDealManagementEnabled ? (
            <p className="mt-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">Manual add/delete is locked because scraper setup was requested for this brand.</p>
          ) : null}
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-[#1f1f1f] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Current deals</h2>
              <p className="mt-2 text-sm text-slate-400">All active imported deals for this brand.</p>
            </div>
            <span className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300">{deals.length} deals</span>
          </div>
          <div className="mt-5 grid gap-4">
            {deals.map((deal) => (
              <article key={deal.externalId} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#151515] p-4 sm:flex-row sm:items-center">
                <img src={deal.imgUrl} alt={deal.title} className="h-24 w-24 rounded-xl object-contain" />
                <div className="flex-1">
                  <h3 className="font-bold">{deal.title}</h3>
                  <p className="line-clamp-2 text-sm text-slate-400">{deal.description}</p>
                  <p className="mt-2 font-bold text-yellow-400">{formatPrice(deal.price)}</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => setSelectedDeal(deal)} className="rounded-full border border-yellow-500/40 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:bg-yellow-500/10">View details</button>
                  {brand?.manualDealManagementEnabled ? (
                    <button onClick={() => void deleteDeal(deal.dealId)} className="rounded-full border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/10">Delete</button>
                  ) : null}
                </div>
              </article>
            ))}
            {deals.length === 0 ? <p className="text-sm text-slate-400">No deals yet.</p> : null}
          </div>
        </section>

        {isAddDealOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="add-deal-title">
            <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="add-deal-title" className="text-2xl font-bold">Add deal</h2>
                  <p className="mt-2 text-sm text-slate-400">Fill every field before adding the deal.</p>
                </div>
                <button type="button" onClick={closeAddDeal} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Close</button>
              </div>

              <form onSubmit={submitDeal} className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Deal title
                  <input required placeholder="Family dinner platter" value={draft.title} onChange={(e) => update("title", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Description
                  <textarea required placeholder="Short description of the offer" value={draft.description} onChange={(e) => update("description", e.target.value)} className="min-h-24 rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Price
                    <input required type="number" min="0.01" step="0.01" placeholder="1200" value={draft.price} onChange={(e) => update("price", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Original price
                    <input required type="number" min="0.01" step="0.01" placeholder="1500" value={draft.originalPrice} onChange={(e) => update("originalPrice", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Discount %
                    <input required type="number" min="0" max="100" step="1" placeholder="20" value={draft.discountPercent} onChange={(e) => update("discountPercent", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Valid until
                    <input required type="datetime-local" value={draft.endTime} onChange={(e) => update("endTime", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Min persons
                    <input required type="number" min="1" step="1" placeholder="2" value={draft.minPersons} onChange={(e) => update("minPersons", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-200">
                    Max persons
                    <input required type="number" min="1" step="1" placeholder="6" value={draft.maxPersons} onChange={(e) => update("maxPersons", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                  </label>
                </div>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Cuisine tags
                  <input required placeholder="Pizza, burgers, desserts" value={draft.cuisineTags} onChange={(e) => update("cuisineTags", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Meal types
                  <input required placeholder="Lunch, dinner" value={draft.mealType} onChange={(e) => update("mealType", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Conditions
                  <input required placeholder="Valid for dine-in only" value={draft.conditions} onChange={(e) => update("conditions", e.target.value)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 font-normal text-white outline-none focus:border-red-500" />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-200">
                  Deal image
                  <input required type="file" accept="image/*" onChange={(e) => setDealImage(e.target.files?.[0] ?? null)} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-sm font-normal text-slate-200" />
                </label>

                {dealFormMessage ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{dealFormMessage}</p> : null}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={closeAddDeal} className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={addingDeal} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                    {addingDeal ? "Adding..." : "Add deal"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {selectedDeal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="deal-details-title">
            <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#1f1f1f] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Deal details</p>
                  <h2 id="deal-details-title" className="mt-1 text-2xl font-bold">{selectedDeal.title}</h2>
                </div>
                <button type="button" onClick={() => setSelectedDeal(null)} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">Close</button>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[220px_1fr]">
                {selectedDeal.imgUrl ? <img src={selectedDeal.imgUrl} alt={selectedDeal.title} className="h-52 w-full rounded-2xl border border-white/10 bg-[#151515] object-contain p-3" /> : null}
                <div>
                  <p className="text-sm leading-6 text-slate-300">{selectedDeal.description || "No description provided."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-yellow-400 px-3 py-1 text-sm font-bold text-black">{formatPrice(selectedDeal.price)}</span>
                    {selectedDeal.sourceType ? <span className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300">{selectedDeal.sourceType}</span> : null}
                    {selectedDeal.isActive === false ? <span className="rounded-full border border-red-500/40 px-3 py-1 text-sm text-red-200">Inactive</span> : null}
                    {selectedDeal.isExpired ? <span className="rounded-full border border-red-500/40 px-3 py-1 text-sm text-red-200">Expired</span> : null}
                  </div>
                </div>
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailRow label="Deal ID" value={selectedDeal.dealId} />
                <DetailRow label="External ID" value={selectedDeal.externalId} />
                <DetailRow label="Brand" value={selectedDeal.brandSlug || "Not set"} />
                <DetailRow label="Price" value={formatPrice(selectedDeal.price)} />
                <DetailRow label="Original price" value={formatOptionalPrice(selectedDeal.originalPrice)} />
                <DetailRow label="Discount" value={formatPercent(selectedDeal.discountPercent)} />
                <DetailRow label="Persons" value={formatPersons(selectedDeal)} />
                <DetailRow label="Cuisine tags" value={formatList(selectedDeal.cuisineTags)} />
                <DetailRow label="Meal types" value={formatList(selectedDeal.mealType)} />
                <DetailRow label="Conditions" value={selectedDeal.conditions || "Not set"} />
                <DetailRow label="Valid from" value={formatDateTime(selectedDeal.startTime)} />
                <DetailRow label="Valid until" value={formatDateTime(selectedDeal.endTime)} />
                <DetailRow label="Active" value={formatBoolean(selectedDeal.isActive)} />
                <DetailRow label="Expired" value={formatBoolean(selectedDeal.isExpired)} />
                <DetailRow label="Views" value={selectedDeal.viewsCount ?? 0} />
                <DetailRow label="Created" value={formatDateTime(selectedDeal.createdAt)} />
                <DetailRow label="Updated" value={formatDateTime(selectedDeal.updatedAt)} />
              </dl>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
