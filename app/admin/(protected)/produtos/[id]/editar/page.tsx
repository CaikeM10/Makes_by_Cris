import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createCatalogRepository } from "@/lib/catalog/supabase-repository";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const repository = createCatalogRepository(supabase);
  let loaded;
  try { loaded = await Promise.all([repository.get(id), repository.categories()]); }
  catch { return <><h1>Editar produto</h1><p className="admin-message admin-error">Não foi possível carregar o produto. Tente novamente mais tarde.</p><Link className="admin-back" href="/admin/produtos">Voltar à lista</Link></>; }
  const [product, categories] = loaded;
  if (!product) notFound();
  return <><p className="admin-eyebrow">Editor do catálogo</p><h1>Editar produto</h1><p className="admin-intro">{product.name}</p><ProductForm product={product} categories={categories} /></>;
}
