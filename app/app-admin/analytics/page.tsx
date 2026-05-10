"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";

type AnalyticsOverview = {
    totalVisits: number;
    uniqueVisitors: number;
    totalRedirections: number;
    activeBrands: number;
};

type RedirectionSummary = {
    website: string;
    count: number;
    last24h: number;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        </div>
    );
}

function EmptyState({ title, body }: { title: string; body: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">{body}</p>
        </div>
    );
}

function SignInGate() {
    return (
        <main className="min-h-screen bg-[#f8f8f8] px-4 py-4 text-slate-900">
            <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-xl items-center justify-center">
                <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">App admin</p>
                    <h1 className="mt-1 text-xl font-semibold text-slate-900">Sign in required</h1>
                    <p className="mt-2 text-xs text-slate-500">Use the app admin dashboard to access analytics.</p>
                </section>
            </div>
        </main>
    );
}

export default function AppAdminAnalyticsPage() {
    const { isLoaded, isSignedIn } = useAuth();
    const { signOut } = useClerk();

    if (!isLoaded || !isSignedIn) {
        return <SignInGate />;
    }

    return (
        <main className="min-h-screen bg-[#f6f6f6] text-slate-900">
            <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6">
                <aside className="hidden w-64 flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex">
                    <div className="space-y-6">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">App admin</p>
                            <h2 className="mt-2 text-lg font-semibold text-slate-900">Analytics suite</h2>
                            <p className="mt-1 text-xs text-slate-500">Track visits and redirections across the platform.</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">Data source</p>
                            <p className="mt-1 text-xs text-slate-500">Awaiting API wiring</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => void signOut()}
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                        Log out
                    </button>
                </aside>

                <section className="flex-1">
                    <AppAdminAnalyticsMain />
                </section>
            </div>
        </main>
    );
}

export function AppAdminAnalyticsMain({ showSignOut = true }: { showSignOut?: boolean }) {
    const { signOut } = useClerk();
    const { isLoaded, isSignedIn } = useAuth();
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [redirections, setRedirections] = useState<RedirectionSummary[]>([]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;

        setLoading(true);
        const timeout = setTimeout(() => {
            setOverview({
                totalVisits: 0,
                uniqueVisitors: 0,
                totalRedirections: 0,
                activeBrands: 0,
            });
            setRedirections([]);
            setLoading(false);
        }, 300);

        return () => clearTimeout(timeout);
    }, [isLoaded, isSignedIn]);

    const stats = useMemo(() => {
        return [
            { label: "Total visits", value: overview?.totalVisits ?? 0 },
            { label: "Unique visitors", value: overview?.uniqueVisitors ?? 0 },
            { label: "Total redirections", value: overview?.totalRedirections ?? 0 },
            { label: "Active brands", value: overview?.activeBrands ?? 0 },
        ];
    }, [overview]);

    if (!isLoaded || !isSignedIn) {
        return null;
    }

    return (
        <div className="space-y-4">

            {loading ? <p className="text-xs text-slate-500">Loading analytics...</p> : null}

            <section className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {stats.map((stat) => (
                        <StatCard key={stat.label} label={stat.label} value={stat.value} />
                    ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Redirections by website</h2>
                            <p className="text-xs text-slate-500">Track where users are sent after clicking deals.</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-400">Last 24 hours</span>
                    </div>

                    <div className="mt-3">
                        {redirections.length === 0 ? (
                            <EmptyState title="No analytics yet" body="API data will populate this table once available." />
                        ) : (
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                                <div className="grid grid-cols-3 border-b border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                                    <span>Website</span>
                                    <span>Total</span>
                                    <span>Last 24h</span>
                                </div>
                                {redirections.map((row) => (
                                    <div key={row.website} className="grid grid-cols-3 px-3 py-2 text-xs text-slate-700">
                                        <span className="truncate font-semibold text-slate-900">{row.website}</span>
                                        <span>{row.count}</span>
                                        <span>{row.last24h}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Traffic timeline</h2>
                    <p className="text-xs text-slate-500">Add charts once API data arrives.</p>
                    <div className="mt-3">
                        <EmptyState title="Timeline placeholder" body="Awaiting analytics API structure." />
                    </div>
                </div>
            </section>
        </div>
    );
}
