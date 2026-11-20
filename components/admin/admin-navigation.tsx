"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavigation() {
  const path = usePathname();
  const link = (href: string, label: string) => {
    const active = href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`);
    return <Link key={href} className={active ? "admin-nav-active" : "admin-nav-link"} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
  };
  return <>{link("/admin", "Início")}
    <p className="admin-eyebrow admin-store-label">Catálogo</p>
    {link("/admin/produtos", "Produtos")}{link("/admin/campanhas", "Campanhas")}
    <p className="admin-eyebrow admin-store-label">Desempenho</p>
    {link("/admin/analytics", "Analytics")}
  </>;
}
