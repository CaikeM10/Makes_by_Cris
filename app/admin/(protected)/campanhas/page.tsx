import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listCampaigns } from "@/lib/campaigns/repository";
import { CampaignControls } from "@/components/admin/campaign-controls";

export default async function CampaignsPage() {
  const { supabase } = await requireAdmin();
  let campaigns;
  try { campaigns = await listCampaigns(supabase); }
  catch { return <><h1>Campanhas</h1><p className="admin-message admin-error">Não foi possível carregar as campanhas. Atualize a página e tente novamente.</p></>; }
  return <><p className="admin-eyebrow">Banner da Home</p><div className="catalog-heading"><h1>Campanhas</h1><Link className="catalog-secondary" href="/admin/campanhas/nova">+ Nova campanha</Link></div>
    <p className="admin-intro">Uma campanha ativa ocupa o banner da Home. Ao desativá-la, o banner padrão volta automaticamente.</p>
    {!campaigns.length && <p className="admin-message">Nenhuma campanha criada. O banner padrão está sendo exibido.</p>}
    <div className="campaign-list">{campaigns.map(campaign => <article className="catalog-panel" key={campaign.id}>
      <h2>{campaign.name}</h2><p><strong className="campaign-status">{campaign.active ? 'ATIVA' : 'INATIVA'}</strong> · {campaign.productIds.length} produtos selecionados</p>
      <p className="admin-help">{campaign.desktop_image_path ? 'Desktop ✓' : 'Imagem desktop pendente'} · {campaign.mobile_image_path ? 'Mobile ✓' : 'Imagem mobile pendente'}</p>
      <div className="campaign-list-actions"><Link className="catalog-secondary" href={`/admin/campanhas/${campaign.id}/editar`}>Editar</Link><CampaignControls campaign={campaign} /><CampaignControls campaign={campaign} remove /></div>
    </article>)}</div>
  </>;
}
