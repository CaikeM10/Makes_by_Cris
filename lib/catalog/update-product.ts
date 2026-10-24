import type { CatalogRepository } from "./repository";
import { validateProduct } from "./validation";

export type ProductFormState = { error?: string; errors?: Record<string, string> };
export async function updateProduct(repository: CatalogRepository, id: string, version: string, input: Record<string, unknown>): Promise<ProductFormState> {
  const result = validateProduct(input);
  if (!result.data) return { error: "Confira os campos indicados.", errors: result.errors };
  if (!id || id.length > 100 || !/^\d{4}-\d{2}-\d{2}T/.test(version) || !Number.isFinite(Date.parse(version))) return { error: "Atualize a página antes de salvar novamente." };
  try {
    const categories = await repository.categories();
    if (!categories.some(c => c.id === result.data!.category_id)) return { error: "Selecione uma categoria válida.", errors: { category_id: "Categoria não encontrada." } };
    const saved = await repository.update(id, version, result.data);
    return saved ? {} : { error: "Este produto foi atualizado em outra sessão. Atualize a página antes de salvar novamente." };
  } catch {
    return { error: "Não foi possível salvar agora. Seus dados continuam no formulário. Tente novamente." };
  }
}
