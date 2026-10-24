import { randomUUID } from "node:crypto";
import type { CatalogRepository } from "./repository";
import type { ProductStorage } from "./product-storage";
import type { ProductFormState } from "./update-product";
import { validateProduct } from "./validation";
import { isProductImagePath, productImagePath, validateImageContent, validateProductImage } from "./product-image";

export function productSlug(name: string): string {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 180).replace(/-$/, "") || "produto";
}

type SaveResult = ProductFormState & { id?: string; warning?: string };
type Identity = { id: string; version: string };
export async function saveCatalogProduct(repository: CatalogRepository, storage: ProductStorage, input: Record<string, unknown>, file: File | null, identity?: Identity): Promise<SaveResult> {
  const validated = validateProduct(input);
  if (!validated.data) return { error: "Confira os campos indicados.", errors: validated.errors };
  const imageError = validateProductImage(file, !identity);
  if (imageError) return { error: imageError, errors: { image: imageError } };
  if (identity && (!identity.id || identity.id.length > 100 || !/^\d{4}-\d{2}-\d{2}T/.test(identity.version) || !Number.isFinite(Date.parse(identity.version)))) return { error: "Atualize a página antes de salvar novamente." };
  let uploaded: string | undefined;
  let committed = false;
  const id = identity?.id ?? randomUUID();
  const cleanup = async (path: string) => {
    try { await storage.remove(path); return true; }
    catch {
      // Never log SDK errors, request objects, credentials or file contents.
      console.warn("catalog-image-cleanup-failed", { productId: id, path });
      return false;
    }
  };
  try {
    const categories = await repository.categories();
    if (!categories.some(c => c.id === validated.data!.category_id)) return { error: "Selecione uma categoria válida.", errors: { category_id: "Categoria não encontrada." } };
    const previous = identity ? await repository.get(id) : null;
    if (identity && (!previous || previous.updated_at !== identity.version)) return { error: "Este produto foi atualizado em outra sessão. Atualize a página antes de salvar novamente." };
    if (file) {
      const contentError = await validateImageContent(file);
      if (contentError) return { error: contentError, errors: { image: contentError } };
    }
    const base = productSlug(validated.data.name);
    let suffix = 1;
    const nextSlug = async () => {
      while (suffix <= 10000) {
        const candidate = suffix === 1 ? base : `${base}-${suffix}`;
        suffix++;
        if (!await repository.slugExists(candidate)) return candidate;
      }
      throw new Error("slug-exhausted");
    };
    let slug = identity ? undefined : await nextSlug();
    if (file) {
      const path = productImagePath(id, randomUUID(), file.type);
      try { await storage.upload(path, file); }
      catch { return { error: "Não foi possível enviar a imagem. Seus dados continuam no formulário. Tente novamente." }; }
      uploaded = path;
    }
    if (identity) {
      const saved = await repository.update(id, identity.version, { ...validated.data, ...(uploaded ? { image: uploaded } : {}) });
      if (!saved) {
        if (uploaded) await cleanup(uploaded);
        return { error: "Este produto foi atualizado em outra sessão. Atualize a página antes de salvar novamente." };
      }
      committed = true;
      if (uploaded && previous && isProductImagePath(previous.image) && previous.image.startsWith(`products/${id}/`)) {
        if (!await cleanup(previous.image)) return { id, warning: "Produto salvo. A imagem anterior não pôde ser removida; a limpeza ficou pendente." };
      }
    } else {
      // The unique constraint protects concurrent creates between check and insert.
      while (true) {
        const result = await repository.insert({ ...validated.data, id, slug: slug!, image: uploaded! });
        if (result === "created") break;
        slug = await nextSlug();
      }
      committed = true;
    }
    return { id };
  } catch {
    if (uploaded && !committed) await cleanup(uploaded);
    return { error: "Não foi possível salvar agora. Seus dados continuam no formulário. Tente novamente." };
  }
}
