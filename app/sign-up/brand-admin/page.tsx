"use client";

import Link from "next/link";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiBaseUrl, readJsonResponse, uploadImage } from "@/lib/deals";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

type Draft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  title: string;
  brandName: string;
  tagline: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  cities: string;
  areas: string;
  cuisineTags: string;
  website: string;
  notes: string;
  instagram: string;
  facebook: string;
  scrapeRequested: boolean;
};

const initialDraft: Draft = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  title: "",
  brandName: "",
  tagline: "",
  description: "",
  contactEmail: "",
  contactPhone: "",
  country: "Pakistan",
  cities: "",
  areas: "",
  cuisineTags: "",
  website: "",
  notes: "",
  instagram: "",
  facebook: "",
  scrapeRequested: false,
};

const list = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const inputClass = "rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 outline-none focus:border-red-500";
const labelClass = "grid gap-2 text-sm font-semibold text-slate-200";
type MessageTone = "error" | "success";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value: string) => /^[+()\d\s-]{7,20}$/.test(value.trim());
const isValidUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return true;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export default function BrandAdminSignUpPage() {
  const clerk = useClerk();
  const { user } = useUser();
  const router = useRouter();
  const [draft, setDraft] = useState(initialDraft);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [showVerification, setShowVerification] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
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

  const validate = () => {
    if (draft.scrapeRequested && !draft.website.trim()) return "Website URL is required when scraper setup is requested.";
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.email.trim() || !draft.password.trim() || !draft.phone.trim() || !draft.title.trim()) return "Complete all admin fields.";
    if (!draft.brandName.trim() || !draft.description.trim() || !draft.contactEmail.trim() || !draft.contactPhone.trim() || !draft.country.trim() || list(draft.cities).length === 0) return "Complete all required brand fields.";
    if (!isValidEmail(draft.email)) return "Enter a valid admin email address.";
    if (!isValidEmail(draft.contactEmail)) return "Enter a valid brand contact email address.";
    if (draft.password.length < 8) return "Password must be at least 8 characters.";
    if (!isValidPhone(draft.phone)) return "Enter a valid admin phone number.";
    if (!isValidPhone(draft.contactPhone)) return "Enter a valid brand contact phone number.";
    if (!isValidUrl(draft.website)) return "Enter a valid website URL, including http:// or https://.";
    if (!isValidUrl(draft.instagram)) return "Enter a valid Instagram URL, including http:// or https://.";
    if (!isValidUrl(draft.facebook)) return "Enter a valid Facebook URL, including http:// or https://.";
    if (!logoFile) return "Brand logo is required.";
    if (!logoFile.type.startsWith("image/")) return "Brand logo must be an image file.";
    return null;
  };

  const submitBrandOnboarding = async (clerkUserId: string) => {
    let logoUrl = uploadedLogoUrl;
    if (!logoUrl && logoFile) {
      logoUrl = await uploadImage(logoFile, "deals4you/brand-logos");
      setUploadedLogoUrl(logoUrl);
    }

    const response = await fetch(`${apiBaseUrl}/api/users/onboard/brand-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkUserId,
        email: draft.email.trim(),
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        phone: draft.phone.trim(),
        title: draft.title.trim(),
        brand: {
          name: draft.brandName.trim(),
          tagline: draft.tagline.trim() || undefined,
          description: draft.description.trim(),
          logoUrl: logoUrl || undefined,
          website: draft.website.trim() || undefined,
          contactEmail: draft.contactEmail.trim(),
          contactPhone: draft.contactPhone.trim(),
          country: draft.country.trim(),
          cities: list(draft.cities),
          areas: list(draft.areas),
          cuisineTags: list(draft.cuisineTags),
          socials: {
            instagram: draft.instagram.trim(),
            facebook: draft.facebook.trim(),
          },
          notes: draft.notes.trim() || undefined,
          scrapeRequested: draft.scrapeRequested,
        },
      }),
    });

    const payload = await readJsonResponse<{ message?: string; error?: string }>(response);
    if (!response.ok) {
      throw new Error(payload?.message ?? payload?.error ?? "Brand onboarding failed.");
    }
  };

  const createAccount = async () => {
    setMessage(null);
    const validation = validate();
    if (validation) {
      showError(validation);
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
      showSuccess(`Verification code sent to ${draft.email.trim()}. Enter it below to submit your brand for review.`);
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

      await submitBrandOnboarding(completeSignUp.createdUserId);

      showSuccess("Brand submitted for review. Redirecting...");
      await clerk.setActive({ session: completeSignUp.createdSessionId });
      router.push("/brand-admin/pending");
    } catch (error) {
      const message = errorMessage(error, "Could not submit brand for review.");
      if (message.toLowerCase().includes("already signed in") && user?.id) {
        try {
          await submitBrandOnboarding(user.id);
          showSuccess("Brand submitted for review. Redirecting...");
          router.push("/brand-admin/pending");
          return;
        } catch (recoveryError) {
          showError(errorMessage(recoveryError, "Could not submit brand for review."));
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
      <FoodBackground blocks={5} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center justify-center">
        <section className="w-full max-w-4xl rounded-[2rem] border border-white/10 bg-[#1f1f1f]/95 p-8 shadow-2xl shadow-black/40 sm:p-10">
          <div className="flex justify-center">
            <DealsLogo priority />
          </div>
          <h1 className="mt-2 text-center text-3xl font-bold">Sign up as brand admin</h1>
          <p className="mt-2 text-center text-sm text-slate-400">Create a brand profile. Your account will be reviewed before the dashboard unlocks.</p>

          {needsCode ? (
            <form action={verify} className="mt-7 grid gap-4">
              <label className={labelClass}>
                <span><span className="text-red-400">*</span> Verification code</span>
                <input name="code" required className={inputClass} />
              </label>
              {message ? <p className={messageClass}>{message}</p> : null}
              <button disabled={isWorking} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:opacity-60">
                {isWorking ? "Verifying..." : "Verify and submit brand"}
              </button>
            </form>
          ) : (
            <>
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Admin first name</span>
                  <input value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Admin last name</span>
                  <input value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Admin email</span>
                  <input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Password</span>
                  <input type="password" value={draft.password} onChange={(e) => update("password", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Admin phone</span>
                  <input value={draft.phone} onChange={(e) => update("phone", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Role / title</span>
                  <input value={draft.title} onChange={(e) => update("title", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Brand name</span>
                  <input value={draft.brandName} onChange={(e) => update("brandName", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  Tagline (optional)
                  <input value={draft.tagline} onChange={(e) => update("tagline", e.target.value)} className={inputClass} />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  <span><span className="text-red-400">*</span> Short brand description</span>
                  <textarea value={draft.description} onChange={(e) => update("description", e.target.value)} required className={`${inputClass} min-h-28`} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Brand contact email</span>
                  <input type="email" value={draft.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Brand contact phone</span>
                  <input value={draft.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Country</span>
                  <input value={draft.country} onChange={(e) => update("country", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  <span><span className="text-red-400">*</span> Cities, comma separated</span>
                  <input value={draft.cities} onChange={(e) => update("cities", e.target.value)} required className={inputClass} />
                </label>
                <label className={labelClass}>
                  Areas / branches, comma separated
                  <input value={draft.areas} onChange={(e) => update("areas", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  Cuisine tags, comma separated
                  <input value={draft.cuisineTags} onChange={(e) => update("cuisineTags", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  Instagram URL (optional)
                  <input type="url" value={draft.instagram} onChange={(e) => update("instagram", e.target.value)} className={inputClass} />
                </label>
                <label className={labelClass}>
                  Facebook URL (optional)
                  <input type="url" value={draft.facebook} onChange={(e) => update("facebook", e.target.value)} className={inputClass} />
                </label>
                <label className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-sm font-semibold text-slate-200">
                  <span><span className="text-red-400">*</span> Brand logo</span>
                  <input type="file" accept="image/*" required onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm" />
                </label>
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-sm font-semibold">
                  Request website scraper
                  <input type="checkbox" checked={draft.scrapeRequested} onChange={(e) => update("scrapeRequested", e.target.checked)} className="h-5 w-5 accent-red-600" />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  {draft.scrapeRequested ? (
                    <span><span className="text-red-400">*</span> Website URL</span>
                  ) : (
                    "Website URL (optional)"
                  )}
                  <input type="url" value={draft.website} onChange={(e) => update("website", e.target.value)} required={draft.scrapeRequested} className={inputClass} />
                </label>
                <label className={`${labelClass} md:col-span-2`}>
                  Notes for review (optional)
                  <textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} className={`${inputClass} min-h-24`} />
                </label>
              </div>
              {message ? <p className={messageClass}>{message}</p> : null}
              <button type="button" onClick={() => void createAccount()} disabled={isWorking} className="mt-6 w-full rounded-full bg-red-600 px-5 py-3 text-sm font-bold transition hover:bg-red-500 disabled:opacity-60">
                {isWorking ? "Creating..." : "Create brand admin account"}
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
