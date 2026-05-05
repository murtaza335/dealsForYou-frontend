import React from "react";

type RibbonBrand = {
  name: string;
  logoUrl: string;
};

type LogoRibbonProps = {
  brands: RibbonBrand[];
};

export default function LogoRibbon({ brands }: LogoRibbonProps) {
  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-none overflow-hidden bg-transparent py-6">
      <div className="flex w-max animate-scroll items-center gap-12">
        {/* first set */}
        {brands.map((brand, i) => (
          <img
            key={`a-${i}`}
            src={brand.logoUrl}
            alt={brand.name}
            className="h-12 w-auto transition"
          />
        ))}

        {/* duplicate set for seamless loop */}
        {brands.map((brand, i) => (
          <img
            key={`b-${i}`}
            src={brand.logoUrl}
            alt={brand.name}
            className="h-12 w-auto transition"
          />
        ))}
      </div>

      {/* animation style */}
      <style>
        {`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          .animate-scroll {
            animation: scroll 18s linear infinite;
          }
        `}
      </style>
    </div>
  );
}