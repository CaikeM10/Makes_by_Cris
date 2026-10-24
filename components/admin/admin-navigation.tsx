"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function AdminNavigation() {
  const path = usePathname();
  return <>{[["/admin", "Início"], ["/admin/produtos", "Todos os produtos"]].map(([href, label]) => {
    const active = href === "/admin" ? path === href : path.startsWith(href);
    return <Link key={href} className={active ? "admin-nav-active" : "admin-nav-link"} href={href} aria-current={active ? "page" : undefined}>{label}</Link>;
  })}</>;
}
