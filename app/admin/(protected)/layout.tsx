import { AdminNavigation } from "@/components/admin/admin-navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LogoutButton } from "@/components/admin/logout-button";
import { CatalogLink } from "@/components/admin/catalog-link";
import { requireAdmin } from "@/lib/admin/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <div className="admin-shell">
    <a className="admin-skip" href="#admin-content">Pular para o conteúdo</a>
    <aside className="admin-sidebar">
      <BrandLogo size="lg" className="admin-sidebar-logo" />
      <nav aria-label="Navegação administrativa">
        <p className="admin-eyebrow">Editor do Catálogo</p>
        <AdminNavigation />
        <p className="admin-eyebrow admin-store-label">Loja</p>
        <CatalogLink />
      </nav>
      <div className="admin-sidebar-bottom"><LogoutButton /></div>
    </aside>
    <main id="admin-content" className="admin-main" tabIndex={-1}>{children}</main>
  </div>;
}
