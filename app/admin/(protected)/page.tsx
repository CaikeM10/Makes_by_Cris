import { requireAdmin } from "@/lib/admin/auth";
import { CatalogLink } from "@/components/admin/catalog-link";
import Link from "next/link";
import { readAdminCatalogSummary } from "@/lib/catalog/admin-summary";
import { listCampaigns } from "@/lib/campaigns/repository";

export default async function AdminHome() {
  // Verificar também junto ao conteúdo, sem depender apenas do layout.
  const { supabase } = await requireAdmin();
  let summary;
  try { summary = await readAdminCatalogSummary(supabase); } catch { /* Keep the actions usable without inventing zero counts. */ }
  let activeCampaign;
  let campaignsLoaded = false;
  try { activeCampaign = (await listCampaigns(supabase)).find(campaign => campaign.active); campaignsLoaded = true; } catch { /* Preserve the existing Home if the campaign read fails. */ }
  return <>
    <p className="admin-eyebrow">Editor do Catálogo</p>
    <h1>Bem-vinda, <em>Cris.</em></h1>
    <p className="admin-intro">Seu catálogo, com cuidado em cada detalhe.</p>
    <section aria-label="Resumo do catálogo" className="admin-summary">
      {summary ? <>
        <dl className="admin-summary-grid">
          <div><dt>Total de produtos</dt><dd>{summary.totalProducts}</dd></div>
          <div><dt>Produtos ativos</dt><dd>{summary.activeProducts}</dd></div>
          <div><dt>Categorias com produtos</dt><dd>{summary.populatedCategories}</dd></div>
          <div><dt>Imagens para revisar</dt><dd>{summary.provisionalImages}</dd></div>
        </dl>
        <p className="admin-help admin-summary-help">O total inclui produtos desativados. As categorias contam produtos públicos disponíveis.</p>
      </> : <p className="admin-message" role="status">Não foi possível carregar o resumo do catálogo. <Link href="/admin" className="admin-summary-retry">Tentar novamente</Link></p>}
    </section>
    <section className="admin-attention" aria-labelledby="home-campaign-title">
      <p className="admin-eyebrow">Campanha da Home</p><h2 id="home-campaign-title">{activeCampaign?.name || (campaignsLoaded ? 'Nenhuma campanha ativa.' : 'Campanhas indisponíveis no momento.')}</h2>
      {activeCampaign ? <><p className="admin-help">ATIVA · {activeCampaign.productIds.length} produtos selecionados</p><Link href={`/admin/campanhas/${activeCampaign.id}/editar`}>Editar campanha</Link></>
        : <><p className="admin-help">{campaignsLoaded ? 'O banner padrão está sendo exibido.' : 'Atualize a página e tente novamente.'}</p><Link href={campaignsLoaded ? '/admin/campanhas/nova' : '/admin/campanhas'}>{campaignsLoaded ? 'Criar campanha' : 'Ver campanhas'}</Link></>}
    </section>
    <section className="admin-home-note" aria-labelledby="next-step">
      <h2 id="next-step">Um espaço para cuidar da sua marca.</h2>
      <p>Gerencie produtos, preços, imagens e disponibilidade do catálogo.</p>
      <div className="admin-home-actions">
        <Link className="admin-button" href="/admin/produtos">Gerenciar produtos</Link>
        <Link className="catalog-secondary" href="/admin/produtos/novo">Adicionar produto</Link>
      </div>
      <CatalogLink />
    </section>
    {summary && summary.provisionalImages > 0 && <section className="admin-attention" aria-labelledby="review-title">
      <h2 id="review-title">Um cuidado a mais com as imagens</h2>
      <p className="admin-help">{summary.provisionalImages} {summary.provisionalImages === 1 ? "produto tem imagem provisória" : "produtos têm imagens provisórias"}. Você pode revisá-las e substituí-las na edição do produto.</p>
      <ul>{summary.reviewProducts.map(product => <li key={product.id}><Link href={`/admin/produtos/${product.id}/editar`}>{product.name}<span className="sr-only"> — revisar imagem</span><span aria-hidden="true"> ↗</span></Link></li>)}</ul>
    </section>}
  </>;
}
