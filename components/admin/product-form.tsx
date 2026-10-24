"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AdminProduct, CatalogCategory } from "@/lib/catalog/repository";
import { productFields, publicationFields, validateProduct } from "@/lib/catalog/validation";
import { saveProduct, createProduct } from "@/app/admin/(protected)/produtos/actions";
import { validateProductImage } from "@/lib/catalog/product-image";
import { ProductImageField } from "./product-image-field";
import { ProductPriceFields } from "./product-price-fields";
import { ProductPublicationFields } from "./product-publication-fields";

export function ProductForm({ product: existing, categories }: { product?: AdminProduct; categories: CatalogCategory[] }) {
  const product = existing ?? {
    name: "", brand: "", short_description: "", description: "", price: "", credit_price: "",
    category_id: "", active: true, available: true, featured: false, best_seller: false, gift_section: false,
  };
  const [state, action, pending] = useActionState(existing ? saveProduct.bind(null, existing.id, existing.updated_at) : createProduct, {});
  const submitting = useRef(false);
  useEffect(() => { if (!pending) submitting.current = false; }, [pending, state]);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const errors = Object.keys(clientErrors).length ? clientErrors : state.errors;
  // React resets uncontrolled fields after a resolved action, including validation
  // errors. Keep the current inputs; successful saves navigate to the list.
  return <form className="catalog-edit admin-form" action={action} onReset={event => event.preventDefault()} onSubmit={event => {
    if (submitting.current || pending) { event.preventDefault(); return; }
    const form = new FormData(event.currentTarget);
    const input: Record<string, unknown> = Object.fromEntries(form);
    for (const key of Object.keys(publicationFields)) input[key] = form.get(key) === "on";
    const result = validateProduct(input);
    const image = form.get("image");
    const imageError = validateProductImage(image instanceof File && (image.size > 0 || image.name !== "") ? image : null, !existing);
    if (imageError) result.errors.image = imageError;
    setClientErrors(result.errors);
    if (pending || !result.data || imageError) { event.preventDefault(); const first = Object.keys(result.errors)[0]; event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(); }
    else submitting.current = true;
  }}>
    <ProductImageField image={existing?.image} name={product.name} pending={pending} error={errors?.image} />
    <div className="catalog-form-body"><fieldset className="catalog-panel" disabled={pending}><legend>Informações do produto</legend>
      {Object.entries(productFields).map(([key, spec]) => <div className="admin-field" key={key}><label htmlFor={key}>{spec.label}</label>{key.includes("description") ? <textarea id={key} name={key} required maxLength={spec.max} rows={key === "description" ? 6 : 3} defaultValue={product[key as keyof typeof productFields]} aria-invalid={!!errors?.[key]} aria-describedby={errors?.[key] ? `${key}-error` : undefined} /> : <input id={key} name={key} required maxLength={spec.max} defaultValue={product[key as keyof typeof productFields]} aria-invalid={!!errors?.[key]} aria-describedby={errors?.[key] ? `${key}-error` : undefined} />}{errors?.[key] && <p className="catalog-field-error" id={`${key}-error`}>{errors[key]}</p>}</div>)}
      <div className="admin-field"><label htmlFor="category_id">Categoria</label><select id="category_id" name="category_id" required defaultValue={product.category_id} aria-invalid={!!errors?.category_id} aria-describedby={errors?.category_id ? "category-error" : undefined}><option value="" disabled>Selecione uma categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (inativa)"}</option>)}</select>{errors?.category_id && <p id="category-error" className="catalog-field-error">{errors.category_id}</p>}</div>
    </fieldset><div className="catalog-disabled-group" inert={pending}><ProductPriceFields product={product} errors={errors} /><ProductPublicationFields product={product} /></div>
    <div aria-live="polite">{state.error && <p className="admin-message admin-error" role="alert">{state.error}</p>}{Object.keys(clientErrors).length > 0 && <p className="admin-message admin-error" role="alert">Confira os campos indicados.</p>}</div>
    <div className="catalog-actions"><Link className="catalog-secondary" href="/admin/produtos">Voltar à lista</Link><button className="admin-button" disabled={pending}>{pending ? "Enviando imagem e salvando…" : existing ? "Salvar alterações" : "Cadastrar produto"}</button></div></div>
  </form>;
}
