"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import type { AdminProduct, CatalogCategory } from "@/lib/catalog/repository";
import { productFields, publicationFields, validateProduct } from "@/lib/catalog/validation";
import { saveProduct } from "@/app/admin/(protected)/produtos/actions";
import { ProductPriceFields } from "./product-price-fields";
import { ProductPublicationFields } from "./product-publication-fields";

export function ProductForm({ product, categories }: { product: AdminProduct; categories: CatalogCategory[] }) {
  const [state, action, pending] = useActionState(saveProduct.bind(null, product.id, product.updated_at), {});
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const errors = Object.keys(clientErrors).length ? clientErrors : state.errors;
  // React resets uncontrolled fields after a resolved action, including validation
  // errors. Keep the current inputs; successful saves navigate to the list.
  return <form className="catalog-edit admin-form" action={action} onReset={event => event.preventDefault()} onSubmit={event => {
    const form = new FormData(event.currentTarget);
    const input: Record<string, unknown> = Object.fromEntries(form);
    for (const key of Object.keys(publicationFields)) input[key] = form.get(key) === "on";
    const result = validateProduct(input);
    setClientErrors(result.errors);
    if (!result.data) { event.preventDefault(); const first = Object.keys(result.errors)[0]; event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); }
  }}>
    <aside className="catalog-panel catalog-preview"><h2>Foto atual</h2><img src={product.image} alt={product.name} width={320} height={320} /><p className="admin-help">A troca de imagem estará disponível em uma próxima etapa.</p></aside>
    <div className="catalog-form-body"><fieldset className="catalog-panel" disabled={pending}><legend>Informações do produto</legend>
      {Object.entries(productFields).map(([key, spec]) => <div className="admin-field" key={key}><label htmlFor={key}>{spec.label}</label>{key.includes("description") ? <textarea id={key} name={key} required maxLength={spec.max} rows={key === "description" ? 6 : 3} defaultValue={product[key as keyof typeof productFields]} aria-invalid={!!errors?.[key]} aria-describedby={errors?.[key] ? `${key}-error` : undefined} /> : <input id={key} name={key} required maxLength={spec.max} defaultValue={product[key as keyof typeof productFields]} aria-invalid={!!errors?.[key]} aria-describedby={errors?.[key] ? `${key}-error` : undefined} />}{errors?.[key] && <p className="catalog-field-error" id={`${key}-error`}>{errors[key]}</p>}</div>)}
      <div className="admin-field"><label htmlFor="category_id">Categoria</label><select id="category_id" name="category_id" required defaultValue={product.category_id} aria-invalid={!!errors?.category_id} aria-describedby={errors?.category_id ? "category-error" : undefined}>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (inativa)"}</option>)}</select>{errors?.category_id && <p id="category-error" className="catalog-field-error">{errors.category_id}</p>}</div>
    </fieldset><div className="catalog-disabled-group" inert={pending}><ProductPriceFields product={product} errors={errors} /><ProductPublicationFields product={product} /></div>
    <div aria-live="polite">{state.error && <p className="admin-message admin-error" role="alert">{state.error}</p>}{Object.keys(clientErrors).length > 0 && <p className="admin-message admin-error" role="alert">Confira os campos indicados.</p>}</div>
    <div className="catalog-actions"><Link className="catalog-secondary" href="/admin/produtos">Voltar à lista</Link><button className="admin-button" disabled={pending}>{pending ? "Salvando…" : "Salvar alterações"}</button></div></div>
  </form>;
}
