import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { readPublicCampaign } from "./repository";

export const getPublicCampaign = cache(async (slug?: string) => readPublicCampaign(await createClient(), slug));
export async function getHomeCampaign() {
  try { return (await getPublicCampaign())?.campaign ?? null; }
  catch { console.warn('Campanha indisponível; exibindo banner padrão.'); return null; }
}
