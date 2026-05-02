"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth, useClerk, useSignIn, useUser } from "@clerk/nextjs";
import type { SignInResource, SignInSecondFactor } from "@clerk/nextjs/types";
import { useRouter } from "next/navigation";
import { apiBaseUrl, fetchDomainUser, getRoleHomePath, readJsonResponse } from "@/lib/deals";
import { DealsLogo } from "@/components/deals-logo";
import { FoodBackground } from "@/components/food-background";

type OAuthStrategy = "oauth_google";
type ClerkProfile = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  primaryEmailAddress?: { emailAddress?: string | null } | null;
};
type SupportedSecondFactor = Extract<SignInSecondFactor, { strategy: "email_code" | "phone_code" | "totp" | "backup_code" }>;
type SecondFactorState = {
  signInAttempt: SignInResource;
  strategy: SupportedSecondFactor["strategy"];
  label: string;
  placeholder: string;
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

const getPreferredSecondFactor = (factors: SignInSecondFactor[] | null): SupportedSecondFactor | null => {
  if (!factors?.length) return null;
  return (
    factors.find((factor): factor is Extract<SupportedSecondFactor, { strategy: "email_code" }> => factor.strategy === "email_code") ??
    factors.find((factor): factor is Extract<SupportedSecondFactor, { strategy: "phone_code" }> => factor.strategy === "phone_code") ??
    factors.find((factor): factor is Extract<SupportedSecondFactor, { strategy: "totp" }> => factor.strategy === "totp") ??
    factors.find((factor): factor is Extract<SupportedSecondFactor, { strategy: "backup_code" }> => factor.strategy === "backup_code") ??
    null
  );
};

const getSecondFactorCopy = (factor: SupportedSecondFactor) => {
  if (factor.strategy === "email_code") {
    return {
      label: `Enter the code sent to ${factor.safeIdentifier}.`,
      placeholder: "Email verification code",
    };
  }
  if (factor.strategy === "phone_code") {
    return {
      label: `Enter the code sent to ${factor.safeIdentifier}.`,
      placeholder: "SMS verification code",
    };
  }
  if (factor.strategy === "backup_code") {
    return {
      label: "Enter one of your backup codes.",
      placeholder: "Backup code",
    };
  }

  return {
    label: "Enter the code from your authenticator app.",
    placeholder: "Authenticator code",
  };
};

export default function Page() {
  const { signIn, errors, fetchStatus } = useSignIn();
  const clerk = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [secondFactor, setSecondFactor] = useState<SecondFactorState | null>(null);

  const redirectToRoleHome = useCallback(async (token: string | null, profile?: ClerkProfile | null) => {
    let domainUser: Awaited<ReturnType<typeof fetchDomainUser>>;
    try {
      domainUser = await fetchDomainUser(token);
    } catch {
      router.replace("/");
      return;
    }

    if (!domainUser && profile?.id) {
      const firstName = profile.firstName?.trim() || "User";
      const lastName = profile.lastName?.trim() || firstName;
      const email = profile.primaryEmailAddress?.emailAddress?.trim();

      if (!email) {
        router.replace("/");
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/users/upsert-from-clerk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: profile.id,
          email,
          firstName,
          lastName,
          role: "END_USER",
          tenantId: null,
          brandId: null,
          metadata: {
            source: "clerk",
          },
        }),
      }).catch(() => null);

      if (response?.ok) {
        domainUser = await fetchDomainUser(token).catch(() => null);
      } else if (response) {
        const payload = await readJsonResponse<{ message?: string; error?: string }>(response);
        console.warn("Consumer profile auto-upsert failed:", payload?.message ?? payload?.error ?? response.statusText);
      }
    }

    router.replace(domainUser ? getRoleHomePath(domainUser) : "/");
  }, [router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !isUserLoaded) return;

    const redirect = async () => {
      const token = await getToken();
      await redirectToRoleHome(token, user);
    };

    void redirect();
  }, [getToken, isLoaded, isSignedIn, isUserLoaded, redirectToRoleHome, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const emailAddress = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!emailAddress || !password) {
      setMessage("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signInAttempt = await clerk.client.signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "needs_second_factor") {
        const factor = getPreferredSecondFactor(signInAttempt.supportedSecondFactors);
        if (!factor) {
          setMessage("This account needs additional verification, but no supported second factor is available.");
          return;
        }

        if (factor.strategy === "email_code") {
          await signInAttempt.prepareSecondFactor({
            strategy: "email_code",
            emailAddressId: factor.emailAddressId,
          });
        }
        if (factor.strategy === "phone_code") {
          await signInAttempt.prepareSecondFactor({
            strategy: "phone_code",
            phoneNumberId: factor.phoneNumberId,
          });
        }

        const copy = getSecondFactorCopy(factor);
        setSecondFactor({
          signInAttempt,
          strategy: factor.strategy,
          label: copy.label,
          placeholder: copy.placeholder,
        });
        setMessage(null);
        return;
      }

      if (signInAttempt.status !== "complete" || !signInAttempt.createdSessionId) {
        setMessage("Sign in could not be completed. Check your account verification status and try again.");
        return;
      }

      await clerk.setActive({
        session: signInAttempt.createdSessionId,
        navigate: async ({ session }) => {
          if (session?.currentTask) return;
          const token = await session.getToken();
          await redirectToRoleHome(token, session.user);
        },
      });
    } catch (error) {
      setMessage(errorMessage(error, "Could not sign in."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifySecondFactor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!secondFactor) return;

    const formData = new FormData(event.currentTarget);
    const code = String(formData.get("secondFactorCode") ?? "").trim();
    if (!code) {
      setMessage("Enter the verification code.");
      return;
    }

    setMessage(null);
    setIsSubmitting(true);
    try {
      const signInAttempt = await secondFactor.signInAttempt.attemptSecondFactor({
        strategy: secondFactor.strategy,
        code,
      });

      if (signInAttempt.status !== "complete" || !signInAttempt.createdSessionId) {
        setMessage("Verification was accepted, but sign in is not complete yet.");
        return;
      }

      await clerk.setActive({
        session: signInAttempt.createdSessionId,
        navigate: async ({ session }) => {
          if (session?.currentTask) return;
          const token = await session.getToken();
          await redirectToRoleHome(token, session.user);
        },
      });
    } catch (error) {
      setMessage(errorMessage(error, "Could not verify the code."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const signInWithOauth = async (strategy: OAuthStrategy) => {
    setMessage(null);
    const { error } = await signIn.sso({
      strategy,
      redirectUrl: "/sign-in",
      redirectCallbackUrl: "/sso-callback",
    });
    if (error) setMessage(error.longMessage ?? error.message);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#151515] px-4 py-8 text-white">
      <FoodBackground blocks={4} />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <section className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#1f1f1f]/95 p-8 shadow-2xl shadow-black/40 sm:p-10">
          <div className="flex justify-center">
            <DealsLogo priority />
          </div>

          <div className="mt-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Sign in</h1>
            <p className="mt-2 text-sm text-slate-400">Continue to the right dashboard for your account.</p>
          </div>

          <button
            type="button"
            onClick={() => void signInWithOauth("oauth_google").catch((error) => setMessage(error instanceof Error ? error.message : "Google sign in failed."))}
            disabled={fetchStatus === "fetching" || isSubmitting}
            className="mt-7 w-full rounded-full border border-white/10 bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
          >
            Continue with Google
          </button>
          {message ? <p className="mt-4 text-sm text-red-300">{message}</p> : null}

          {secondFactor ? (
            <form onSubmit={(event) => void verifySecondFactor(event)} className="mt-6 grid gap-4">
              <p className="text-sm text-slate-300">{secondFactor.label}</p>
              <label htmlFor="secondFactorCode" className="grid gap-2 text-sm font-semibold text-slate-200">
                <span><span className="text-red-400">*</span> Verification code</span>
                <input id="secondFactorCode" name="secondFactorCode" required autoComplete="one-time-code" placeholder={secondFactor.placeholder} className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-white outline-none focus:border-red-500" />
              </label>
              <button type="submit" disabled={isSubmitting} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60">
                {isSubmitting ? "Verifying..." : "Verify and continue"}
              </button>
              <button type="button" onClick={() => { setSecondFactor(null); setMessage(null); }} disabled={isSubmitting} className="rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5 disabled:opacity-60">
                Back to password
              </button>
            </form>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="mt-6 grid gap-4">
              <label htmlFor="email" className="grid gap-2 text-sm font-semibold text-slate-200">
                <span><span className="text-red-400">*</span> Email</span>
                <input id="email" name="email" type="email" required className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-white outline-none focus:border-red-500" />
              </label>
              {errors.fields.identifier ? <p className="text-sm text-red-300">{errors.fields.identifier.message}</p> : null}

              <label htmlFor="password" className="grid gap-2 text-sm font-semibold text-slate-200">
                <span><span className="text-red-400">*</span> Password</span>
                <input id="password" name="password" type="password" required className="rounded-2xl border border-white/10 bg-[#151515] px-4 py-3 text-white outline-none focus:border-red-500" />
              </label>
              {errors.fields.password ? <p className="text-sm text-red-300">{errors.fields.password.message}</p> : null}

              <button type="submit" disabled={fetchStatus === "fetching" || isSubmitting} className="rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60">
                {fetchStatus === "fetching" || isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <div className="mt-7 flex flex-col gap-2 text-center text-sm text-slate-400 sm:flex-row sm:justify-center sm:gap-5">
            <Link href="/sign-up" className="font-semibold text-yellow-400 hover:text-yellow-300">Sign up as user</Link>
            <Link href="/sign-up/brand-admin" className="font-semibold text-yellow-400 hover:text-yellow-300">Sign up as brand admin</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
