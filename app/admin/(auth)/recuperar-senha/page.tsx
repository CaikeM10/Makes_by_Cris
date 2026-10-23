import { AuthForm } from "@/components/admin/auth-form";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/admin/site-url";

export default async function RecoverPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const configured = Boolean(getSupabaseConfig() && getSiteUrl());
  return <>
    <p className="admin-eyebrow">Recuperar acesso</p>
    <h1>Esqueceu sua <em>senha?</em></h1>
    <p className="admin-intro">Informe seu e-mail para receber as instruções.</p>
    {erro === "link" && <p className="admin-message admin-error" role="alert">Este link é inválido ou expirou. Solicite um novo abaixo.</p>}
    {!configured && <p className="admin-message" role="status">Recuperação em configuração. {process.env.NODE_ENV === "development" ? "Confira as variáveis do Supabase e NEXT_PUBLIC_SITE_URL." : "Tente novamente mais tarde."}</p>}
    <AuthForm mode="recover" disabled={!configured} />
  </>;
}
