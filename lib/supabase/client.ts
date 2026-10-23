"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Configure as variáveis públicas do Supabase.");
  return createBrowserClient(config.url, config.key);
}
