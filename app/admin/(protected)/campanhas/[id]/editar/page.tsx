import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { campaignProductOptions, getCampaign, campaignImages } from "@/lib/campaigns/repository";
import { UUID } from "@/lib/campaigns/model";
import { CampaignForm } from "@/components/admin/campaign-form";

export default async function EditCampaignPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params; if (!UUID.test(id)) notFound();
  const [campaign, options, status] = await Promise.all([getCampaign(supabase, id), campaignProductOptions(supabase), searchParams]);
  if (!campaign) notFound();
  const images = await campaignImages(supabase, campaign);
  return <><p className="admin-eyebrow">Campanhas</p><h1>Editar campanha</h1>
    {status.salvo === '1' && <p className="admin-message" role="status">Campanha salva.</p>}
    {status.limpeza === 'pendente' && <p className="admin-message">A campanha foi salva. Uma arte antiga aguarda limpeza segura.</p>}
    <p className="admin-intro">{campaign.active ? 'ATIVA — esta campanha ocupa o banner da Home.' : 'INATIVA — esta campanha não aparece na loja.'}</p>
    {campaign.productIds.some(id=>!options.products.some(p=>p.id===id)) && <p className="admin-message">Produtos que ficaram indisponíveis estão ocultos na loja e serão retirados da seleção ao salvar.</p>}
    <CampaignForm campaign={campaign} images={images} {...options} />
  </>;
}
