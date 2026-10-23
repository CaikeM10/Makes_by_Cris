import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { LogoutButton } from "@/components/admin/logout-button";

export default async function DeniedPage() {
  if (!getSupabaseConfig()) redirect("/admin/login");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return <>
    <p className="admin-eyebrow">Área restrita</p>
    <h1>Acesso <em>negado.</em></h1>
    <p className="admin-intro">Não foi possível autorizar esta conta para acessar o painel. Entre em contato com a pessoa responsável pelo acesso.</p>
    <LogoutButton />
  </>;
}
