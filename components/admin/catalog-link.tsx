import { getSiteUrl } from "@/lib/admin/site-url";

export function CatalogLink() {
  const url = getSiteUrl();
  return url ? <a className="admin-catalog-link" href={url} target="_blank" rel="noopener noreferrer">Ver catálogo <span aria-hidden="true">↗</span><span className="sr-only"> (abre em nova aba)</span></a>
    : <p className="admin-help">{process.env.NODE_ENV === "development" ? "Link do catálogo indisponível: configure NEXT_PUBLIC_SITE_URL." : "Link do catálogo indisponível no momento."}</p>;
}
