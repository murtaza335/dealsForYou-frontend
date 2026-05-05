"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/lib/deals";
import LogoRibbon from "./brands-logo-ribbon";

type TrustedBrand = {
	name: string;
	slug: string;
	imgUrl?: string;
	baseUrl?: string;
};

type RibbonBrand = {
	name: string;
	logoUrl: string;
};

function resolveBrandLogo(brand: TrustedBrand): string {
	if (brand.imgUrl && brand.imgUrl.trim().length > 0) {
		return brand.imgUrl;
	}

	if (brand.baseUrl && /^https?:\/\//i.test(brand.baseUrl)) {
		return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(brand.baseUrl)}`;
	}

	return "";
}

export function JoinAsBrandSection() {
	const [trustedBrands, setTrustedBrands] = useState<TrustedBrand[]>([]);

	useEffect(() => {
		let isMounted = true;

		const fetchTrustedBrands = async () => {
			try {
				const response = await fetch(`${apiBaseUrl}/api/deals/filters/brands`);
				if (!response.ok) {
					throw new Error("Could not fetch brand logos.");
				}

				const payload = (await response.json()) as {
					data?: TrustedBrand[];
				};

				if (isMounted) {
					setTrustedBrands(payload.data ?? []);
				}
			} catch (error) {
				console.error("Failed to fetch trusted brands:", error);
			}
		};

		void fetchTrustedBrands();

		return () => {
			isMounted = false;
		};
	}, []);

	const ribbonBrands: RibbonBrand[] = trustedBrands
		.map((brand) => ({
			name: brand.name,
			logoUrl: resolveBrandLogo(brand),
		}))
		.filter((brand) => brand.logoUrl.length > 0);

	return (
		<section className="relative py-16 sm:py-20 bg-transparent overflow-hidden">
			
			{/* Top-right fading border */}
			<div className="pointer-events-none absolute top-0 right-0 h-px w-1/2 bg-gradient-to-l from-amber-400/60 to-transparent" />
			<div className="pointer-events-none absolute top-0 right-0 w-px h-1/2 bg-gradient-to-b from-amber-400/60 to-transparent" />

			{/* Bottom-left fading border */}
			<div className="pointer-events-none absolute bottom-0 left-0 h-px w-1/2 bg-gradient-to-r from-amber-400/60 to-transparent" />
			<div className="pointer-events-none absolute bottom-0 left-0 w-px h-1/2 bg-gradient-to-t from-amber-400/60 to-transparent" />

			<div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
				<div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
					
					<div className="max-w-2xl">
						{/* <p className="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
							Join as a brand
						</p> */}

						<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
							Register your brand and grow with top names.
						</h2>

						<p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
							Showcase your deals, reach engaged shoppers, and expand your presence in a high-intent marketplace.
						</p>

						{/* <div className="mt-6 flex flex-wrap gap-3">
							{trustedBrands.map((brand) => (
								<div
									key={brand.slug}
									className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"
								>
									{resolveBrandLogo(brand) ? (
										<img
											src={resolveBrandLogo(brand)}
											alt={brand.name}
											className="h-5 w-5 rounded-full object-contain"
										/>
									) : null}
									<span className="text-sm font-medium text-white/60">
										{brand.name}
									</span>
								</div>
							))}
						</div> */}

						
					</div>
                            
					<div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
						<Link
							href="/sign-up/brand-admin"
							className="inline-flex w-full items-center justify-center rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:w-auto"
						>
							Register as a brand
						</Link>

						<p className="text-xs text-white/40">
							Get started in minutes.
						</p>
					</div>

				</div>
                
			</div>

			<div className="relative mt-16 overflow-hidden rounded-2xl">
				<div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_58%,rgba(0,0,0,0.75)_100%)]" />
				<div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black via-black/80 to-transparent" />
				<div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black via-black/80 to-transparent" />
				<div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10 bg-gradient-to-b from-black via-black/70 to-transparent" />
				<div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-black via-black/70 to-transparent" />
				<LogoRibbon brands={ribbonBrands} />
			</div>
		</section>
	);
}