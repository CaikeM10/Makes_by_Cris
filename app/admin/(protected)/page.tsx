import { requireAdmin } from "@/lib/admin/auth";
import { CatalogLink } from "@/components/admin/catalog-link";

export default async function AdminHome() {
  // Verificar também junto ao conteúdo, sem depender apenas do layout.
  await requireAdmin();
  return <>
    <p className="admin-eyebrow">Editor do Catálogo</p>
    <h1>Bem-vinda, <em>Cris.</em></h1>
    <p className="admin-intro">Seu editor de catálogo está pronto para começar.</p>
    <section className="admin-home-note" aria-labelledby="next-step">
      <h2 id="next-step">Um espaço para cuidar da sua marca.</h2>
      <p>A gestão de produtos será disponibilizada na próxima etapa. Por enquanto, você já pode acessar sua área privada e conferir o catálogo.</p>
      <CatalogLink />
    </section>
  </>;
}
