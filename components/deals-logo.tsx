import Image from "next/image";
import logo from "@/assets/logoo.png";

type DealsLogoProps = {
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function DealsLogo({ className = "", width = 170, height = 110, priority = false }: DealsLogoProps) {
  return (
    <Image
      src={logo}
      alt="DealsForYou"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );
}
