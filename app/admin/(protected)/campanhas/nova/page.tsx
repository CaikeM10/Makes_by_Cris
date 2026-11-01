import { requireAdmin } from "@/lib/admin/auth";
import { campaignProductOptions } from "@/lib/campaigns/repository";
import { CampaignForm } from "@/components/admin/campaign-form";

export default async function NewCampaignPage() {
  const { supabase } = await requireAdmin();
  const options = await campaignProductOptions(supabase);
  return <><p className="admin-eyebrow">Campanhas</p><h1>Nova campanha</h1><p className="admin-intro">Prepare a seleção e as duas artes. Você pode salvar como rascunho antes de ativar.</p><CampaignForm {...options} /></>;
}
