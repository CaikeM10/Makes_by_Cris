import { AuthForm } from "@/components/admin/auth-form";
import { getSupabaseConfig } from "@/lib/supabase/config";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const { senha } = await searchParams;
  const configured = Boolean(getSupabaseConfig());
  return <>
    <p className="admin-eyebrow">Área restrita</p>
    <h1>Acesse seu <em>painel.</em></h1>
    <p className="admin-intro">Entre para atualizar seu catálogo.</p>
    {!configured && <p className="admin-message" role="status">Acesso em configuração. {process.env.NODE_ENV === "development" ? "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY no ambiente." : "Tente novamente mais tarde."}</p>}
    {senha === "atualizada" && <p className="admin-message" role="status">Senha atualizada. Entre com sua nova senha.</p>}
    <AuthForm mode="login" disabled={!configured} />
  </>;
}
