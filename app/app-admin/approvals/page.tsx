"use client";

import Link from "next/link";
import { useClerk, useSignIn, useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    apiBaseUrl,
    authHeaders,
    formatPrice,
    readJsonResponse,
    type BrandProfile,
    type Deal,
    type DomainUser,
} from "@/lib/deals";
type AdminTab = "overview" | "brands" | "users" | "deals";

type AdminBrand = BrandProfile & {
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
};

type AdminUser = DomainUser & {
    brand?: AdminBrand | null;
};

type AppAdminOverview = {
    totalUsers: number;
    endUsers: number;
    brandAdmins: number;
    appAdmins: number;
    totalBrands: number;
    pendingBrands: number;
    approvedBrands: number;
    topDeals: Deal[];
};

const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "brands", label: "Brand review" },
    { id: "users", label: "Users" },
    { id: "deals", label: "Top deals" },
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

function StatusPill({
    children,
    tone = "neutral",
}: {
    children: React.ReactNode;
    tone?: "neutral" | "good" | "warn" | "danger";
}) {
    const classes = {
        neutral: "text-[#9ca3af]",
        good: "text-emerald-400",
        warn: "text-yellow-400",
        danger: "text-red-400",
    };

    return (
        <span className={`inline-flex text-[10px] font-medium uppercase tracking-[0.16em] ${classes[tone]}`}>
            {children}
        </span>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9ca3af]">{label}</p>
            <p className="mt-1 truncate text-sm font-medium text-[#e5e5e5]">{value}</p>
        </div>
    );
}

function StatCard({
    label,
    value,
    tone = "neutral",
}: {
    label: string;
    value: string | number;
    tone?: "neutral" | "good" | "warn" | "danger";
}) {
    const tones = {
        neutral: "border-[#1f1f1f] bg-[#111111] text-[#e5e5e5]",
        good: "border-[#1f1f1f] bg-[#111111] text-emerald-400",
        warn: "border-[#1f1f1f] bg-[#111111] text-yellow-400",
        danger: "border-[#1f1f1f] bg-[#111111] text-red-400",
    };

    return (
        <div className={`rounded-xl border p-3 ${tones[tone]}`}>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9ca3af]">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
        </div>
    );
}

function BrandCard({
    brand,
    onApprove,
    onReject,
    showActions = false,
}: {
    brand: AdminBrand;
    onApprove?: (brandId: string) => void;
    onReject?: (brandId: string) => void;
    showActions?: boolean;
}) {
    return (
        <article className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[#e5e5e5]">{brand.name}</h3>
                        <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>
                            {brand.approvalStatus}
                        </StatusPill>
                        {brand.scrapeRequested ? <StatusPill tone="warn">Scraper requested</StatusPill> : null}
                        {brand.manualDealManagementEnabled ? <StatusPill tone="good">Manual deals enabled</StatusPill> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#9ca3af]">
                        <span>{brand.contactEmail ?? "No contact email"}</span>
                        <span>{brand.contactPhone ?? "No phone"}</span>
                        <span>{formatList(brand.cities)}</span>
                        <span>{brand.country ?? "Not provided"}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#9ca3af]">{brand.description ?? "No description provided."}</p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                        href={`/app-admin/brands/${brand.brandId}`}
                        className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-[#e5e5e5] hover:bg-[#161616]"
                    >
                        Open brand page
                    </Link>
                    {showActions ? (
                        <>
                            <button
                                onClick={() => onApprove?.(brand.brandId)}
                                className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-[#161616]"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => onReject?.(brand.brandId)}
                                className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-[#161616]"
                            >
                                Reject
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

function BrandAdminUserCard({
    user,
    onSuspend,
    onDelete,
}: {
    user: AdminUser;
    onSuspend: (userId: string) => void;
    onDelete: (userId: string) => void;
}) {
    const brand = user.brand;

    return (
        <article className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[#e5e5e5]">{brand?.name ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? user.email}</h3>
                        <StatusPill tone={user.isActive ? "good" : "danger"}>{user.isActive ? "Active" : "Suspended"}</StatusPill>
                        {brand ? (
                            <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>
                                {brand.approvalStatus}
                            </StatusPill>
                        ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#9ca3af]">
                        <span>{[user.firstName, user.lastName].filter(Boolean).join(" ") || "Unnamed admin"}</span>
                        <span>{user.email}</span>
                        <span>{brand?.contactEmail ?? "No brand email"}</span>
                        <span>{brand?.contactPhone ?? "No brand phone"}</span>
                        <span>{formatList(brand?.cities)}</span>
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    {brand ? (
                        <Link
                            href={`/app-admin/brands/${brand.brandId}`}
                            className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-[#e5e5e5] hover:bg-[#161616]"
                        >
                            Open brand page
                        </Link>
                    ) : null}
                    <button
                        onClick={() => onSuspend(user.id)}
                        className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-yellow-400 hover:bg-[#161616]"
                    >
                        Suspend
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-[#161616]"
                    >
                        Remove
                    </button>
                </div>
            </div>
        </article>
    );
}

function UserCard({ user, onDelete }: { user: DomainUser; onDelete: (userId: string) => void }) {
    return (
        <article className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[#e5e5e5]">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</h3>
                        <StatusPill>{user.role}</StatusPill>
                        <StatusPill tone={user.isActive ? "good" : "danger"}>{user.isActive ? "Active" : "Inactive"}</StatusPill>
                    </div>
                    <p className="mt-1 truncate text-xs text-[#9ca3af]">{user.email} · {user.clerkUserId}</p>
                </div>
                <button
                    onClick={() => onDelete(user.id)}
                    className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-[#161616]"
                >
                    Delete account
                </button>
            </div>
        </article>
    );
}

function DealTile({ deal }: { deal: Deal }) {
    return (
        <article className="overflow-hidden rounded-xl border border-[#1f1f1f] bg-[#111111]">
            <div className="flex h-24 items-center justify-center bg-[#111111]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getDealImage(deal)} alt={deal.title} className="h-full w-full object-contain" loading="lazy" />
            </div>
            <div className="p-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-medium text-[#e5e5e5]">{deal.title}</h3>
                    {deal.isHot ? <StatusPill tone="danger">Hot</StatusPill> : null}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-[#9ca3af]">{deal.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#e5e5e5]">{formatPrice(deal.price)}</p>
                    <p className="truncate text-[10px] text-[#9ca3af]">{deal.brandSlug}</p>
                </div>
            </div>
        </article>
    );
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-xl border border-dashed border-[#1f1f1f] bg-[#111111] p-3 text-center">
            <h3 className="text-sm font-medium text-[#e5e5e5]">{title}</h3>
            <p className="mt-1 text-xs text-[#9ca3af]">{body}</p>
        </div>
    );
}

function SignInGate() {
    const clerk = useClerk();
    const { signIn, fetchStatus } = useSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const signInWithGoogle = async () => {
        setMessage(null);
        const { error } = await signIn.sso({
            strategy: "oauth_google",
            redirectUrl: "/sign-in",
            redirectCallbackUrl: "/sso-callback",
        });

        if (error) {
            setMessage(error.longMessage ?? error.message ?? "Google sign in failed.");
        }
    };

    const submitPasswordSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setMessage(null);

        const trimmedEmail = email.trim();
        if (!trimmedEmail || !password) {
            setMessage("Enter your email and password.");
            return;
        }

        setIsSubmitting(true);
        try {
            const signInAttempt = await clerk.client.signIn.create({
                identifier: trimmedEmail,
                password,
            });

            if (signInAttempt.status !== "complete" || !signInAttempt.createdSessionId) {
                setMessage("Sign in could not be completed. Please try again.");
                return;
            }

            await clerk.setActive({ session: signInAttempt.createdSessionId });
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Could not sign in.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#0b0b0b] px-4 py-4 text-[#e5e5e5]">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-2xl items-center justify-center">
                <section className="w-full rounded-xl border border-[#1f1f1f] bg-[#111111] p-4">
                    <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9ca3af]">App admin</p>
                        <h1 className="mt-1 text-xl font-semibold">Sign in required</h1>
                        <p className="mt-1 text-xs text-[#9ca3af]">Use email/password or Google.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        disabled={fetchStatus === "fetching" || isSubmitting}
                        className="mt-4 flex w-full items-center justify-center rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-[#e5e5e5] transition hover:bg-[#161616] disabled:opacity-60"
                    >
                        <span className="mr-2 flex h-4 w-4 items-center justify-center">
                            <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.1H272v104.4h146.9c-6.3 34.1-25.4 62.9-54.2 82.1v68.1h87.5c51.3-47.2 80.3-116.9 80.3-199.5z" />
                                <path fill="#34A853" d="M272 544.3c73.7 0 135.6-24.3 180.8-66.2l-87.5-68.1c-24.4 16.4-55.7 26-93.3 26-71.7 0-132.5-48.3-154.2-113.2H27.4v70.9C72.6 488.6 165.8 544.3 272 544.3z" />
                                <path fill="#FBBC05" d="M117.8 325.7c-10.3-30.6-10.3-63.6 0-94.2V160.6H27.4c-39.2 76.2-39.2 166.1 0 242.3l90.4-77.2z" />
                                <path fill="#EA4335" d="M272 108.6c39.9-.6 78.3 14.6 107.4 41.9l80.4-80.4C407.8 25.7 345.9 0 272 0 165.8 0 72.6 55.7 27.4 160.6l90.4 70.9C139.5 156.9 200.3 108.6 272 108.6z" />
                            </svg>
                        </span>
                        <span>Continue with Google</span>
                    </button>

                    <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[#9ca3af]">
                        <span className="h-px flex-1 bg-[#1f1f1f]" />
                        <span>Or sign in with email</span>
                        <span className="h-px flex-1 bg-[#1f1f1f]" />
                    </div>

                    <form onSubmit={(event) => void submitPasswordSignIn(event)} className="grid gap-2">
                        <label className="grid gap-1 text-xs font-medium text-[#e5e5e5]">
                            <span><span className="text-red-400">*</span> Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm text-[#e5e5e5] outline-none focus:border-red-500"
                            />
                        </label>

                        <label className="grid gap-1 text-xs font-medium text-[#e5e5e5]">
                            <span><span className="text-red-400">*</span> Password</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-sm text-[#e5e5e5] outline-none focus:border-red-500"
                            />
                        </label>

                        {message ? <p className="text-xs text-red-400">{message}</p> : null}

                        <button
                            type="submit"
                            disabled={fetchStatus === "fetching" || isSubmitting}
                            className="rounded-md border border-[#1f1f1f] bg-[#111111] px-3 py-1.5 text-xs font-medium text-[#e5e5e5] transition hover:bg-[#161616] disabled:opacity-60"
                        >
                            {fetchStatus === "fetching" || isSubmitting ? "Signing in..." : "Sign in to dashboard"}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}

export default function AppAdminApprovalsPage() {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>("overview");
    const [overview, setOverview] = useState<AppAdminOverview | null>(null);
    const [allBrands, setAllBrands] = useState<AdminBrand[]>([]);
    const [pendingBrands, setPendingBrands] = useState<AdminBrand[]>([]);
    const [brandAdmins, setBrandAdmins] = useState<AdminUser[]>([]);
    const [endUsers, setEndUsers] = useState<DomainUser[]>([]);
    const [message, setMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        setMessage(null);
        const token = await getToken();
        const headers = authHeaders(token);

        const [overviewResponse, brandsResponse, pendingResponse, brandAdminsResponse, endUsersResponse] = await Promise.all([
            fetch(`${apiBaseUrl}/api/app-admin/overview`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brands`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brands/pending`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brand-admins`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/end-users`, { headers }),
        ]);

        const overviewPayload = await readJsonResponse<{ data?: AppAdminOverview; message?: string }>(overviewResponse);
        if (!overviewResponse.ok) {
            throw new Error(overviewPayload?.message ?? "Could not load overview data.");
        }

        const brandsPayload = await readJsonResponse<{ data?: AdminBrand[]; message?: string }>(brandsResponse);
        if (!brandsResponse.ok) {
            throw new Error(brandsPayload?.message ?? "Could not load brands.");
        }

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

        setOverview(overviewPayload?.data ?? null);
        setAllBrands(brandsPayload?.data ?? []);
        setPendingBrands(pendingPayload?.data ?? []);
        setBrandAdmins(brandAdminsPayload?.data ?? []);
        setEndUsers(endUsersPayload?.data ?? []);
        setLoading(false);
    }, [getToken]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        void load().catch((error) => {
            setMessage(error instanceof Error ? error.message : "Could not load app admin dashboard.");
            setLoading(false);
        });
    }, [isLoaded, isSignedIn, load]);

    const stats = useMemo(
        () => [
            { label: "Total users", value: overview?.totalUsers ?? 0, tone: "neutral" as const },
            { label: "Brand admins", value: overview?.brandAdmins ?? brandAdmins.length, tone: "warn" as const },
            { label: "End users", value: overview?.endUsers ?? endUsers.length, tone: "good" as const },
            { label: "Pending brands", value: overview?.pendingBrands ?? pendingBrands.length, tone: "danger" as const },
        ],
        [brandAdmins.length, endUsers.length, overview, pendingBrands.length]
    );

    if (!isLoaded || !isSignedIn) {
        return <SignInGate />;
    }

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



    const topDeals = overview?.topDeals ?? [];
    const approvedBrands = allBrands.filter((brand) => brand.approvalStatus === "APPROVED");
    const pendingBrandsList = pendingBrands.length > 0 ? pendingBrands : allBrands.filter((brand) => brand.approvalStatus === "PENDING");

    return (
        <main className="min-h-screen bg-[#0b0b0b] px-4 py-4 text-[#e5e5e5]">
            <div className="mx-auto max-w-7xl">
                <header className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-3">
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9ca3af]">App admin</p>
                    <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h1 className="text-xl font-semibold">Admin control center</h1>
                            <p className="mt-1 max-w-3xl text-xs text-[#9ca3af]">Review brands, users, and deals.</p>
                        </div>
                        <div className="flex flex-wrap gap-4 border-b border-[#1f1f1f]">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`border-b-2 px-1 pb-2 text-xs font-medium transition ${activeTab === tab.id ? "border-red-500 text-[#e5e5e5]" : "border-transparent text-[#9ca3af] hover:text-[#e5e5e5]"}`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </header>

                {message ? <p className="mt-3 rounded-lg border border-[#1f1f1f] bg-[#111111] px-3 py-2 text-xs text-red-400">{message}</p> : null}
                {loading ? <p className="mt-3 text-xs text-[#9ca3af]">Loading dashboard...</p> : null}

                {!loading && activeTab === "overview" ? (
                    <section className="mt-4 grid gap-4">
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                            {stats.map((stat) => (
                                <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
                            ))}
                        </div>

                        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
                            <div>
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold">All brands</h2>
                                    </div>
                                    <StatusPill tone="good">{allBrands.length} brands</StatusPill>
                                </div>
                                <div className="mt-2 grid gap-2">
                                    {allBrands.map((brand) => (
                                        <BrandCard key={brand.brandId} brand={brand} />
                                    ))}
                                    {allBrands.length === 0 ? (
                                        <EmptyState title="No brands yet" body="Brand profiles will appear here once merchants register." />
                                    ) : null}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold">Top deals</h2>
                                    </div>
                                    <StatusPill tone="danger">{topDeals.length} live</StatusPill>
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                                    {topDeals.map((deal) => (
                                        <DealTile key={deal.dealId} deal={deal} />
                                    ))}
                                    {topDeals.length === 0 ? (
                                        <EmptyState title="No top deals" body="Top deals will appear here once the deals service returns active results." />
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </section>
                ) : null}

                {!loading && activeTab === "brands" ? (
                    <section className="mt-4 grid gap-4">
                        <div>
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold">Pending brands</h2>
                                </div>
                                <StatusPill tone="warn">{pendingBrandsList.length} pending</StatusPill>
                            </div>
                            <div className="mt-2 grid gap-2">
                                {pendingBrandsList.map((brand) => (
                                    <BrandCard
                                        key={brand.brandId}
                                        brand={brand}
                                        showActions
                                        onApprove={(brandId) => void decide(brandId, "approve")}
                                        onReject={(brandId) => void decide(brandId, "reject")}
                                    />
                                ))}
                                {pendingBrandsList.length === 0 ? (
                                    <EmptyState title="No pending brands" body="New brand admin requests will appear here." />
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold">All brand admins</h2>
                            <div className="mt-2 grid gap-2">
                                {brandAdmins.map((user) => (
                                    <BrandAdminUserCard
                                        key={user.id}
                                        user={user}
                                        onSuspend={(userId) => void suspendBrandAdmin(userId)}
                                        onDelete={(userId) => void deleteBrandAdmin(userId)}
                                    />
                                ))}
                                {brandAdmins.length === 0 ? (
                                    <EmptyState title="No brand admins" body="Brand admins will appear here once accounts are created." />
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold">Approved brands</h2>
                                </div>
                                <StatusPill tone="good">{approvedBrands.length} approved</StatusPill>
                            </div>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                                {approvedBrands.map((brand) => (
                                    <BrandCard key={brand.brandId} brand={brand} />
                                ))}
                                {approvedBrands.length === 0 ? (
                                    <EmptyState title="No approved brands" body="Approved brands will show up here after review." />
                                ) : null}
                            </div>
                        </div>
                    </section>
                ) : null}

                {!loading && activeTab === "users" ? (
                    <section className="mt-4">
                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold">End users</h2>
                            </div>
                            <StatusPill tone="good">{endUsers.length} users</StatusPill>
                        </div>
                        <div className="mt-2 grid gap-2">
                            {endUsers.map((user) => (
                                <UserCard key={user.id} user={user} onDelete={(userId) => void deleteEndUser(userId)} />
                            ))}
                            {endUsers.length === 0 ? <EmptyState title="No end users" body="Consumer accounts will appear here once users sign up." /> : null}
                        </div>
                    </section>
                ) : null}

                {!loading && activeTab === "deals" ? (
                    <section className="mt-4">
                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <h2 className="text-lg font-semibold">Top deals</h2>
                            </div>
                            <StatusPill tone="danger">{topDeals.length} deals</StatusPill>
                        </div>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
                            {topDeals.map((deal) => (
                                <DealTile key={deal.dealId} deal={deal} />
                            ))}
                            {topDeals.length === 0 ? (
                                <EmptyState title="No top deals" body="Top deals will appear here once the deals service returns active results." />
                            ) : null}
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    );
}
