import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { validateProductImage, validateImageContent, IMAGE_EXTENSIONS } from "@/lib/catalog/product-image";
import { CAMPAIGN_BUCKET, UUID, validateCampaign, isCampaignImagePath, type CampaignFormState } from "./model";
import { getCampaign, campaignProductOptions } from "./repository";

export async function validateCampaignUpload(file: File | null) {
  const error = validateProductImage(file);
  if (error || !file) return error;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const allowed = file.type === 'image/jpeg' ? ['jpg', 'jpeg'] : [IMAGE_EXTENSIONS[file.type]];
  if (!extension || !allowed.includes(extension)) return 'A extensão não corresponde ao formato da imagem.';
  return validateImageContent(file);
}

export async function removeCampaignImages(client: SupabaseClient, paths: string[]) {
  const safe = paths.filter(isCampaignImagePath);
  if (!safe.length) return;
  // Storage policy additionally forbids deleting a path still referenced by any campaign.
  const { error } = await client.storage.from(CAMPAIGN_BUCKET).remove(safe);
  if (error) throw new Error('campaign-image-cleanup');
}

export async function persistCampaign(client: SupabaseClient, id: string | null, version: string | null, form: FormData): Promise<CampaignFormState & { id?: string }> {
  if (id && !UUID.test(id)) return { error: 'Campanha inválida.' };
  const ids = form.getAll('product_ids').filter((v): v is string => typeof v === 'string');
  const active = form.get('active') === 'on';
  const { data: fields, errors } = validateCampaign(Object.fromEntries(form), ids, active);
  const files = Object.fromEntries(['desktop', 'mobile'].map(kind => {
    const v = form.get(kind); return [kind, v instanceof File && (v.size > 0 || v.name !== '') ? v : null];
  })) as Record<'desktop' | 'mobile', File | null>;
  for (const kind of ['desktop','mobile'] as const) {
    const error = await validateCampaignUpload(files[kind]); if (error) errors[kind] = error;
  }
  if (Object.keys(errors).length) return { errors, error: 'Confira os campos destacados.' };
  const existing = id ? await getCampaign(client, id) : null;
  if (id && (!existing || existing.updated_at !== version)) return { error: 'Esta campanha foi alterada. Recarregue antes de salvar.' };
  const options = await campaignProductOptions(client);
  if (ids.some(id => !options.products.some(p => p.id === id))) return { errors: { products: 'Há produtos indisponíveis. Atualize a seleção.' }, error: 'Confira os produtos selecionados.' };
  if (active) for (const kind of ['desktop','mobile'] as const) {
    if (!files[kind] && !existing?.[`${kind}_image_path`]) errors[kind] = `Envie a imagem ${kind} antes de ativar.`;
  }
  if (Object.keys(errors).length) return { errors, error: 'Desktop e mobile são obrigatórios para ativar.' };
  const campaignId = id || randomUUID();
  const paths = { desktop: existing?.desktop_image_path || '', mobile: existing?.mobile_image_path || '' };
  const uploaded: string[] = [];
  try {
    for (const kind of ['desktop','mobile'] as const) if (files[kind]) {
      const file = files[kind]!;
      const path = `campaigns/${campaignId}/${kind}/${randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
      const { error } = await client.storage.from(CAMPAIGN_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error('campaign-upload'); paths[kind] = path; uploaded.push(path);
    }
    const { error } = await client.rpc('save_campaign', { p_id: campaignId, p_version: version,
      p_fields: { ...fields, desktop_image_path: paths.desktop, mobile_image_path: paths.mobile }, p_product_ids: ids, p_active: active });
    if (error) throw new Error(error.code === '23505' ? 'campaign-slug-conflict' : 'campaign-save');
  } catch (error) {
    try { await removeCampaignImages(client, uploaded); } catch { /* A committed reference is protected by Storage policy. */ }
    return { error: error instanceof Error && error.message === 'campaign-slug-conflict' ? 'Esse slug já está em uso. Escolha outro.' : 'Não foi possível salvar. Recarregue para conferir o estado antes de tentar novamente.' };
  }
  const old = existing ? [existing.desktop_image_path, existing.mobile_image_path].filter(path => path && !Object.values(paths).includes(path)) : [];
  try { await removeCampaignImages(client, old); } catch { return { id: campaignId, warning: 'A campanha foi salva; uma arte antiga aguarda limpeza segura.' }; }
  return { id: campaignId };
}
