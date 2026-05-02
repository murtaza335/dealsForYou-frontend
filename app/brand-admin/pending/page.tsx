"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDomainUser, type DomainUser } from "@/lib/deals";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

export default function PendingBrandPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<DomainUser | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = await getToken();
      const domainUser = await fetchDomainUser(token);
      if (domainUser && !domainUser.isActive) {
        router.replace("/account-suspended");
        return;
      }

      setUser(domainUser);
    };
    void load();
  }, [getToken, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={4} />
      <div className="fixed right-5 top-5 z-30 sm:right-7">
        <UserButton />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
        <section className="rounded-[2rem] border border-white/10 bg-[#1f1f1f] p-8 text-center shadow-2xl shadow-black/40">
          <DealsLogo className="mx-auto" />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Review pending</p>
          <h1 className="mt-3 text-3xl font-bold">{user?.brand?.name ?? "Your brand"} is waiting for approval</h1>
          <p className="mt-3 text-slate-400">
            An app admin needs to approve the brand before the dashboard unlocks. If scraper setup was requested, manual deal changes will remain locked.
          </p>
          <Link href="/sign-in" className="mt-7 inline-flex rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500">
            Back to sign in
          </Link>
        </section>
      </div>
    </main>
  );
}
