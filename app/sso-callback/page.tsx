"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { FoodBackground } from "@/components/food-background";

export default function SSOCallbackPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={3} />
      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-[#1f1f1f]/95 p-8 text-center shadow-2xl shadow-black/40">
        <h1 className="text-2xl font-bold">Completing sign in</h1>
        <p className="mt-2 text-sm text-slate-400">Please wait while Google finishes connecting your account.</p>
        <div className="mt-5" id="clerk-captcha" />
        <AuthenticateWithRedirectCallback
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signInFallbackRedirectUrl="/sign-in"
          signUpFallbackRedirectUrl="/sign-in"
        />
      </section>
    </main>
  );
}
