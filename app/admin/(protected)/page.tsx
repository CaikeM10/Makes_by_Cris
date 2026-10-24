import { requireAdmin } from "@/lib/admin/auth";
import { CatalogLink } from "@/components/admin/catalog-link";
import Link from "next/link";

export default async function AdminHome() {
  // Verificar também junto ao conteúdo, sem depender apenas do layout.
  await requireAdmin();
  return <>
    <p className="admin-eyebrow">Editor do Catálogo</p>
    <h1>Bem-vinda, <em>Cris.</em></h1>
    <p className="admin-intro">Seu editor de catálogo está pronto para começar.</p>
    <section className="admin-home-note" aria-labelledby="next-step">
      <h2 id="next-step">Um espaço para cuidar da sua marca.</h2>
      <p>Encontre um produto e atualize suas informações e preços.</p>
      <Link className="admin-button" href="/admin/produtos">Todos os produtos</Link>
      <CatalogLink />
    </section>
  </>;
}
