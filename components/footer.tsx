"use client";

import React from "react";
import { DealsLogo } from "./deals-logo";

export default function Footer() {
  return (
    <footer
      className="relative z-20 w-full border-t border-black text-white"
      style={{
        backgroundColor: "#240000", // dark red-black base
      }}
    >
      <div className="max-w-7xl mx-auto px-8 py-28">

        {/* GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-16">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <DealsLogo
              width={180}
              height={120}
              priority
              className="h-24 w-40 sm:h-28 sm:w-48"
            />

            <p className="mt-6 text-sm text-gray-200 leading-relaxed">
              Discover curated deals tailored to your preferences. Save smarter,
              every day.
            </p>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm uppercase tracking-widest text-yellow-400 mb-6 font-semibold">
              Company
            </h3>
            <ul className="space-y-4 text-sm text-gray-200">
              <li><a href="#" className="hover:text-yellow-400 transition">About Us</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition">Careers</a></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-sm uppercase tracking-widest text-yellow-400 mb-6 font-semibold">
              Help
            </h3>
            <ul className="space-y-4 text-sm text-gray-200">
              <li><a href="#" className="hover:text-yellow-400 transition">Track Deals</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition">Support</a></li>
              <li><a href="#" className="hover:text-yellow-400 transition">FAQs</a></li>
            </ul>
          </div>

          {/* Contact + Social */}
          <div>
            <h3 className="text-sm uppercase tracking-widest text-yellow-400 mb-6 font-semibold">
              Contact
            </h3>

            <p className="text-sm text-gray-200">+1 234 567 890</p>
            <p className="text-sm text-gray-200 mb-8">support@deals4you.com</p>

            {/* Social */}
            <div className="flex gap-4 mb-8">
              {["F", "Y", "X", "I"].map((s, i) => (
                <div
                  key={i}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-black/40 text-gray-200 hover:bg-yellow-400 hover:text-black transition"
                >
                  {s}
                </div>
              ))}
            </div>

            {/* App buttons */}
            <div className="flex gap-4">
              <div className="px-5 py-2.5 bg-black/40 text-gray-200 rounded-md text-xs hover:bg-yellow-400 hover:text-black transition">
                App Store
              </div>
              <div className="px-5 py-2.5 bg-black/40 text-gray-200 rounded-md text-xs hover:bg-yellow-400 hover:text-black transition">
                Google Play
              </div>
            </div>
          </div>

        </div>

        {/* Bottom */}
        <div className="border-t border-black/60 mt-20 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">

          <p className="text-xs text-gray-300">
            © {new Date().getFullYear()} Deals4You. All rights reserved.
          </p>

          <p className="text-xs text-gray-300">
            Powered by <span className="text-yellow-400 font-medium">Your Company</span>
          </p>

        </div>
      </div>
    </footer>
  );
}