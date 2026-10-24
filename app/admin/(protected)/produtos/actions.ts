"use server";
import { requireAdmin } from "@/lib/admin/auth";
import { createCatalogRepository } from "@/lib/catalog/supabase-repository";
import { updateProduct, type ProductFormState } from "@/lib/catalog/update-product";
import { publicationFields } from "@/lib/catalog/validation";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveProduct(id: string, version: string, _state: ProductFormState, form: FormData): Promise<ProductFormState> {
  const { supabase } = await requireAdmin();
  const input: Record<string, unknown> = Object.fromEntries(form);
  for (const key of Object.keys(publicationFields)) input[key] = form.get(key) === "on";
  const result = await updateProduct(createCatalogRepository(supabase), id, version, input);
  if (result.error) return result;
  revalidatePath("/admin/produtos");
  revalidatePath(`/admin/produtos/${encodeURIComponent(id)}/editar`);
  redirect("/admin/produtos?salvo=1");
}
