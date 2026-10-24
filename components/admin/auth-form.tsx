"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { login, recoverPassword, resetPassword } from "@/app/admin/actions";
import type { AuthState } from "@/lib/admin/form-state";

export function AuthForm({ mode, disabled = false }: { mode: "login" | "recover" | "reset"; disabled?: boolean }) {
  const action = mode === "login" ? login : mode === "recover" ? recoverPassword : resetPassword;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, {});
  const [showPassword, setShowPassword] = useState(false);
  const messageId = "auth-result";
  return (
    <form action={formAction} className="admin-form" aria-busy={pending}>
      <fieldset disabled={disabled || pending}>
        <legend className="sr-only">{mode === "login" ? "Entrar no painel" : "Recuperar acesso"}</legend>
        {mode !== "reset" && <div className="admin-field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} autoCapitalize="none" spellCheck={false} aria-describedby={state.error ? messageId : undefined} />
        </div>}
        {mode !== "recover" && <div className="admin-field">
          <label htmlFor="password">{mode === "reset" ? "Nova senha" : "Senha"}</label>
          <div className="admin-password">
            <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "reset" ? "new-password" : "current-password"} required minLength={mode === "reset" ? 12 : undefined} maxLength={mode === "reset" ? 128 : 1024} aria-describedby={mode === "reset" ? `password-help ${messageId}` : state.error ? messageId : undefined} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} aria-controls="password">
              {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>}
        {mode === "reset" && <div className="admin-field">
          <p id="password-help" className="admin-help">Use de 12 a 128 caracteres. Escolha uma senha exclusiva.</p>
          <label htmlFor="confirmation">Confirme a nova senha</label>
          <input id="confirmation" name="confirmation" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required aria-describedby={messageId} />
        </div>}
        {mode === "login" && <Link className="admin-forgot" href="/admin/recuperar-senha">Esqueci minha senha</Link>}
        <div id={messageId} aria-live="polite" aria-atomic="true">
          {state.error && <p className="admin-message admin-error" role="alert">{state.error}</p>}
          {state.success && <p className="admin-message" role="status">{state.success}</p>}
        </div>
        <button className="admin-button" type="submit">
          {pending ? "Aguarde…" : mode === "login" ? "Entrar" : mode === "recover" ? "Enviar link de recuperação" : "Salvar nova senha"}
        </button>
      </fieldset>
      {mode !== "login" && <Link className="admin-back" href="/admin/login">Voltar ao login</Link>}
    </form>
  );
}
