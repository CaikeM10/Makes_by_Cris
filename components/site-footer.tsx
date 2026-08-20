import Link from "next/link";
import { AtSign, MapPin, MessageCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { categories } from "@/lib/data/categories";
import { storeConfig } from "@/lib/store-config";

export function SiteFooter() {
  const whatsappUrl = `https://wa.me/${storeConfig.whatsapp}?text=${encodeURIComponent(
    "Olá! Vi o catálogo da Cris Martins e gostaria de criar um catálogo personalizado para minha loja.",
  )}`;

  return (
    <footer className="mt-20 border-t border-border/70 bg-muted/60">
      <div className="container-boutique py-14 lg:py-16">
        {/* =====================================================
            CONTEÚDO PRINCIPAL
        ===================================================== */}
        <div className="grid gap-12 lg:grid-cols-[1.4fr_0.7fr_0.8fr] lg:gap-20">
          {/* =====================================================
              MARCA / SOBRE
          ===================================================== */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <BrandLogo size="sm" className="mb-5" />

            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Curadoria de maquiagem, perfumes e cuidados diários. Escolha seus
              favoritos e finalize o pedido pelo WhatsApp, com atendimento
              pessoal de Cris Martins.
            </p>

            <div className="mt-5 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />

              <div className="flex flex-col text-left">
                <span>Poranga - CE</span>
                <span>Seg a Sáb, 8h às 18h</span>
                <span>Dom, 8h às 12h</span>
              </div>
            </div>
          </div>

          {/* =====================================================
              CATEGORIAS
          ===================================================== */}
          <div className="flex flex-col items-center lg:items-start">
            <p className="eyebrow text-foreground">Categorias</p>

            <ul className="mt-4 flex flex-col items-center gap-2.5 lg:items-start">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categoria/${category.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* =====================================================
              ATENDIMENTO
          ===================================================== */}
          <div className="flex flex-col items-center lg:items-start">
            <p className="eyebrow text-foreground">Atendimento</p>

            <ul className="mt-4 flex flex-col items-center gap-2.5 lg:items-start">
              <li>
                <a
                  href={`https://wa.me/${storeConfig.whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  {storeConfig.whatsappDisplay}
                </a>
              </li>

              <li>
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AtSign className="size-4" aria-hidden="true" />
                  {storeConfig.instagram}
                </span>
              </li>

              <li>
                <Link
                  href="/sacola"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Minha sacola
                </Link>
              </li>

              <li>
                <Link
                  href="/admin"
                  className="text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Área da loja
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      {/* =====================================================
          RODAPÉ INFERIOR
      ===================================================== */}
      <div className="border-t border-border/70">
        <div className="container-boutique flex flex-col items-center gap-2 py-4 text-center lg:py-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Todos os direitos reservados © 2026 Crismartins.
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[0.6875rem] font-medium leading-relaxed text-primary/75 transition-colors hover:text-primary"
          >
            Crie seu catálogo personalizado com Caike Marinho →
          </a>
        </div>
      </div>
    </footer>
  );
}
