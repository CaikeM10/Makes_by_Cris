"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/admin/site-url";
import type { AuthState } from "@/lib/admin/form-state";

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function login(_state: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").trim();
  const password = field(form, "password");
  if (!validEmail(email) || !password || password.length > 1024) return { error: "Informe um e-mail válido e sua senha." };
  if (!getSupabaseConfig()) return { error: "O acesso ainda não está configurado. Tente novamente mais tarde." };
  let allowed = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Não foi possível entrar. Confira e-mail e senha ou tente novamente mais tarde." };
    const { data, error: authorizationError } = await supabase.rpc("is_admin");
    allowed = !authorizationError && data === true;
  } catch {
    return { error: "Não foi possível entrar agora. Tente novamente mais tarde." };
  }
  revalidatePath("/admin", "layout");
  redirect(allowed ? "/admin" : "/admin/acesso-negado");
}

export async function recoverPassword(_state: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").trim();
  if (!validEmail(email)) return { error: "Informe um e-mail válido." };
  const siteUrl = getSiteUrl();
  if (!getSupabaseConfig() || !siteUrl) return { error: "A recuperação ainda não está configurada. Tente novamente mais tarde." };
  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl}/auth/confirm` });
  } catch {
    // A resposta não distingue e-mail inexistente, limites de envio ou falha do provedor.
  }
  return { success: "Se houver uma conta para este e-mail, você receberá instruções para redefinir sua senha. Confira também o spam." };
}

export async function resetPassword(_state: AuthState, form: FormData): Promise<AuthState> {
  const password = field(form, "password");
  if (password.length < 12 || password.length > 128) return { error: "Use uma senha com 12 a 128 caracteres." };
  if (password !== field(form, "confirmation")) return { error: "As senhas não coincidem." };
  if (!getSupabaseConfig()) return { error: "A recuperação está indisponível no momento." };
  try {
    const supabase = await createClient();
    const { data: { user }, error: identityError } = await supabase.auth.getUser();
    if (identityError || !user) return { error: "Sua sessão expirou. Solicite um novo link de recuperação." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "Não foi possível salvar. Use uma senha nova que atenda aos requisitos ou solicite outro link." };
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) return { success: "Senha atualizada. Volte ao login para continuar; não foi possível encerrar todas as sessões agora." };
  } catch {
    return { error: "Não foi possível concluir agora. Tente novamente ou solicite outro link." };
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/login?senha=atualizada");
}

export async function logout(_state: AuthState): Promise<AuthState> {
  try {
    if (getSupabaseConfig()) {
      const supabase = await createClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) return { error: "Não foi possível sair. Tente novamente." };
    }
  } catch {
    return { error: "Não foi possível sair. Confira sua conexão e tente novamente." };
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/login");
}
