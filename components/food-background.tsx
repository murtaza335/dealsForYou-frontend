"use client";

import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";
import burger from "@/assets/burger.png";
import fries from "@/assets/french-fries.png";
import pizza from "@/assets/pizza.png";

type FoodIcon = {
  src: StaticImageData;
  alt: string;
  top: string;
  left: string;
  size: number;
  rotate: number;
};

const scatteredIcons: FoodIcon[] = [
  { src: pizza, alt: "pizza", top: "1%", left: "8%", size: 80, rotate: -16 },
  { src: burger, alt: "burger", top: "2%", left: "68%", size: 88, rotate: 12 },
  { src: fries, alt: "fries", top: "1%", left: "94%", size: 74, rotate: -7 },
  { src: pizza, alt: "pizza", top: "34%", left: "46%", size: 84, rotate: 9 },
  { src: burger, alt: "burger", top: "1%", left: "35%", size: 92, rotate: -12 },
  { src: fries, alt: "fries", top: "60%", left: "25%", size: 78, rotate: 13 },
  { src: pizza, alt: "pizza", top: "53%", left: "67%", size: 86, rotate: -9 },
  { src: burger, alt: "burger", top: "53%", left: "90%", size: 90, rotate: 10 },
  { src: fries, alt: "fries", top: "35%", left: "10%", size: 72, rotate: 6 },
];

const PatternBlock = ({ idSuffix }: { idSuffix: string }) => (
  <div className="relative h-screen w-full shrink-0">
    {scatteredIcons.map((icon, index) => (
      <div
        key={`${icon.alt}-${index}-${idSuffix}`}
        className="pointer-events-none absolute"
        style={{
          top: icon.top,
          left: icon.left,
          transform: `translate(-50%, -50%) rotate(${icon.rotate}deg)`,
          opacity: 0.45,
        }}
      >
        <Image
          src={icon.src}
          alt=""
          width={icon.size}
          height={icon.size}
          style={{
            filter: "brightness(0) invert(1) grayscale(1) contrast(1.5)",
          }}
        />
      </div>
    ))}
  </div>
);

type FoodBackgroundProps = {
  blocks?: number;
  className?: string;
  style?: CSSProperties;
};

export function FoodBackground({ blocks = 4, className = "", style }: FoodBackgroundProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`} style={style}>
      <div className="flex w-full flex-col">
        {Array.from({ length: blocks }).map((_, i) => (
          <PatternBlock key={i} idSuffix={i.toString()} />
        ))}
      </div>
    </div>
  );
}
