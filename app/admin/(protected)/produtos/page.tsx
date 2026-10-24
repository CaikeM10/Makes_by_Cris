import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createCatalogRepository, PAGE_SIZE } from "@/lib/catalog/supabase-repository";
import { resolveProductImage } from "@/lib/catalog/product-image";
import { parseFilters } from "@/lib/catalog/validation";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const filters = parseFilters(params);
  const repository = createCatalogRepository(supabase);
  let loaded;
  try { loaded = await Promise.all([repository.list(filters), repository.categories()]); }
  catch { return <><h1>Todos os produtos</h1><p className="admin-message admin-error">Não foi possível carregar o catálogo. Verifique se o banco foi preparado e tente novamente.</p><Link className="admin-back" href="/admin/produtos">Tentar novamente</Link></>; }
  const [{ products, count }, categories] = loaded;
  const href = (changes: Record<string, string>) => `/admin/produtos?${new URLSearchParams({ q: filters.q, filter: filters.filter, category: filters.category, page: "1", ...changes })}`;
  const money = (value: string) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return <><p className="admin-eyebrow">Catálogo</p><div className="catalog-heading"><div><h1>Todos os produtos</h1><p className="admin-intro">{count} {count === 1 ? "produto encontrado" : "produtos encontrados"}. Escolha o que deseja atualizar.</p></div><Link className="catalog-secondary" href="/admin/produtos/novo">Novo produto</Link></div>
    {params.salvo === "1" && <p className="admin-message" role="status">Alterações salvas.</p>}
    <form className="catalog-search" action="/admin/produtos"><div className="admin-field"><label htmlFor="q">Buscar por nome, marca ou categoria</label><input id="q" name="q" type="search" defaultValue={filters.q} maxLength={120} placeholder="Buscar produto…" /></div><input type="hidden" name="filter" value={filters.filter} /><div className="admin-field"><label htmlFor="category">Categoria</label><select id="category" name="category" defaultValue={filters.category}><option value="">Todas as categorias</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><button className="admin-button">Buscar</button></form>
    <nav className="catalog-filters" aria-label="Filtrar produtos">{[["all", "Todos"], ["active", "Ativos"], ["inactive", "Inativos"], ["featured", "Destaques"], ["best_seller", "Mais vendidos"]].map(([key, label]) => <Link key={key} href={href({ filter: key })} aria-current={filters.filter === key ? "page" : undefined}>{label}</Link>)}</nav>
    {products.length ? <div className="catalog-grid">{products.map(p => <article className="catalog-card" key={p.id}><img src={resolveProductImage(p.image)} alt={p.name} width={240} height={160} /><div className="catalog-card-body"><p className="admin-eyebrow">{categories.find(c => c.id === p.category_id)?.name}</p><h2>{p.name}</h2><div className="catalog-badges"><span>{p.active ? "Ativo" : "Inativo"}</span>{!p.available && <span>Indisponível</span>}{p.featured && <span>Destaque</span>}{p.best_seller && <span>Mais vendido</span>}</div><dl className="catalog-prices"><div><dt>PIX</dt><dd>{money(p.price)}</dd></div><div><dt>Crédito</dt><dd>{money(p.credit_price)}</dd></div></dl><Link className="catalog-secondary" href={`/admin/produtos/${encodeURIComponent(p.id)}/editar`} aria-label={`Editar ${p.name}`}>Editar produto →</Link></div></article>)}</div> : <p className="admin-message">Nenhum produto encontrado. Ajuste a busca ou os filtros.</p>}
    <nav className="catalog-pagination" aria-label="Paginação">{filters.page > 1 && <Link href={href({ page: String(filters.page - 1) })}>← Anterior</Link>}<span>Página {filters.page} de {Math.max(1, Math.ceil(count / PAGE_SIZE))}</span>{filters.page * PAGE_SIZE < count && <Link href={href({ page: String(filters.page + 1) })}>Próxima →</Link>}</nav>
  </>;
}
