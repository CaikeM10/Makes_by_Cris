"use client";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { saveCampaign } from "@/app/admin/(protected)/campanhas/actions";
import type { CampaignBanner, CampaignWithProducts } from "@/lib/campaigns/model";
import type { PublicProduct } from "@/lib/catalog/mappers";
import type { Category } from "@/lib/types";
import { formatCurrency, normalizeText } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import { resolveProductImage, validateProductImage } from "@/lib/catalog/product-image";

function CampaignImageField({ kind, initial, pending, error, onReady }: { kind: 'desktop' | 'mobile'; initial: string; pending: boolean; error?: string; onReady: (ready: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial);
  const [localError, setLocalError] = useState<string>();
  useEffect(() => {
    if (!file) { setPreview(initial); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, initial]);
  return <div className="catalog-panel campaign-image-field">
    <h2>Preview {kind === 'desktop' ? 'Desktop' : 'Mobile'}</h2>
    <p className="admin-help">{kind === 'desktop' ? 'Recomendado: arte horizontal ampla, 1920 × 720' : 'Recomendado: arte horizontal compacta para celular, 1080 × 720 (3:2). Mantenha o foco no centro e reserve espaço à esquerda e abaixo para o texto'}. WebP, JPEG ou PNG; até 5 MiB.</p>
    {preview ? <SafeImage src={preview} alt={`Preview ${kind}`} className={`campaign-art-preview campaign-art-preview-${kind}`} /> : <p className="admin-message">Imagem {kind} pendente</p>}
    <label className="admin-help" htmlFor={kind}>Banner {kind === 'desktop' ? 'Desktop' : 'Mobile'}</label>
    <input id={kind} name={kind} type="file" accept="image/webp,image/jpeg,image/png" disabled={pending} aria-invalid={!!(localError || error)} aria-describedby={`${kind}-error`} onChange={event => {
      const selected = event.target.files?.[0] || null; const problem = validateProductImage(selected); setLocalError(problem);
      if (problem) { event.target.value = ''; setFile(null); onReady(!!initial); }
      else { setFile(selected); onReady(!!selected || !!initial); }
    }} />
    {(localError || error) && <p id={`${kind}-error`} className="catalog-field-error" role="alert">{localError || error}</p>}
  </div>;
}

export function CampaignForm({ campaign, images, products, categories }: { campaign?: CampaignWithProducts; images?: CampaignBanner; products: PublicProduct[]; categories: Category[] }) {
  const [state, action, pending] = useActionState(saveCampaign.bind(null, campaign?.id || null, campaign?.updated_at || null), {});
  const [selected, setSelected] = useState<string[]>(campaign?.productIds.filter(id => products.some(p => p.id === id)) || []);
  const [query, setQuery] = useState('');
  const [desktopReady, setDesktopReady] = useState(!!images?.desktopUrl);
  const [mobileReady, setMobileReady] = useState(!!images?.mobileUrl);
  const [active, setActive] = useState(!!campaign?.active);
  const ready = desktopReady && mobileReady && selected.length > 0;
  const fields = [['name','Nome interno',200],['slug','Slug',150],['title','Título',200],['description','Descrição',2000],['button_text','Texto do botão',80]] as const;
  return <form action={action} className="campaign-form admin-form" onReset={e => e.preventDefault()}>
    <fieldset className="catalog-panel" disabled={pending}><legend>Informações da campanha</legend>
      <p className="admin-help">No celular, título e descrição aparecem em até 3 linhas cada, com reticências quando necessário. O conteúdo completo continua na página da campanha. Prefira textos curtos para o banner.</p>
      {fields.map(([key,label,max]) => <div className="admin-field" key={key}><label htmlFor={key}>{label}</label>{key === 'description'
        ? <textarea id={key} name={key} rows={3} maxLength={max} defaultValue={campaign?.[key] || ''} aria-invalid={!!state.errors?.[key]} aria-describedby={state.errors?.[key] ? `${key}-error` : undefined} />
        : <input id={key} name={key} maxLength={max} required defaultValue={campaign?.[key] || (key === 'button_text' ? 'Ver seleção' : '')} pattern={key === 'slug' ? '[a-z0-9]+(-[a-z0-9]+)*' : undefined} aria-invalid={!!state.errors?.[key]} aria-describedby={state.errors?.[key] ? `${key}-error` : undefined} />}
        {state.errors?.[key] && <p id={`${key}-error`} className="catalog-field-error">{state.errors[key]}</p>}</div>)}
    </fieldset>
    <div className="catalog-two-columns"><CampaignImageField kind="desktop" initial={images?.desktopUrl || ''} pending={pending} error={state.errors?.desktop} onReady={setDesktopReady} />
      <CampaignImageField kind="mobile" initial={images?.mobileUrl || ''} pending={pending} error={state.errors?.mobile} onReady={setMobileReady} /></div>
    <fieldset className="catalog-panel" disabled={pending}><legend>Produtos da campanha</legend>
      <p>Produtos selecionados: {selected.length}</p><p className="admin-help">Somente produtos ativos e disponíveis. Use as setas para ordenar a seleção.</p>
      {selected.map(id => <input type="hidden" name="product_ids" value={id} key={id} />)}
      {!!selected.length && <ol className="campaign-selected">{selected.map((id,index) => <li key={id}><span>{products.find(p => p.id === id)?.name}</span><div>
        {[-1,1].map(direction => <button key={direction} className="catalog-secondary" type="button" disabled={pending || index+direction < 0 || index+direction >= selected.length} aria-label={`${direction < 0 ? 'Subir' : 'Descer'} ${products.find(p=>p.id===id)?.name}`} onClick={() => setSelected(previous => { const next=[...previous]; [next[index],next[index+direction]]=[next[index+direction],next[index]]; return next; })}>{direction < 0 ? '↑' : '↓'}</button>)}
      </div></li>)}</ol>}
      <div className="admin-field"><label htmlFor="campaign-search">Buscar produto por nome</label><input id="campaign-search" type="search" value={query} onChange={e=>setQuery(e.target.value)} /></div>
      <div className="campaign-product-options">{products.filter(p => normalizeText(p.name).includes(normalizeText(query))).map(p => <label key={p.id} className="campaign-product-option">
        <input type="checkbox" checked={selected.includes(p.id)} onChange={e => setSelected(previous => e.target.checked ? previous.includes(p.id) ? previous : [...previous,p.id] : previous.filter(id=>id!==p.id))} />
        <SafeImage src={resolveProductImage(p.image)} alt="" /><span>{p.name}<small>{formatCurrency(p.price)} · {categories.find(c=>c.slug===p.category)?.name}</small></span>
      </label>)}</div>
      {state.errors?.products && <p className="catalog-field-error" role="alert">{state.errors.products}</p>}
    </fieldset>
    <fieldset className="catalog-panel" disabled={pending}><legend>Publicação</legend>
      <label className="campaign-active-check"><input name="active" type="checkbox" checked={active && ready} onChange={e=>setActive(e.target.checked)} disabled={pending || !ready} /> Campanha ativa</label>
      <p className="admin-help">{ready ? 'Ao ativar, a campanha anterior será desativada automaticamente.' : 'Para ativar, envie as duas artes e selecione ao menos um produto. Você pode salvar um rascunho.'}</p>
    </fieldset>
    {state.error && <p className="admin-message admin-error" role="alert">{state.error}</p>}
    <div className="catalog-actions"><Link className="catalog-secondary" href="/admin/campanhas">Voltar às campanhas</Link><button className="admin-button" disabled={pending}>{pending ? 'Enviando artes e salvando…' : 'Salvar campanha'}</button></div>
  </form>;
}
