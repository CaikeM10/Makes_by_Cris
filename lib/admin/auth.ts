import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function requireAdmin() {
  if (!getSupabaseConfig()) redirect("/admin/login");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/admin/login");
  const { data: allowed, error: authorizationError } = await supabase.rpc("is_admin");
  // Erro na consulta também bloqueia: nunca permitir por omissão.
  if (authorizationError || allowed !== true) redirect("/admin/acesso-negado");
  return { supabase, user };
}
