import { redirect } from "next/navigation";
import { AuthForm } from "@/components/admin/auth-form";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export default async function ResetPage() {
  if (!getSupabaseConfig()) redirect("/admin/recuperar-senha");
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/admin/recuperar-senha?erro=link");
  return <>
    <p className="admin-eyebrow">Recuperar acesso</p>
    <h1>Uma nova <em>senha.</em></h1>
    <p className="admin-intro">Escolha sua nova senha para acessar o painel.</p>
    <AuthForm mode="reset" />
  </>;
}
