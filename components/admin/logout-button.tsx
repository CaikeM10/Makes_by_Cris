"use client";

import { useActionState } from "react";
import { logout } from "@/app/admin/actions";
import type { AuthState } from "@/lib/admin/form-state";

export function LogoutButton() {
  const [state, action, pending] = useActionState<AuthState>(logout, {});
  return <form action={action}>
    <button className="admin-logout" type="submit" disabled={pending}>{pending ? "Saindo…" : "Sair"}</button>
    {state.error && <p role="alert" className="admin-message">{state.error}</p>}
  </form>;
}
