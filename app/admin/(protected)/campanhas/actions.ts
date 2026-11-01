"use server";
import { requireAdmin } from "@/lib/admin/auth";
import { persistCampaign, removeCampaignImages } from "@/lib/campaigns/save";
import { getCampaign } from "@/lib/campaigns/repository";
import { UUID, type CampaignFormState } from "@/lib/campaigns/model";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function refresh() {
  revalidatePath('/admin'); revalidatePath('/admin/campanhas'); revalidatePath('/(loja)', 'layout');
}
export async function saveCampaign(id: string | null, version: string | null, _state: CampaignFormState, form: FormData): Promise<CampaignFormState> {
  const { supabase } = await requireAdmin();
  let result;
  try { result = await persistCampaign(supabase, id, version, form); }
  catch { return { error: 'Não foi possível consultar a campanha. Tente novamente.' }; }
  if (!result.id) return result;
  refresh(); redirect(`/admin/campanhas/${result.id}/editar?salvo=1${result.warning ? '&limpeza=pendente' : ''}`);
}
export async function changeCampaign(id: string, version: string, operation: 'activate' | 'deactivate' | 'delete', _state: CampaignFormState): Promise<CampaignFormState> {
  const { supabase } = await requireAdmin();
  if (!UUID.test(id) || !['activate','deactivate','delete'].includes(operation)) return { error: 'Operação inválida.' };
  let campaign;
  try {
    campaign = await getCampaign(supabase, id);
    if (!campaign || campaign.updated_at !== version) return { error: 'A campanha mudou. Recarregue a página.' };
    const { error } = await supabase.rpc(operation === 'delete' ? 'delete_campaign' : 'set_campaign_active', {
      p_id: id, p_version: version, ...(operation === 'delete' ? {} : { p_active: operation === 'activate' }),
    });
    if (error) return { error: 'Não foi possível concluir. Para ativar, confira as duas artes e ao menos um produto válido; recarregue se houve outra alteração.' };
  } catch { return { error: 'Não foi possível consultar a campanha.' }; }
  if (operation === 'delete') {
    try { await removeCampaignImages(supabase, [campaign.desktop_image_path, campaign.mobile_image_path]); } catch { /* Deleted campaign cannot leave a broken reference. */ }
  }
  refresh(); redirect('/admin/campanhas');
}
