"use client";

import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

export default function AccountSuspendedPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={4} />
      <section className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#1f1f1f]/95 p-8 text-center shadow-2xl shadow-black/40 sm:p-10">
        <div className="flex justify-center">
          <DealsLogo priority />
        </div>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-yellow-400">Account suspended</p>
        <h1 className="mt-2 text-3xl font-bold">Your account is currently inactive</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Access to this account has been suspended by an app admin. If you believe this was a mistake, contact Deals4You support or your account owner.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <SignOutButton redirectUrl="/sign-in">
            <button className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500">
              Sign out
            </button>
          </SignOutButton>
          <Link href="/" className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
