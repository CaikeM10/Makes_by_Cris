"use client";
import { createContext, useContext, useMemo } from "react";
import { selectPublicCatalog, type PublicCatalog } from "@/lib/catalog/public-catalog";
import { selectSearchCatalog, type SearchCatalogSnapshot } from "@/lib/catalog/search-catalog";

const CatalogContext = createContext<(ReturnType<typeof selectPublicCatalog> & { search: ReturnType<typeof selectSearchCatalog> }) | null>(null);
export function CatalogProvider({ catalog, searchCatalog, children }: { catalog: PublicCatalog; searchCatalog: SearchCatalogSnapshot; children: React.ReactNode }) {
  const value = useMemo(() => ({ ...selectPublicCatalog(catalog), search: selectSearchCatalog(searchCatalog) }), [catalog, searchCatalog]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
export function useCatalog() {
  const catalog = useContext(CatalogContext);
  if (!catalog) throw new Error("useCatalog precisa estar dentro de CatalogProvider");
  return catalog;
}
