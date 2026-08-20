import { cn } from "@/lib/utils";

const useImageLogo = true;
const logoSrc = "/logorenderizadacrisd.webp";

type BrandLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "default" | "inverted";
};

const sizes = {
  sm: {
    mark: "text-lg",
    sub: "text-[0.5rem]",
    img: "h-10 sm:h-11",
  },
  md: {
    mark: "text-2xl",
    sub: "text-[0.5625rem]",
    img: "h-14 sm:h-16",
  },
  lg: {
    mark: "text-4xl sm:text-5xl",
    sub: "text-[0.6875rem]",
    img: "h-28 sm:h-32",
  },
};

export function BrandLogo({
  className,
  size = "md",
  tone = "default",
}: BrandLogoProps) {
  if (useImageLogo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt="Makes by Cris Martins"
        className={cn("w-auto object-contain", sizes[size].img, className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex flex-col items-center leading-none",
        tone === "inverted" ? "text-primary-foreground" : "text-foreground",
        className,
      )}
    >
      <span className="sr-only">Makes by Cris Martins</span>

      <span
        aria-hidden="true"
        className={cn(
          "font-serif font-light tracking-[0.18em]",
          sizes[size].mark,
        )}
      >
        MAKES
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "mt-1 tracking-[0.32em] uppercase",
          sizes[size].sub,
          tone === "inverted" ? "text-primary-foreground/75" : "text-primary",
        )}
      >
        by Cris Martins
      </span>
    </span>
  );
}
