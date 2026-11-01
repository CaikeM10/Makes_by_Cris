"use client";
import { useState } from "react";

export function CampaignArtwork({ desktop, mobile }: { desktop: string; mobile: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div role="img" aria-label="Arte da campanha indisponível" className="campaign-artwork-fallback h-32 bg-blush sm:h-48" />;
  return <picture className="campaign-artwork block">
    <source media="(max-width: 767px)" srcSet={mobile || desktop} width={1080} height={720} />
    <img src={desktop} alt="" width={1920} height={720} fetchPriority="high" decoding="async" onError={() => setFailed(true)}
      className="block aspect-[3/2] w-full object-cover md:aspect-[8/3] md:object-contain" />
  </picture>;
}
