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
import { AppAdminAnalyticsMain } from "@/app/app-admin/analytics/page";
import { ToastStack, useToast } from "@/components/toast";
type AdminTab = "overview" | "brands" | "users" | "deals";
type BrandFilter = "pending" | "approved" | "rejected";

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
    { id: "deals", label: "Analytics" },
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
        neutral: "text-slate-500",
        good: "text-emerald-600",
        warn: "text-yellow-600",
        danger: "text-red-700",
    };

    return (
        <span className={`inline-flex rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${classes[tone]}`}>
            {children}
        </span>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p>
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
        neutral: "border-slate-200 bg-white text-slate-900",
        good: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warn: "border-yellow-200 bg-yellow-50 text-yellow-700",
        danger: "border-red-200 bg-red-50 text-red-700",
    };

    return (
        <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
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
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">{brand.name}</h3>
                        <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>
                            {brand.approvalStatus}
                        </StatusPill>
                        {brand.scrapeRequested ? <StatusPill tone="warn">Scraper requested</StatusPill> : null}
                        {brand.manualDealManagementEnabled ? <StatusPill tone="good">Manual deals enabled</StatusPill> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{brand.contactEmail ?? "No contact email"}</span>
                        <span>{brand.contactPhone ?? "No phone"}</span>
                        <span>{formatList(brand.cities)}</span>
                        <span>{brand.country ?? "Not provided"}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{brand.description ?? "No description provided."}</p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                        href={`/app-admin/brands/${brand.brandId}`}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                    >
                        Open brand page
                    </Link>
                    {showActions ? (
                        <>
                            <button
                                onClick={() => onApprove?.(brand.brandId)}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => onReject?.(brand.brandId)}
                                className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">{brand?.name ?? [user.firstName, user.lastName].filter(Boolean).join(" ") ?? user.email}</h3>
                        <StatusPill tone={user.isActive ? "good" : "danger"}>{user.isActive ? "Active" : "Suspended"}</StatusPill>
                        {brand ? (
                            <StatusPill tone={brand.approvalStatus === "APPROVED" ? "good" : brand.approvalStatus === "REJECTED" ? "danger" : "warn"}>
                                {brand.approvalStatus}
                            </StatusPill>
                        ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
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
                            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700"
                        >
                            Open brand page
                        </Link>
                    ) : null}
                    <button
                        onClick={() => onSuspend(user.id)}
                        className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-100"
                    >
                        Suspend
                    </button>
                    <button
                        onClick={() => onDelete(user.id)}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-slate-900">{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.email}</h3>
                        <StatusPill>{user.role}</StatusPill>
                        <StatusPill tone={user.isActive ? "good" : "danger"}>{user.isActive ? "Active" : "Inactive"}</StatusPill>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{user.email} · {user.clerkUserId}</p>
                </div>
                <button
                    onClick={() => onDelete(user.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                    Delete account
                </button>
            </div>
        </article>
    );
}

function DealTile({ deal }: { deal: Deal }) {
    return (
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-24 items-center justify-center bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getDealImage(deal)} alt={deal.title} className="h-full w-full object-contain" loading="lazy" />
            </div>
            <div className="p-2">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 text-sm font-semibold text-slate-900">{deal.title}</h3>
                    {deal.isHot ? <StatusPill tone="danger">Hot</StatusPill> : null}
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{deal.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{formatPrice(deal.price)}</p>
                    <p className="truncate text-[10px] text-slate-500">{deal.brandSlug}</p>
                </div>
            </div>
        </article>
    );
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{body}</p>
        </div>
    );
}

function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${className ?? ""}`}>
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-4 w-40 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
    );
}

function SkeletonList({ rows = 3 }: { rows?: number }) {
    return (
        <div className="grid gap-3">
            {Array.from({ length: rows }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="h-4 w-48 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-2 h-3 w-64 animate-pulse rounded-full bg-slate-200" />
                    <div className="mt-2 h-3 w-40 animate-pulse rounded-full bg-slate-200" />
                </div>
            ))}
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
        <main className="min-h-screen bg-[#f8f8f8] px-4 py-4 text-slate-900">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-2xl items-center justify-center">
                <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">App admin</p>
                        <h1 className="mt-1 text-xl font-semibold text-slate-900">Sign in required</h1>
                        <p className="mt-1 text-xs text-slate-500">Use email/password or Google.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => void signInWithGoogle()}
                        disabled={fetchStatus === "fetching" || isSubmitting}
                        className="mt-4 flex w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-700 disabled:opacity-60"
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

                    <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-400">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span>Or sign in with email</span>
                        <span className="h-px flex-1 bg-slate-200" />
                    </div>

                    <form onSubmit={(event) => void submitPasswordSignIn(event)} className="grid gap-2">
                        <label className="grid gap-1 text-xs font-semibold text-slate-800">
                            <span><span className="text-red-600">*</span> Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
                            />
                        </label>

                        <label className="grid gap-1 text-xs font-semibold text-slate-800">
                            <span><span className="text-red-600">*</span> Password</span>
                            <input
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-500"
                            />
                        </label>

                        {message ? <p className="text-xs text-red-600">{message}</p> : null}

                        <button
                            type="submit"
                            disabled={fetchStatus === "fetching" || isSubmitting}
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
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
    const { signOut } = useClerk();
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>("overview");
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [brandFilter, setBrandFilter] = useState<BrandFilter>("pending");
    const [overview, setOverview] = useState<AppAdminOverview | null>(null);
    const [allBrands, setAllBrands] = useState<AdminBrand[]>([]);
    const [pendingBrands, setPendingBrands] = useState<AdminBrand[]>([]);
    const [approvedBrands, setApprovedBrands] = useState<AdminBrand[]>([]);
    const [rejectedBrands, setRejectedBrands] = useState<AdminBrand[]>([]);
    const [brandAdmins, setBrandAdmins] = useState<AdminUser[]>([]);
    const [endUsers, setEndUsers] = useState<DomainUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { toasts, pushToast, dismiss } = useToast();

    const load = useCallback(async () => {
        setLoading(true);
        const token = await getToken();
        const headers = authHeaders(token);

        const [overviewResponse, brandsResponse, pendingResponse, approvedResponse, rejectedResponse, brandAdminsResponse, endUsersResponse] = await Promise.all([
            fetch(`${apiBaseUrl}/api/app-admin/overview`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brands`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brands/pending`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brands/approved`, { headers }),
            fetch(`${apiBaseUrl}/api/app-admin/brands/rejected`, { headers }),
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

        const approvedPayload = await readJsonResponse<{ data?: AdminBrand[]; message?: string }>(approvedResponse);
        if (!approvedResponse.ok) {
            throw new Error(approvedPayload?.message ?? "Could not load approved brands.");
        }

        const rejectedPayload = await readJsonResponse<{ data?: AdminBrand[]; message?: string }>(rejectedResponse);
        if (!rejectedResponse.ok) {
            throw new Error(rejectedPayload?.message ?? "Could not load rejected brands.");
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
        setApprovedBrands(approvedPayload?.data ?? []);
        setRejectedBrands(rejectedPayload?.data ?? []);
        setBrandAdmins(brandAdminsPayload?.data ?? []);
        setEndUsers(endUsersPayload?.data ?? []);
        setLoading(false);
    }, [getToken]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        void load().catch((error) => {
            pushToast({
                tone: "error",
                title: "Dashboard failed to load",
                message: error instanceof Error ? error.message : "Could not load app admin dashboard.",
            });
            setLoading(false);
        });
    }, [isLoaded, isSignedIn, load, pushToast]);

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
        const token = await getToken();
        const response = await fetch(`${apiBaseUrl}/api/app-admin/brands/${brandId}/${action}`, {
            method: "PATCH",
            headers: { ...authHeaders(token), "Content-Type": "application/json" },
            body: action === "reject" ? JSON.stringify({ reason: "Rejected from app admin dashboard" }) : undefined,
        });

        const payload = await readJsonResponse<{ message?: string }>(response);
        if (!response.ok) {
            pushToast({
                tone: "error",
                title: `Brand ${action === "approve" ? "approval" : "rejection"} failed`,
                message: payload?.message ?? `Could not ${action} brand.`,
            });
            return;
        }

        pushToast({
            tone: "success",
            title: `Brand ${action === "approve" ? "approved" : "rejected"}`,
            message: action === "approve" ? "The brand is now active." : "The brand has been rejected.",
        });
        await load();
    };

    const suspendBrandAdmin = async (userId: string) => {
        if (!confirm("Suspend this brand admin and disable their linked brand/deals?")) return;

        const token = await getToken();
        const response = await fetch(`${apiBaseUrl}/api/app-admin/brand-admins/${encodeURIComponent(userId)}/suspend`, {
            method: "PATCH",
            headers: authHeaders(token),
        });
        const payload = await readJsonResponse<{ message?: string }>(response);

        if (!response.ok) {
            pushToast({
                tone: "error",
                title: "Suspend failed",
                message: payload?.message ?? "Could not suspend brand admin.",
            });
            return;
        }

        pushToast({
            tone: "success",
            title: "Brand admin suspended",
            message: "The brand admin has been suspended.",
        });
        await load();
    };

    const deleteBrandAdmin = async (userId: string) => {
        if (!confirm("Permanently remove this brand admin, their brand, and that brand's deals?")) return;

        const token = await getToken();
        const response = await fetch(`${apiBaseUrl}/api/app-admin/brand-admins/${encodeURIComponent(userId)}`, {
            method: "DELETE",
            headers: authHeaders(token),
        });
        const payload = await readJsonResponse<{ message?: string }>(response);

        if (!response.ok) {
            pushToast({
                tone: "error",
                title: "Removal failed",
                message: payload?.message ?? "Could not remove brand admin.",
            });
            return;
        }

        pushToast({
            tone: "success",
            title: "Brand admin removed",
            message: "The brand admin and linked data were removed.",
        });
        await load();
    };

    const deleteEndUser = async (userId: string) => {
        if (!confirm("Permanently delete this end user account?")) return;

        const token = await getToken();
        const response = await fetch(`${apiBaseUrl}/api/app-admin/end-users/${encodeURIComponent(userId)}`, {
            method: "DELETE",
            headers: authHeaders(token),
        });
        const payload = await readJsonResponse<{ message?: string }>(response);

        if (!response.ok) {
            pushToast({
                tone: "error",
                title: "Delete failed",
                message: payload?.message ?? "Could not delete end user.",
            });
            return;
        }

        pushToast({
            tone: "success",
            title: "End user deleted",
            message: "The end user account was deleted.",
        });
        await load();
    };



    const pendingBrandsList = pendingBrands;
    const activeBrandList = brandFilter === "approved"
        ? approvedBrands
        : brandFilter === "rejected"
            ? rejectedBrands
            : pendingBrandsList;

    return (
        <main className="min-h-screen bg-[#f6f6f6] text-slate-900">
            <ToastStack toasts={toasts} onDismiss={dismiss} />
            <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-expanded={isSidebarOpen}
                aria-controls="app-admin-sidebar"
                aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
                className="fixed left-4 top-4 z-40 flex items-center justify-center rounded-full border border-slate-200 bg-white/95 p-3 text-slate-700 shadow-lg backdrop-blur transition hover:border-red-200 hover:text-red-700 lg:hidden"
            >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="4" y1="7" x2="20" y2="7" />
                        <line x1="4" y1="12" x2="20" y2="12" />
                        <line x1="4" y1="17" x2="20" y2="17" />
                    </svg>
                </span>
            </button>
            <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
                {isSidebarOpen ? (
                    <button
                        type="button"
                        aria-label="Close navigation"
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 z-20 bg-black/30 lg:hidden"
                    />
                ) : null}
                <aside
                    id="app-admin-sidebar"
                    className={`fixed inset-y-0 left-0 z-30 w-72 max-w-[85vw] -translate-x-full border-r border-slate-200 bg-white p-5 shadow-xl transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0 lg:w-64 lg:max-w-none lg:rounded-3xl lg:border lg:p-6 lg:shadow-sm ${
                        isSidebarOpen ? "translate-x-0" : ""
                    }`}
                >
                    <div className="space-y-6">

                        <nav className="grid gap-2">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        setIsSidebarOpen(false);
                                    }}
                                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                                        activeTab === tab.id
                                            ? "border-red-200 bg-red-50 text-red-700"
                                            : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className={`text-[10px] ${activeTab === tab.id ? "text-red-600" : "text-slate-400"}`}>View</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-yellow-700">System status</p>
                        <p className="mt-1 text-xs text-slate-600">Approvals and moderation actions are live.</p>
                    </div> */}
                </aside>

                <section className="flex-1 space-y-4">
                    <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">App admin</p>
                                <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Admin control center</h1>
                                <p className="mt-1 max-w-3xl text-xs text-slate-500">Review brands, users, and deals with precision and clear auditability.</p>
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                                <button
                                    type="button"
                                    onClick={() => void signOut()}
                                    className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    </header>

                    {loading ? <p className="text-xs text-slate-500">Loading dashboard...</p> : null}

                    {loading && activeTab === "overview" ? (
                        <section className="grid gap-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {Array.from({ length: 4 }).map((_, index) => (
                                    <SkeletonCard key={index} />
                                ))}
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200" />
                                    <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                                </div>
                                <div className="mt-3">
                                    <SkeletonList rows={3} />
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {loading && activeTab === "brands" ? (
                        <section className="grid gap-4">
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
                                    <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                                </div>
                                <div className="mt-3">
                                    <SkeletonList rows={3} />
                                </div>
                            </div>
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200" />
                                <div className="mt-3">
                                    <SkeletonList rows={2} />
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {loading && activeTab === "users" ? (
                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200" />
                                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                            </div>
                            <div className="mt-3">
                                <SkeletonList rows={4} />
                            </div>
                        </section>
                    ) : null}

                    {loading && activeTab === "deals" ? (
                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200" />
                                <div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" />
                            </div>
                            <div className="mt-3">
                                <SkeletonList rows={3} />
                            </div>
                        </section>
                    ) : null}

                    {!loading && activeTab === "overview" ? (
                        <section className="grid gap-4">
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                {stats.map((stat) => (
                                    <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone} />
                                ))}
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">All brands</h2>
                                        <p className="text-xs text-slate-500">Everything registered so far.</p>
                                    </div>
                                    <StatusPill tone="good">{allBrands.length} brands</StatusPill>
                                </div>
                                <div className="mt-3 grid gap-3">
                                    {allBrands.map((brand) => (
                                        <BrandCard key={brand.brandId} brand={brand} />
                                    ))}
                                    {allBrands.length === 0 ? (
                                        <EmptyState title="No brands yet" body="Brand profiles will appear here once merchants register." />
                                    ) : null}
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {!loading && activeTab === "deals" ? <AppAdminAnalyticsMain showSignOut={false} /> : null}

                    {!loading && activeTab === "brands" ? (
                        <section className="grid gap-4">
                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">Brand approvals</h2>
                                        <p className="text-xs text-slate-500">Switch between pending, approved, and rejected lists.</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                                        {([
                                            { id: "pending", label: "Pending" },
                                            { id: "approved", label: "Approved" },
                                            { id: "rejected", label: "Rejected" },
                                        ] as const).map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => setBrandFilter(item.id)}
                                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                                    brandFilter === item.id
                                                        ? "bg-white text-red-700 shadow-sm"
                                                        : "text-slate-500 hover:text-slate-900"
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex items-end justify-between gap-2">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {brandFilter === "approved"
                                                ? "Approved brands"
                                                : brandFilter === "rejected"
                                                    ? "Rejected brands"
                                                    : "Pending brands"}
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {brandFilter === "approved"
                                                ? "All active partners."
                                                : brandFilter === "rejected"
                                                    ? "Declined applications for reference."
                                                    : "Approve or reject incoming requests."}
                                        </p>
                                    </div>
                                    <StatusPill tone={brandFilter === "approved" ? "good" : brandFilter === "rejected" ? "danger" : "warn"}>
                                        {activeBrandList.length} {brandFilter}
                                    </StatusPill>
                                </div>
                                <div className="mt-3 grid gap-3">
                                    {activeBrandList.map((brand) => (
                                        <BrandCard
                                            key={brand.brandId}
                                            brand={brand}
                                            showActions={brandFilter === "pending"}
                                            onApprove={(brandId) => void decide(brandId, "approve")}
                                            onReject={(brandId) => void decide(brandId, "reject")}
                                        />
                                    ))}
                                    {activeBrandList.length === 0 ? (
                                        <EmptyState
                                            title={brandFilter === "approved" ? "No approved brands" : brandFilter === "rejected" ? "No rejected brands" : "No pending brands"}
                                            body={
                                                brandFilter === "approved"
                                                    ? "Approved brands will show up here after review."
                                                    : brandFilter === "rejected"
                                                        ? "Rejected brands will appear here after review."
                                                        : "New brand admin requests will appear here."
                                            }
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {!loading && activeTab === "users" ? (
                        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">End users</h2>
                                    <p className="text-xs text-slate-500">Customer accounts across the platform.</p>
                                </div>
                                <StatusPill tone="good">{endUsers.length} users</StatusPill>
                            </div>
                            <div className="mt-3 grid gap-3">
                                {endUsers.map((user) => (
                                    <UserCard key={user.id} user={user} onDelete={(userId) => void deleteEndUser(userId)} />
                                ))}
                                {endUsers.length === 0 ? <EmptyState title="No end users" body="Consumer accounts will appear here once users sign up." /> : null}
                            </div>
                        </section>
                    ) : null}

                </section>
            </div>
        </main>
    );
}
