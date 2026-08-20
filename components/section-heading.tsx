import Link from "next/link";
import { ArrowRight } from "lucide-react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Ver tudo",
}: SectionHeadingProps) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div className="flex flex-col gap-2">
        {eyebrow && (
          <p className="inline-flex w-fit items-center rounded-full border border-[#B45A67]/15 bg-[#F5E4E2]/45 px-3 py-1 text-[0.625rem] font-medium tracking-[0.2em] text-primary uppercase">
            {eyebrow}
          </p>
        )}

        <h2 className="font-serif text-2xl leading-tight text-balance lg:text-3xl">
          {title}
        </h2>

        {description && (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="group hidden shrink-0 items-center gap-1.5 pb-1 text-sm text-primary sm:flex"
        >
          {linkLabel}
          <ArrowRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}
