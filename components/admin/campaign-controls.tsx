"use client";
import { useActionState } from "react";
import { changeCampaign } from "@/app/admin/(protected)/campanhas/actions";
import type { Campaign } from "@/lib/campaigns/model";

export function CampaignControls({ campaign, remove = false }: { campaign: Campaign; remove?: boolean }) {
  const operation = remove ? 'delete' : campaign.active ? 'deactivate' : 'activate';
  const [state, action, pending] = useActionState(changeCampaign.bind(null, campaign.id, campaign.updated_at, operation), {});
  return <form action={action} onSubmit={event => { if (remove && !window.confirm('Excluir esta campanha? Os produtos do catálogo serão preservados.')) event.preventDefault(); }}>
    <button className="catalog-secondary" disabled={pending}>{pending ? 'Aguarde…' : remove ? 'Excluir campanha' : campaign.active ? 'Desativar' : 'Ativar'}</button>
    {state.error && <p className="admin-message admin-error" role="alert">{state.error}</p>}
  </form>;
}
