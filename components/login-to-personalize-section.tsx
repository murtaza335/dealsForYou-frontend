"use client";

import Link from "next/link";

export function LoginToPersonalizeSection() {
	return (
		<section className="relative py-16 sm:py-20 bg-transparent overflow-hidden">
			
			{/* Top-left fading border */}
			<div className="pointer-events-none absolute top-0 left-0 h-px w-1/2 bg-gradient-to-r from-amber-400/60 to-transparent" />
			<div className="pointer-events-none absolute top-0 left-0 w-px h-1/2 bg-gradient-to-b from-amber-400/60 to-transparent" />

			{/* Bottom-right fading border */}
			<div className="pointer-events-none absolute bottom-0 right-0 h-px w-1/2 bg-gradient-to-l from-amber-400/60 to-transparent" />
			<div className="pointer-events-none absolute bottom-0 right-0 w-px h-1/2 bg-gradient-to-t from-amber-400/60 to-transparent" />

			<div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-12">
				<div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
					
					<div className="max-w-2xl">
						{/* <p className="mb-4 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
							Personalized for you
						</p> */}

						<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
							Sign in to get{" "}
							<span className="text-amber-300">deals tailored</span> to your taste.
						</h2>

						<p className="mt-4 max-w-xl text-sm leading-7 text-amber-50/70 sm:text-base">
							Create your account and discover personalized recommendations based on your preferences, favorite cuisines, and shopping history.
						</p>

						<div className="mt-6 grid gap-3 text-sm text-white/75 sm:grid-cols-2">
							<div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
								<span className="text-amber-200">Personalized</span> deal recommendations
							</div>
							<div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
								Save your favorite deals
							</div>
							<div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
								Track special offers
							</div>
							<div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
								Quick checkout experience
							</div>
						</div>
					</div>
                            
					<div className="flex shrink-0 flex-col items-start gap-4 p-5 lg:items-end">
						{/* <p className="text-xs font-medium uppercase tracking-[0.15em] text-amber-200/70">
							Unlock personalization
						</p> */}

						<Link
							href="/sign-in"
							className="inline-flex w-full items-center justify-center rounded-md bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 sm:w-auto"
						>
							Sign in now
						</Link>

						<p className="text-xs text-white/40">
							New to Deals4You?{" "}
							<Link
								href="/sign-up"
								className="text-amber-300 hover:text-amber-200"
							>
								Create an account
							</Link>
						</p>
					</div>

				</div>
			</div>
		</section>
	);
}