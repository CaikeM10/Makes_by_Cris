"use client";

import type { CatalogCategory, CatalogFilters } from "@/lib/catalog/repository";

export function CatalogSearch({ filters, categories }: { filters: CatalogFilters; categories: CatalogCategory[] }) {
  return <form key={JSON.stringify([filters.q, filters.category, filters.filter])} className="catalog-search" action="/admin/produtos" method="get">
    <div className="admin-field"><label htmlFor="q">Buscar por nome, marca ou categoria</label><input id="q" name="q" type="search" defaultValue={filters.q} maxLength={120} placeholder="Buscar produto…" /></div>
    <input type="hidden" name="filter" value={filters.filter} />
    <input type="hidden" name="page" value="1" />
    <div className="admin-field"><label htmlFor="category">Categoria</label><select id="category" name="category" defaultValue={filters.category} onChange={event => event.currentTarget.form?.requestSubmit()}><option value="">Todas as categorias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
    <button className="admin-button" type="submit">Buscar</button>
  </form>;
}
