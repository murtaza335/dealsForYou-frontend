"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { apiBaseUrl, readJsonResponse, uploadImage } from "@/lib/deals";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

// ─── Types ───────────────────────────────────────────────────────────────────

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

type MessageTone = "error" | "success";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const STEPS = [
  { label: "Admin account" },
  { label: "Brand profile" },
  { label: "Review & submit" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const list = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidPhone = (value: string) =>
  /^[+()\d\s-]{7,20}$/.test(value.trim());

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

const errorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const payload = error as {
      errors?: Array<{ longMessage?: string; message?: string }>;
      longMessage?: string;
      message?: string;
    };
    return (
      payload.errors?.[0]?.longMessage ??
      payload.errors?.[0]?.message ??
      payload.longMessage ??
      payload.message ??
      fallback
    );
  }
  return fallback;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-center">
        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isDone = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div key={step.label} className="flex items-center">
              {/* Node */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                    isDone
                      ? "border-red-600 bg-red-600 text-white"
                      : isActive
                        ? "border-yellow-400 bg-yellow-400 text-black shadow-[0_0_0_4px_rgba(232,184,0,0.15)]"
                        : "border-white/10 bg-[#1e1e1e] text-white/30",
                  ].join(" ")}
                >
                  {isDone ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </div>
                <span
                  className={[
                    "text-xs font-semibold tracking-wide transition-colors duration-300",
                    isDone
                      ? "text-red-500"
                      : isActive
                        ? "text-yellow-400"
                        : "text-white/20",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {idx < STEPS.length - 1 && (
                <div
                  className={[
                    "mx-3 mb-6 h-0.5 w-16 transition-all duration-300 sm:w-24",
                    isDone ? "bg-red-600" : "bg-white/8",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepHeader({
  num,
  title,
  subtitle,
}: {
  num: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 border-b border-white/7 pb-5">
      <h2 className="font-display text-3xl tracking-wide text-white">
        <span className="text-yellow-400">{num}.</span> {title}
      </h2>
      <p className="mt-1 text-sm text-white/35">{subtitle}</p>
    </div>
  );
}

function Field({
  label,
  required,
  children,
  fullWidth,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={`grid gap-1.5 ${fullWidth ? "col-span-2" : ""}`}>
      <label className="text-xs font-semibold uppercase tracking-wider text-white/40">
        {label}
        {required && <span className="ml-0.5 text-yellow-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/15 focus:border-yellow-400";

function Message({
  text,
  tone,
}: {
  text: string;
  tone: MessageTone;
}) {
  return (
    <div
      className={[
        "mt-4 rounded-xl border px-4 py-3 text-sm",
        tone === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300",
      ].join(" ")}
    >
      {text}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 py-2.5 last:border-0">
      <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-white/30">
        {label}
      </span>
      <span className="text-right text-sm text-white/70">{value || "—"}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BrandAdminSignUpPage() {
  const clerk = useClerk();
  const { user } = useUser();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(initialDraft);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>("error");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "taken">("idle");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const emailCheckId = useRef(0);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((curr) => ({ ...curr, [key]: value }));

  const showError = (value: string) => {
    setMessageTone("error");
    setMessage(value);
  };

  const showSuccess = (value: string) => {
    setMessageTone("success");
    setMessage(value);
  };

  const resetEmailAvailability = () => {
    setEmailStatus("idle");
    setEmailMessage(null);
  };

  const isEmailTakenError = (error: unknown) => {
    const msg = errorMessage(error, "").toLowerCase();
    return (
      msg.includes("already") ||
      msg.includes("taken") ||
      msg.includes("exists") ||
      msg.includes("identifier")
    );
  };

  const clearClerkSignUpDraft = async () => {
    const maybeReset = (clerk.client.signUp as unknown as { reset?: () => Promise<void> }).reset;
    if (typeof maybeReset === "function") {
      try {
        await maybeReset.call(clerk.client.signUp);
      } catch {
        // Ignore cleanup failures.
      }
    }
  };

  const checkEmailAvailability = async (rawEmail: string) => {
    const email = rawEmail.trim();

    if (!email) {
      resetEmailAvailability();
      return;
    }

    if (!isValidEmail(email)) {
      resetEmailAvailability();
      return;
    }

    const requestId = ++emailCheckId.current;
    setEmailStatus("checking");
    setEmailMessage(null);

    try {
      await clerk.client.signUp.create({ emailAddress: email });

      if (requestId !== emailCheckId.current) return;

      resetEmailAvailability();
    } catch (error) {
      if (requestId !== emailCheckId.current) return;

      if (isEmailTakenError(error)) {
        setEmailStatus("taken");
        setEmailMessage("Email Already in use");
      } else {
        resetEmailAvailability();
      }
    } finally {
      void clearClerkSignUpDraft();
    }
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateStep1 = (): string | null => {
    if (
      !draft.firstName.trim() ||
      !draft.lastName.trim() ||
      !draft.email.trim() ||
      !draft.password.trim() ||
      !draft.phone.trim() ||
      !draft.title.trim()
    )
      return "Please complete all required fields.";
    if (!isValidEmail(draft.email)) return "Enter a valid email address.";
    if (emailStatus === "taken") return "This email is already taken.";
    if (draft.password.length < 8)
      return "Password must be at least 8 characters.";
    if (!isValidPhone(draft.phone)) return "Enter a valid phone number.";
    return null;
  };

  const validateStep2 = (): string | null => {
    if (
      !draft.brandName.trim() ||
      !draft.description.trim() ||
      !draft.contactEmail.trim() ||
      !draft.contactPhone.trim() ||
      !draft.country.trim() ||
      list(draft.cities).length === 0
    )
      return "Please complete all required brand fields.";
    if (!isValidEmail(draft.contactEmail))
      return "Enter a valid brand contact email.";
    if (!isValidPhone(draft.contactPhone))
      return "Enter a valid brand contact phone.";
    if (!logoFile) return "Brand logo is required.";
    if (!logoFile.type.startsWith("image/"))
      return "Brand logo must be an image file.";
    if (draft.scrapeRequested && !draft.website.trim())
      return "Website URL is required when scraper setup is requested.";
    if (!isValidUrl(draft.website))
      return "Enter a valid website URL, including http:// or https://.";
    if (!isValidUrl(draft.instagram))
      return "Enter a valid Instagram URL, including http:// or https://.";
    if (!isValidUrl(draft.facebook))
      return "Enter a valid Facebook URL, including http:// or https://.";
    return null;
  };

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goToStep2 = () => {
    setMessage(null);
    const err = validateStep1();
    if (err) {
      showError(err);
      return;
    }
    setStep(2);
  };

  const goToStep3 = () => {
    setMessage(null);
    const err = validateStep2();
    if (err) {
      showError(err);
      return;
    }
    setStep(3);
  };

  // ── Submission ──────────────────────────────────────────────────────────────

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

    const payload = await readJsonResponse<{ message?: string; error?: string }>(
      response,
    );
    if (!response.ok) {
      throw new Error(
        payload?.message ?? payload?.error ?? "Brand onboarding failed.",
      );
    }
  };

  const createAccount = async () => {
    setMessage(null);
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
      showSuccess(
        `Verification code sent to ${draft.email.trim()}. Enter it below.`,
      );
    } catch (error) {
      showError(
        `Could not send verification code: ${errorMessage(error, "Clerk signup failed.")}`,
      );
    } finally {
      setIsWorking(false);
    }
  };

  const verify = async () => {
    setMessage(null);
    const code = verifyCode.trim();
    if (!code) {
      showError("Enter the verification code from your email.");
      return;
    }

    setIsWorking(true);
    try {
      const completeSignUp =
        await clerk.client.signUp.attemptEmailAddressVerification({ code });

      if (
        completeSignUp.status !== "complete" ||
        !completeSignUp.createdUserId ||
        !completeSignUp.createdSessionId
      ) {
        showError("Verification is not complete. Check the code and try again.");
        return;
      }

      await submitBrandOnboarding(completeSignUp.createdUserId);

      showSuccess("Brand submitted for review. Redirecting...");
      await clerk.setActive({ session: completeSignUp.createdSessionId });
      router.push("/brand-admin/pending");
    } catch (error) {
      const msg = errorMessage(error, "Could not submit brand for review.");
      if (msg.toLowerCase().includes("already signed in") && user?.id) {
        try {
          await submitBrandOnboarding(user.id);
          showSuccess("Brand submitted for review. Redirecting...");
          router.push("/brand-admin/pending");
          return;
        } catch (recoveryError) {
          showError(
            errorMessage(recoveryError, "Could not submit brand for review."),
          );
          return;
        }
      }
      showError(msg);
    } finally {
      setIsWorking(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const btnBase =
    "rounded-full px-6 py-3 text-sm font-bold tracking-wide transition-all disabled:opacity-50";

  const reviewListValue = (csv: string) =>
    list(csv).join(" · ") || "—";

  // ── Step views ──────────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <>
      <StepHeader
        num="01"
        title="Admin account"
        subtitle="Your personal login and contact details"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="First name" required>
          <input
            className={inputClass}
            placeholder="Jane"
            value={draft.firstName}
            onChange={(e) => update("firstName", e.target.value)}
          />
        </Field>
        <Field label="Last name" required>
          <input
            className={inputClass}
            placeholder="Smith"
            value={draft.lastName}
            onChange={(e) => update("lastName", e.target.value)}
          />
        </Field>
        <Field label="Email address" required>
          <input
            type="email"
            className={inputClass}
            aria-invalid={emailStatus === "taken"}
            placeholder="jane@brand.com"
            value={draft.email}
            onChange={(e) => {
              update("email", e.target.value);
              resetEmailAvailability();
            }}
            onBlur={() => {
              void checkEmailAvailability(draft.email);
            }}
          />
          {emailStatus === "checking" ? (
            <p className="text-xs text-white/30">Checking email availability...</p>
          ) : emailMessage ? (
            <p className="text-xs text-red-400">{emailMessage}</p>
          ) : null}
        </Field>
        <Field label="Password" required>
          <input
            type="password"
            className={inputClass}
            placeholder="Min. 8 characters"
            value={draft.password}
            onChange={(e) => update("password", e.target.value)}
          />
        </Field>
        <Field label="Phone number" required>
          <input
            className={inputClass}
            placeholder="+92 300 000 0000"
            value={draft.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </Field>
        <Field label="Role / title" required>
          <input
            className={inputClass}
            placeholder="Marketing Manager"
            value={draft.title}
            onChange={(e) => update("title", e.target.value)}
          />
        </Field>
      </div>

      {message && <Message text={message} tone={messageTone} />}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={goToStep2}
          className={`${btnBase} bg-yellow-400 text-black hover:bg-yellow-300`}
        >
          Continue to brand profile →
        </button>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <StepHeader
        num="02"
        title="Brand profile"
        subtitle="Tell us about your restaurant brand"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Brand name" required>
          <input
            className={inputClass}
            placeholder="Burger Lab"
            value={draft.brandName}
            onChange={(e) => update("brandName", e.target.value)}
          />
        </Field>
        <Field label="Tagline">
          <input
            className={inputClass}
            placeholder="Crafted with obsession"
            value={draft.tagline}
            onChange={(e) => update("tagline", e.target.value)}
          />
        </Field>
        <Field label="Short description" required fullWidth>
          <textarea
            className={`${inputClass} min-h-24 resize-y`}
            placeholder="What makes your brand special..."
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <Field label="Contact email" required>
          <input
            type="email"
            className={inputClass}
            placeholder="hello@brand.com"
            value={draft.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
          />
        </Field>
        <Field label="Contact phone" required>
          <input
            className={inputClass}
            placeholder="+92 300 000 0000"
            value={draft.contactPhone}
            onChange={(e) => update("contactPhone", e.target.value)}
          />
        </Field>
        <Field label="Country" required>
          <input
            className={inputClass}
            value={draft.country}
            onChange={(e) => update("country", e.target.value)}
          />
        </Field>
        <Field label="Cities" required>
          <input
            className={inputClass}
            placeholder="Karachi, Lahore, Islamabad"
            value={draft.cities}
            onChange={(e) => update("cities", e.target.value)}
          />
        </Field>
        <Field label="Areas / branches">
          <input
            className={inputClass}
            placeholder="DHA, Gulberg, F-7"
            value={draft.areas}
            onChange={(e) => update("areas", e.target.value)}
          />
        </Field>
        <Field label="Cuisine tags">
          <input
            className={inputClass}
            placeholder="Burgers, Fast Food, American"
            value={draft.cuisineTags}
            onChange={(e) => update("cuisineTags", e.target.value)}
          />
        </Field>

        {/* Logo Upload */}
        <Field label="Brand logo" required>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-[#0d0d0d] py-5 text-center transition-colors hover:border-yellow-400/50">
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/10">
              <svg
                className="h-4 w-4 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            {logoFile ? (
              <span className="text-xs font-semibold text-yellow-400">
                {logoFile.name}
              </span>
            ) : (
              <span className="text-xs text-white/30">
                <span className="font-semibold text-yellow-400">
                  Click to upload
                </span>{" "}
                logo image
              </span>
            )}
          </label>
        </Field>

        {/* Scraper Toggle */}
        <Field label="Scraper setup">
          <button
            type="button"
            onClick={() => update("scrapeRequested", !draft.scrapeRequested)}
            className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-3 transition-colors hover:border-white/15"
          >
            <span className="text-sm text-white/50">
              Request website scraper
            </span>
            <div
              className={[
                "relative h-6 w-10 rounded-full transition-colors duration-200",
                draft.scrapeRequested ? "bg-yellow-400" : "bg-white/10",
              ].join(" ")}
            >
              <div
                className={[
                  "absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-200",
                  draft.scrapeRequested ? "left-5" : "left-1",
                ].join(" ")}
              />
            </div>
          </button>
        </Field>

        <Field
          label={draft.scrapeRequested ? "Website URL" : "Website URL"}
          required={draft.scrapeRequested}
          fullWidth
        >
          <input
            type="url"
            className={inputClass}
            placeholder="https://yourbrand.com"
            value={draft.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </Field>

        <Field label="Instagram URL">
          <input
            type="url"
            className={inputClass}
            placeholder="https://instagram.com/brand"
            value={draft.instagram}
            onChange={(e) => update("instagram", e.target.value)}
          />
        </Field>
        <Field label="Facebook URL">
          <input
            type="url"
            className={inputClass}
            placeholder="https://facebook.com/brand"
            value={draft.facebook}
            onChange={(e) => update("facebook", e.target.value)}
          />
        </Field>

        <Field label="Notes for reviewer" fullWidth>
          <textarea
            className={`${inputClass} min-h-20 resize-y`}
            placeholder="Anything you want our team to know..."
            value={draft.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </Field>
      </div>

      {message && <Message text={message} tone={messageTone} />}

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => { setMessage(null); setStep(1); }}
          className={`${btnBase} border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80`}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={goToStep3}
          className={`${btnBase} flex-1 bg-yellow-400 text-black hover:bg-yellow-300`}
        >
          Review & submit →
        </button>
      </div>
    </>
  );

  const renderStep3 = () => {
    if (showVerification) {
      return (
        <div className="py-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400/10">
            <svg
              className="h-6 w-6 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-center font-display text-2xl tracking-wide text-white">
            Check your inbox
          </h2>
          <p className="mt-1 text-center text-sm text-white/35">
            We sent a code to{" "}
            <span className="font-semibold text-yellow-400">{draft.email}</span>
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="— — — — — —"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            className="mt-6 w-full rounded-xl border border-white/8 bg-[#0d0d0d] px-4 py-4 text-center text-2xl tracking-[0.6em] text-yellow-400 outline-none transition-colors placeholder:text-white/10 focus:border-yellow-400"
          />

          {message && <Message text={message} tone={messageTone} />}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => { setMessage(null); setShowVerification(false); }}
              className={`${btnBase} border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80`}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={isWorking}
              onClick={() => void verify()}
              className={`${btnBase} flex-1 bg-red-600 text-white hover:bg-red-500`}
            >
              {isWorking ? "Verifying..." : "Verify & submit brand ✓"}
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <StepHeader
          num="03"
          title="Review & submit"
          subtitle="Confirm everything looks right before sending for review"
        />

        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-yellow-400">
            Admin details
          </p>
          <ReviewRow
            label="Name"
            value={`${draft.firstName} ${draft.lastName}`}
          />
          <ReviewRow label="Email" value={draft.email} />
          <ReviewRow label="Phone" value={draft.phone} />
          <ReviewRow label="Title" value={draft.title} />
        </div>

        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-yellow-400">
            Brand details
          </p>
          <ReviewRow label="Brand" value={draft.brandName} />
          <ReviewRow label="Tagline" value={draft.tagline} />
          <ReviewRow label="Contact email" value={draft.contactEmail} />
          <ReviewRow label="Contact phone" value={draft.contactPhone} />
          <ReviewRow label="Country" value={draft.country} />
          <ReviewRow label="Cities" value={reviewListValue(draft.cities)} />
          <ReviewRow label="Areas" value={reviewListValue(draft.areas)} />
          <ReviewRow
            label="Cuisine"
            value={reviewListValue(draft.cuisineTags)}
          />
          <ReviewRow label="Website" value={draft.website} />
          <ReviewRow
            label="Scraper"
            value={draft.scrapeRequested ? "Requested" : "Not requested"}
          />
          <ReviewRow label="Logo" value={logoFile?.name ?? ""} />
        </div>

        {message && <Message text={message} tone={messageTone} />}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => { setMessage(null); setStep(2); }}
            className={`${btnBase} border border-white/10 text-white/50 hover:border-white/20 hover:text-white/80`}
          >
            ← Back
          </button>
          <button
            type="button"
            disabled={isWorking}
            onClick={() => void createAccount()}
            className={`${btnBase} flex-1 bg-red-600 text-white hover:bg-red-500`}
          >
            {isWorking ? "Creating..." : "Create account & submit brand →"}
          </button>
        </div>
      </>
    );
  };

  // ── Page ────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600&display=swap');
        .font-display { font-family: 'Bebas Neue', sans-serif; }
        body { font-family: 'DM Sans', sans-serif; }
      `}</style>

      <main className="relative min-h-screen overflow-hidden bg-[#0d0d0d] px-4 py-10 text-white">
        <FoodBackground blocks={5} />

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
          <section className="w-full rounded-3xl border border-white/8 bg-[#161616] p-8 shadow-2xl shadow-black/60 sm:p-10">
            {/* Logo */}
            <div className="mb-6 flex justify-center">
              <DealsLogo priority />
            </div>

            {/* Progress bar */}
            <ProgressBar currentStep={step} />

            {/* Step content */}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Footer link */}
            <p className="mt-8 text-center text-sm text-white/25">
              Already registered?{" "}
              <Link
                href="/sign-in"
                className="font-semibold text-yellow-400 hover:text-yellow-300"
              >
                Sign in
              </Link>
            </p>

            <div id="clerk-captcha" className="mt-4" />
          </section>
        </div>
      </main>
    </>
  );
}