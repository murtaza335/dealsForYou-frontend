"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "./dashboard-header";
import Footer from "./footer";
import { FoodBackground } from "@/components/food-background";

type SharedLayoutProps = {
  children: ReactNode;
};

export function SharedLayout({ children }: SharedLayoutProps) {
  const pathname = usePathname();

  return (
    <>
      <DashboardHeader />
      <main
        className="relative w-full"
        style={{
          background: "#000000",
          height: "100vh",
          overflow: "hidden", // ← clip everything, handle scroll inside
        }}
      >
        {/* Background: clipped, never scrolls */}
        <FoodBackground
          style={{
            transform: "translateZ(0) scale(1)", // drop the parallax, or keep below
            transformOrigin: "top center",
            position: "fixed", // ← fixed so it never affects scroll height
            inset: 0,
          }}
        />

        {/* Scrollable content area */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            height: "100vh",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <Footer />
        </div>
      </main>

    </>
  );
}
