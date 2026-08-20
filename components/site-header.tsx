"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Search, ShoppingBag } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { SearchOverlay } from "@/components/search-overlay";
import { useStore } from "@/components/store-provider";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Início" },
  { href: "/categorias", label: "Categorias" },
  { href: "/favoritos", label: "Favoritos" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { bagCount, favorites, lastAdded } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!lastAdded) return;
    setPulse(true);
    const timer = setTimeout(() => setPulse(false), 900);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#B45A67]/15 bg-[#F8ECEA] shadow-[0_1px_12px_rgba(120,70,70,0.04)]">
        <div className="container-boutique flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link
            href="/"
            className="shrink-0"
            aria-label="Ir para a página inicial"
          >
            <BrandLogo size="sm" className="lg:hidden" />
            <BrandLogo size="md" className="hidden lg:flex" />
          </Link>

          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-8 lg:flex"
          >
            {navLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm transition-colors hover:text-primary",
                    active ? "text-primary" : "text-foreground/80",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Buscar produtos"
              className="rounded-full p-2.5 text-foreground transition-colors hover:bg-secondary"
            >
              <Search className="size-5" aria-hidden="true" />
            </button>

            <Link
              href="/favoritos"
              aria-label={`Favoritos, ${favorites.length} ${favorites.length === 1 ? "item" : "itens"}`}
              className="relative hidden rounded-full p-2.5 text-foreground transition-colors hover:bg-secondary lg:block"
            >
              <Heart className="size-5" aria-hidden="true" />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-primary" />
              )}
            </Link>

            <Link
              href="/sacola"
              aria-label={`Sacola, ${bagCount} ${bagCount === 1 ? "item" : "itens"}`}
              className="relative rounded-full p-2.5 text-foreground transition-colors hover:bg-secondary"
            >
              {pulse && (
                <span
                  aria-hidden="true"
                  className="animate-bag-glow pointer-events-none absolute inset-0 rounded-full bg-primary/25"
                />
              )}
              <ShoppingBag className="size-5" aria-hidden="true" />
              {bagCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[0.625rem] font-semibold text-primary-foreground">
                  {bagCount > 9 ? "9+" : bagCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
