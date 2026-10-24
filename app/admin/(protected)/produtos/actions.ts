"use server";
import { requireAdmin } from "@/lib/admin/auth";
import { createCatalogRepository } from "@/lib/catalog/supabase-repository";
import type { ProductFormState } from "@/lib/catalog/update-product";
import { saveCatalogProduct } from "@/lib/catalog/save-product";
import { createProductStorage } from "@/lib/catalog/product-storage";
import { publicationFields } from "@/lib/catalog/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveProduct(id: string, version: string, _state: ProductFormState, form: FormData): Promise<ProductFormState> {
  return persistProduct(form, { id, version });
}

export async function createProduct(_state: ProductFormState, form: FormData): Promise<ProductFormState> {
  return persistProduct(form);
}

async function persistProduct(form: FormData, identity?: { id: string; version: string }): Promise<ProductFormState> {
  const { supabase } = await requireAdmin();
  const input: Record<string, unknown> = Object.fromEntries(form);
  for (const key of Object.keys(publicationFields)) input[key] = form.get(key) === "on";
  const image = form.get("image");
  const file = image instanceof File && (image.size > 0 || image.name !== "") ? image : null;
  const result = await saveCatalogProduct(createCatalogRepository(supabase), createProductStorage(supabase), input, file, identity);
  if (result.error) return result;
  const id = result.id!;
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${encodeURIComponent(id)}/editar`);
  // Covers all product/category pages, Home and the shared selection snapshot.
  revalidatePath("/(loja)", "layout");
  if (!identity || result.warning) redirect(`/admin/produtos/${encodeURIComponent(id)}/editar?${result.warning ? "limpeza=pendente" : "criado=1"}`);
  redirect("/admin/produtos?salvo=1");
}
