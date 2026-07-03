import Image from "next/image";
import { Star } from "lucide-react";

type BrandMarkProps = {
  logoText: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "transparent";
  imageWidthPx?: number;
  textColor?: string;
};

const sizeMap = {
  sm: "h-10 w-10 rounded-2xl",
  md: "h-12 w-12 rounded-2xl",
  lg: "h-16 w-16 rounded-[22px]",
};

export function BrandMark({
  logoText,
  logoUrl,
  size = "md",
  className = "",
  variant = "default",
  imageWidthPx,
  textColor = "#ffffff",
}: BrandMarkProps) {
  const sizing = className.includes("w-full") ? "w-full" : sizeMap[size];
  const isOkadoFallback = logoText.trim().toUpperCase() === "OK";

  if (logoUrl) {
    if (variant === "transparent") {
      return (
        <div
          className={`relative inline-block shrink-0 ${className}`}
          style={{ width: `${imageWidthPx ?? 180}px` }}
        >
          <Image
            src={logoUrl}
            alt="Logo"
            width={imageWidthPx ?? 180}
            height={imageWidthPx ?? 180}
            unoptimized
            className="block h-auto w-full object-contain"
          />
        </div>
      );
    }

    return (
      <div
        className={`relative ${sizing} overflow-hidden border border-black/6 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${className}`}
      >
        <Image src={logoUrl} alt="Logo" fill unoptimized className="object-contain p-3" />
      </div>
    );
  }

  if (variant === "transparent") {
    return (
      <div
        className={`inline-flex shrink-0 items-center justify-center text-center ${className}`}
        style={{ maxWidth: `${imageWidthPx ?? 240}px` }}
      >
        <span
          className="font-display text-3xl font-semibold leading-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.28)]"
          style={{ color: textColor }}
        >
          {logoText}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizing} items-center justify-center text-sm font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${
        isOkadoFallback ? "bg-primary-action-accent text-white" : "bg-white text-[#10131a]"
      } ${className}`}
    >
      {isOkadoFallback ? (
        <Star className="h-5 w-5 fill-white text-white" aria-hidden="true" />
      ) : (
        logoText
      )}
    </div>
  );
}
