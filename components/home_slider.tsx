"use client";

import { useEffect, useState } from "react";

type HomeSliderProps = {
	images: string[];
	intervalMs?: number;
	showIndicators?: boolean;
};

export function HomeSlider({
	images,
	intervalMs = 5000,
	showIndicators = true,
}: HomeSliderProps) {
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		if (images.length <= 1) {
			return;
		}

		const timer = setInterval(() => {
			setActiveIndex((prev) => (prev + 1) % images.length);
		}, intervalMs);

		return () => clearInterval(timer);
	}, [images.length, intervalMs]);

	if (images.length === 0) {
		return null;
	}

	return (
		<section className="relative h-[70vh] w-full overflow-hidden sm:h-screen">
			<div
				className="flex h-full w-full transition-transform duration-700 ease-out"
				style={{ transform: `translateX(-${activeIndex * 100}%)` }}
			>
				{images.map((src, index) => (
					<div key={`${src}-${index}`} className="h-full w-full flex-shrink-0">
						<img
							src={src}
							alt={`Slide ${index + 1}`}
							className="h-full w-full object-cover"
							loading={index === 0 ? "eager" : "lazy"}
						/>
					</div>
				))}
			</div>

			{showIndicators ? (
				<div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2">
					{images.map((_, index) => (
						<button
							key={`indicator-${index}`}
							type="button"
							aria-label={`Go to slide ${index + 1}`}
							onClick={() => setActiveIndex(index)}
							className={`h-2.5 w-2.5 rounded-full border border-white/70 transition-all ${
								index === activeIndex ? "bg-white" : "bg-white/30"
							}`}
						/>
					))}
				</div>
			) : null}
		</section>
	);
}
