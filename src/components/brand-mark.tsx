import Image from "next/image";

type BrandMarkProps = {
  logoText: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
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
}: BrandMarkProps) {
  const sizing = sizeMap[size];

  if (logoUrl) {
    return (
      <div
        className={`relative ${sizing} overflow-hidden border border-black/6 bg-white shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${className}`}
      >
        <Image src={logoUrl} alt="Logo" fill unoptimized className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex ${sizing} items-center justify-center bg-white text-sm font-semibold text-[#10131a] shadow-[0_10px_24px_rgba(0,0,0,0.08)] ${className}`}
    >
      {logoText}
    </div>
  );
}
