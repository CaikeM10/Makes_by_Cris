import "server-only";
import { stat } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { getPublicCatalog } from "./public-server";
import { selectHomeCatalog } from "./home-catalog";
import { resolveProductImage } from "./product-image";

export async function isHomeImageAvailable(source: string) {
  if (!source) return false;
  if (source.startsWith("/") && !source.startsWith("//")) {
    const publicRoot = path.resolve(process.cwd(), "public");
    const target = path.resolve(publicRoot, "." + source);
    if (!target.startsWith(publicRoot + path.sep)) return false;
    try { const file = await stat(target); return file.isFile() && file.size > 0; } catch { return false; }
  }
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin) return false;
    const response = await fetch(url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } });
    return response.ok && !!response.headers.get("content-type")?.startsWith("image/");
  } catch { return false; }
}

export const getHomeCatalog = cache(async () => {
  const catalog = await getPublicCatalog();
  const sources = [...new Set(catalog.categories.map(c => resolveProductImage(c.image || "")).filter(Boolean))];
  const checks = await Promise.all(sources.map(async src => await isHomeImageAvailable(src) ? src : null));
  return selectHomeCatalog(catalog, new Set(checks.filter((src): src is string => src !== null)));
});
