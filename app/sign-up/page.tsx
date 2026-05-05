"use client";

import Link from "next/link";
import { useState } from "react";
import { useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiBaseUrl, readJsonResponse } from "@/lib/deals";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

type ConsumerDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  area: string;
  foodPreferences: string;
};

const initialDraft: ConsumerDraft = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  city: "",
  area: "",
  foodPreferences: "",
};

const inputClass = "rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 outline-none focus:border-red-500";
const labelClass = "grid gap-2 text-sm font-semibold text-slate-200";
type MessageTone = "error" | "success";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value: string) => !value.trim() || /^[+()\d\s-]{7,20}$/.test(value.trim());

export default function Page() {
  const { signUp, errors, fetchStatus } = useSignUp();
  const { signIn } = useSignIn();
  const { user } = useUser();
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [showVerification, setShowVerification] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const update = (key: keyof ConsumerDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const showError = (value: string) => {
    setMessageTone("error");
    setMessage(value);
  };
  const showSuccess = (value: string) => {
    setMessageTone("success");
    setMessage(value);
  };

  const createAccount = async () => {
    setMessage(null);
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim() || !draft.password.trim()) {
      showError("Complete all required fields.");
      return;
    }
    if (!isValidEmail(draft.email)) {
      showError("Enter a valid email address.");
      return;
    }
    if (draft.password.length < 8) {
      showError("Password must be at least 8 characters.");
      return;
    }
    if (!isValidPhone(draft.phone)) {
      showError("Enter a valid phone number or leave it blank.");
      return;
    }

    setIsWorking(true);
    try {
      const passwordResult = await signUp.password({
        emailAddress: draft.email.trim(),
        password: draft.password,
      });
      if (passwordResult.error) {
        showError(passwordResult.error.longMessage ?? passwordResult.error.message);
        return;
      }

      const updateResult = await signUp.update({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
      });
      if (updateResult.error) {
        showError(updateResult.error.longMessage ?? updateResult.error.message);
        return;
      }

      const verificationResult = await signUp.verifications.sendEmailCode();
      if (verificationResult.error) {
        showError(verificationResult.error.longMessage ?? verificationResult.error.message);
        return;
      }

      setShowVerification(true);
      showSuccess(`Verification code sent to ${draft.email.trim()}. Enter it below to finish creating your account.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setIsWorking(false);
    }
  };

  const submitConsumerProfile = async (clerkUserId: string) => {
    const response = await fetch(`${apiBaseUrl}/api/users/upsert-from-clerk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkUserId,
        email: draft.email.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        role: "END_USER",
        tenantId: null,
        brandId: null,
        metadata: {
          source: "clerk",
          phone: draft.phone.trim() || null,
          city: draft.city.trim() || null,
          area: draft.area.trim() || null,
          foodPreferences: draft.foodPreferences.split(",").map((item) => item.trim()).filter(Boolean),
        },
      }),
    });
    const payload = await readJsonResponse<{ message?: string; error?: string }>(response);
    if (!response.ok) {
      throw new Error(payload?.message ?? payload?.error ?? "Account was created in Clerk, but profile setup failed.");
    }
  };

  const verify = async (formData: FormData) => {
    setMessage(null);
    const code = String(formData.get("code") ?? "").trim();
    setIsWorking(true);
    try {
      if (clerkSignUpComplete) {
        await submitConsumerProfile(signUp.createdUserId!);
        showSuccess("Account created. Signing you in...");
        setDraft(initialDraft);
        await signUp.finalize({
          navigate: () => router.push("/"),
        });
        return;
      }

      if (!code) {
        showError("Enter the verification code from your email.");
        return;
      }

      const verificationResult = await signUp.verifications.verifyEmailCode({ code });
      if (verificationResult.error) {
        const msg = verificationResult.error.longMessage ?? verificationResult.error.message ?? "";
        const recoveryId = user?.id ?? signUp.createdUserId ?? null;
        if (recoveryId && /already|signed in|complete|verified/i.test(msg)) {
          await submitConsumerProfile(recoveryId);
          showSuccess("Account created. Signing you in...");
          setDraft(initialDraft);
          await signUp.finalize({
            navigate: () => router.push("/"),
          });
          return;
        }
        showError(msg || "Verification failed.");
        return;
      }

      if (signUp.status !== "complete" || !signUp.createdUserId) {
        showError("Verification is not complete yet. Check the code and try again.");
        return;
      }

      await submitConsumerProfile(signUp.createdUserId);
      showSuccess("Account created. Signing you in...");
      setDraft(initialDraft);
      await signUp.finalize({
        navigate: () => router.push("/"),
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "Could not finish account creation.");
    } finally {
      setIsWorking(false);
    }
  };

  const signUpWithGoogle = async () => {
    setMessage(null);
    const { error } = await signIn.sso({
      strategy: "oauth_google",
      redirectUrl: "/sign-in",
      redirectCallbackUrl: "/sso-callback",
    });
    if (error) showError(error.longMessage ?? error.message);
  };

  const needsCode =
    showVerification ||
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const clerkSignUpComplete = signUp.status === "complete" && !!signUp.createdUserId;
  const messageClass =
    messageTone === "success"
      ? "mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
      : "mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={4} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-[#1f1f1f]/95 p-8 shadow-2xl shadow-black/40 sm:p-10">
          <div className="flex justify-center">
            <DealsLogo priority />
          </div>
          <h1 className="mt-2 text-center text-3xl font-bold">Sign up as user</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Create a consumer profile for recommendations and deals.</p>

          {needsCode ? (
            <form action={verify} className="mt-7 grid gap-4">
              <label className={labelClass}>
                <span><span className="text-red-400">*</span> Verification code</span>
                <input name="code" required={!clerkSignUpComplete} className={inputClass} />
              </label>
              {errors.fields.code ? <p className="text-sm text-red-300">{errors.fields.code.message}</p> : null}
              {message ? <p className={messageClass}>{message}</p> : null}
              <button disabled={isWorking || fetchStatus === "fetching"} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:opacity-60">
                {isWorking || fetchStatus === "fetching" ? "Verifying..." : "Verify and continue"}
              </button>
            </form>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void signUpWithGoogle().catch((error) => setMessage(error instanceof Error ? error.message : "Google sign up failed."))}
                className="mt-7 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-200 flex items-center justify-center"
              >
                <span className="mr-3 flex h-5 w-5 items-center justify-center">
                  <svg aria-hidden="true" focusable="false" width="20" height="20" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.1H272v104.4h146.9c-6.3 34.1-25.4 62.9-54.2 82.1v68.1h87.5c51.3-47.2 80.3-116.9 80.3-199.5z"/>
                    <path fill="#34A853" d="M272 544.3c73.7 0 135.6-24.3 180.8-66.2l-87.5-68.1c-24.4 16.4-55.7 26-93.3 26-71.7 0-132.5-48.3-154.2-113.2H27.4v70.9C72.6 488.6 165.8 544.3 272 544.3z"/>
                    <path fill="#FBBC05" d="M117.8 325.7c-10.3-30.6-10.3-63.6 0-94.2V160.6H27.4c-39.2 76.2-39.2 166.1 0 242.3l90.4-77.2z"/>
                    <path fill="#EA4335" d="M272 108.6c39.9-.6 78.3 14.6 107.4 41.9l80.4-80.4C407.8 25.7 345.9 0 272 0 165.8 0 72.6 55.7 27.4 160.6l90.4 70.9C139.5 156.9 200.3 108.6 272 108.6z"/>
                  </svg>
                </span>
                <span>Continue with Google</span>
              </button>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> First name</span>
                  <input value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Last name</span>
                  <input value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} required className={inputClass} />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  <span><span className="text-red-400">*</span> Email</span>
                  <input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} required className={inputClass} />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  <span><span className="text-red-400">*</span> Password</span>
                  <input type="password" value={draft.password} onChange={(e) => update("password", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  Phone (optional)
                  <input value={draft.phone} onChange={(e) => update("phone", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  City (optional)
                  <input value={draft.city} onChange={(e) => update("city", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  Area (optional)
                  <input value={draft.area} onChange={(e) => update("area", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  Food preferences, comma separated
                  <input value={draft.foodPreferences} onChange={(e) => update("foodPreferences", e.target.value)} className={inputClass} />
                </label>
              </div>
              {message ? <p className={messageClass}>{message}</p> : null}
              <button type="button" onClick={() => void createAccount()} disabled={isWorking || fetchStatus === "fetching"} className="mt-6 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:opacity-60">
                {isWorking || fetchStatus === "fetching" ? "Creating..." : "Create user account"}
              </button>
            </>
          )}

          <p className="mt-7 text-center text-sm text-slate-400">
            Already registered? <Link href="/sign-in" className="font-semibold text-yellow-400">Sign in</Link>
          </p>
          <div id="clerk-captcha" className="mt-4" />
        </section>
      </div>
    </main>
  );
}
