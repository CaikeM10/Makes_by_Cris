"use client";

import { useState, type ImgHTMLAttributes } from "react";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & {
  src: string;
  fallbackSources?: string[];
};

/** Keep the original box even if every source fails; never loop on a broken fallback. */
export function SafeImage({ src, fallbackSources = [], alt = "", className, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = [...new Set([src, ...fallbackSources, "/placeholder.svg"])].find(value => value && !failed.includes(value));
  if (!source) return <span role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={!alt || undefined} className={className} style={{ ...props.style, display: "block" }} />;
  return <img {...props} src={source} alt={alt} className={className} onError={() => setFailed(previous => [...previous, source])} />;
}
