"use client";
import { createContext, useContext, useMemo } from "react";
import { selectPublicCatalog, type PublicCatalog } from "@/lib/catalog/public-catalog";

const CatalogContext = createContext<ReturnType<typeof selectPublicCatalog> | null>(null);
export function CatalogProvider({ catalog, children }: { catalog: PublicCatalog; children: React.ReactNode }) {
  const value = useMemo(() => selectPublicCatalog(catalog), [catalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog precisa estar dentro de CatalogProvider");
  return catalog;
}
