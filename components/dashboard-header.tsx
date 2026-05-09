"use client";

import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { DealsLogo } from "@/components/deals-logo";

const tabs: { href: string; label: string; key: "home" | "deals" | "favorites" }[] = [
  { href: "/", label: "Home", key: "home" },
  { href: "/deals", label: "Deals", key: "deals" },
  { href: "/favorites", label: "Favorites", key: "favorites" },
];

export function DashboardHeader() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const activeTab =
    pathname === "/" ? "home" : pathname.startsWith("/deals") ? "deals" : "favorites";

  const headerMask = isMenuOpen
    ? "none"
    : "linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 100%)";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  return (
    <header
      className="fixed inset-x-0 top-0 z-20 h-20 sm:h-24 lg:h-28"
      style={{
        backgroundColor: "#000000",
        WebkitMaskImage: headerMask,
        maskImage: headerMask,
      }}
    >
      <nav className="mx-auto hidden h-full w-full max-w-4xl items-center justify-center gap-8 px-4 md:flex">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.01em" }}
            className="relative px-2 py-2 text-base font-bold italic text-white transition hover:text-red-400"
          >
            {tab.label}
            {activeTab === tab.key && (
              <motion.div
                layoutId="active-tab-indicator"
                className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-red-500"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        ))}

        <Link href="/deals?search=true">
          <button aria-label="Search" className="ml-2 text-white transition hover:text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </Link>
      </nav>

      <div className="absolute left-4 top-1/2 flex -translate-y-1/2 items-center sm:left-7">
        <DealsLogo width={180} height={120} priority className="h-16 w-28 sm:h-20 sm:w-36 lg:h-24 lg:w-44" />
      </div>

      <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-3 sm:right-7">
        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition hover:border-white/40 md:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-full bg-current transition-transform duration-300 ${
                isMenuOpen ? "translate-y-[7px] rotate-45" : "translate-y-0"
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-full bg-current transition-opacity duration-300 ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-full bg-current transition-transform duration-300 ${
                isMenuOpen ? "-translate-y-[7px] -rotate-45" : "translate-y-0"
              }`}
            />
          </span>
        </button>

        {isSignedIn ? (
          <UserButton />
        ) : (
          <Link href="/sign-up">
            <button className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700 sm:px-4 sm:text-sm">
              Sign Up
            </button>
          </Link>
        )}
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-full z-30 px-4 md:hidden"
          >
            <div className="mx-auto mt-3 w-full max-w-sm rounded-2xl border border-white/10 bg-black/95 p-4 shadow-2xl">
              <div className="flex flex-col gap-3">
                {tabs.map((tab) => (
                  <Link
                    key={`mobile-${tab.key}`}
                    href={tab.href}
                    style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.01em" }}
                    className={`rounded-xl px-3 py-2 text-base font-bold italic transition ${
                      activeTab === tab.key
                        ? "bg-white/10 text-red-300"
                        : "text-white hover:bg-white/5 hover:text-red-200"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>

              <Link href="/deals?search=true" className="w-full">
                <button
                  aria-label="Search"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-2 text-sm font-semibold text-white/90 transition hover:border-white/30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  Search
                </button>
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}