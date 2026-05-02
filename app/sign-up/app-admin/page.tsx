"use client";

import Link from "next/link";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiBaseUrl, readJsonResponse } from "@/lib/deals";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const initialDraft: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

const inputClass = "rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 outline-none focus:border-red-500";
const labelClass = "grid gap-2 text-sm font-semibold text-slate-200";
type MessageTone = "error" | "success";

export default function AppAdminSignUpPage() {
  const clerk = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [showVerification, setShowVerification] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const update = (key: keyof Draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const showError = (value: string) => {
    setMessageTone("error");
    setMessage(value);
  };

  const showSuccess = (value: string) => {
    setMessageTone("success");
    setMessage(value);
  };
  const errorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error !== null) {
      const payload = error as {
        errors?: Array<{ longMessage?: string; message?: string }>;
        longMessage?: string;
        message?: string;
      };
      return payload.errors?.[0]?.longMessage ?? payload.errors?.[0]?.message ?? payload.longMessage ?? payload.message ?? fallback;
    }
    return fallback;
  };

  const submitAppAdminProfile = async (clerkUserId: string) => {
    const response = await fetch(`${apiBaseUrl}/api/users/upsert-from-clerk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkUserId,
        email: draft.email.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        role: "APP_ADMIN",
        tenantId: null,
        brandId: null,
        metadata: {
          source: "clerk",
          createdFor: "app-admin-dashboard",
        },
      }),
    });

    const payload = await readJsonResponse<{ message?: string; error?: string }>(response);

    if (!response.ok) {
      throw new Error(payload?.message ?? payload?.error ?? "Account was created in Clerk, but app admin setup failed.");
    }
  };

  const createAccount = async () => {
    setMessage(null);

    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim() || !draft.password.trim()) {
      showError("Complete all required fields.");
      return;
    }

    setIsWorking(true);
    try {
      const signUpAttempt = await clerk.client.signUp.create({
        emailAddress: draft.email.trim(),
        password: draft.password,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
      });

      await signUpAttempt.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setShowVerification(true);
      showSuccess(`Verification code sent to ${draft.email.trim()}.`);
    } catch (error) {
      showError(`Could not send verification code: ${errorMessage(error, "Clerk signup failed.")}`);
    } finally {
      setIsWorking(false);
    }
  };

  const verify = async (formData: FormData) => {
    setMessage(null);
    const code = String(formData.get("code") ?? "").trim();

    if (!code) {
      showError("Enter the verification code from your email.");
      return;
    }

    setIsWorking(true);
    try {
      const completeSignUp = await clerk.client.signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status !== "complete" || !completeSignUp.createdUserId || !completeSignUp.createdSessionId) {
        showError("Verification is not complete yet. Check the code and try again.");
        return;
      }

      await submitAppAdminProfile(completeSignUp.createdUserId);

      showSuccess("App admin account created. Signing you in...");
      setDraft(initialDraft);
      await clerk.setActive({ session: completeSignUp.createdSessionId });
      router.push("/app-admin/approvals");
    } catch (error) {
      const message = errorMessage(error, "Could not finish app admin setup.");
      if (message.toLowerCase().includes("already signed in") && user?.id) {
        try {
          await submitAppAdminProfile(user.id);
          showSuccess("App admin account created. Redirecting...");
          router.push("/app-admin/approvals");
          return;
        } catch (recoveryError) {
          showError(errorMessage(recoveryError, "Could not finish app admin setup."));
          return;
        }
      }

      showError(message);
    } finally {
      setIsWorking(false);
    }
  };

  const needsCode = showVerification;

  const messageClass =
    messageTone === "success"
      ? "mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
      : "mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={4} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#1f1f1f]/95 p-8 shadow-2xl shadow-black/40 sm:p-10">
          <div className="flex justify-center">
            <DealsLogo priority />
          </div>
          <h1 className="mt-2 text-center text-3xl font-bold">Create app admin</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Use this page to create an account for testing the admin dashboard.</p>

          {needsCode ? (
            <form action={verify} className="mt-7 grid gap-4">
              <label className={labelClass}>
                <span><span className="text-red-400">*</span> Verification code</span>
                <input name="code" required className={inputClass} />
              </label>
              {message ? <p className={messageClass}>{message}</p> : null}
              <button disabled={isWorking} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:opacity-60">
                {isWorking ? "Creating..." : "Verify and create app admin"}
              </button>
            </form>
          ) : (
            <>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> First name</span>
                  <input value={draft.firstName} onChange={(event) => update("firstName", event.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Last name</span>
                  <input value={draft.lastName} onChange={(event) => update("lastName", event.target.value)} required className={inputClass} />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  <span><span className="text-red-400">*</span> Email</span>
                  <input type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} required className={inputClass} />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  <span><span className="text-red-400">*</span> Password</span>
                  <input type="password" value={draft.password} onChange={(event) => update("password", event.target.value)} required className={inputClass} />
                </label>
              </div>
              {message ? <p className={messageClass}>{message}</p> : null}
              <button type="button" onClick={() => void createAccount()} disabled={isWorking} className="mt-6 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:opacity-60">
                {isWorking ? "Creating..." : "Create app admin account"}
              </button>
            </>
          )}

          <p className="mt-7 text-center text-sm text-slate-400">
            Already created? <Link href="/sign-in" className="font-semibold text-yellow-400">Sign in</Link>
          </p>
          <div id="clerk-captcha" className="mt-4" />
        </section>
      </div>
    </main>
  );
}
