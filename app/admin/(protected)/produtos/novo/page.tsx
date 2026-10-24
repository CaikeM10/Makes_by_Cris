import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { createCatalogRepository } from "@/lib/catalog/supabase-repository";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProduct() {
  const { supabase } = await requireAdmin();
  try {
    const categories = await createCatalogRepository(supabase).categories();
    return <><p className="admin-eyebrow">Editor do catálogo</p><h1>Novo produto</h1><p className="admin-intro">Uma nova escolha para o seu catálogo.</p><ProductForm categories={categories} /></>;
  } catch {
    return <><h1>Novo produto</h1><p className="admin-message admin-error">Não foi possível carregar as categorias. Tente novamente.</p><Link className="admin-back" href="/admin/produtos">Voltar à lista</Link></>;
  }
}
