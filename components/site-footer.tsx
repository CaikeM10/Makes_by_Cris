import Link from "next/link";
import {
  MapPin,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";

import { BrandLogo } from "@/components/brand-logo";
import { categories } from "@/lib/data/categories";
import { storeConfig } from "@/lib/store-config";

/* =====================================================
   ÍCONE WHATSAPP
===================================================== */
function WhatsAppIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.04 2a9.84 9.84 0 0 0-8.42 14.92L2.05 22l5.2-1.52A9.9 9.9 0 1 0 12.04 2Zm0 17.98a8.03 8.03 0 0 1-4.1-1.12l-.29-.17-3.08.9.92-3-.19-.31a8.02 8.02 0 1 1 6.74 3.7Zm4.4-6.02c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2a7.3 7.3 0 0 1-1.34-1.66c-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.18 1.1.16 1.51.1.46-.07 1.43-.59 1.63-1.15.2-.56.2-1.03.14-1.13-.06-.1-.22-.16-.46-.28Z" />
    </svg>
  );
}

/* =====================================================
   ÍCONE INSTAGRAM
   SVG inline para evitar incompatibilidade com lucide
===================================================== */
function InstagramIcon({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7Zm10 2c1.66 0 3 1.34 3 3v10c0 1.66-1.34 3-3 3H7c-1.66 0-3-1.34-3-3V7c0-1.66 1.34-3 3-3h10Zm-5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm5.25-3.25a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" />
    </svg>
  );
}

export function SiteFooter() {
  const activeCategories = categories.filter(
    (category) => category.active,
  );

  const instagramUsername = storeConfig.instagram.replace(
    "@",
    "",
  );

  const storeWhatsAppUrl = `https://wa.me/${storeConfig.whatsapp}`;

  const instagramUrl = `https://instagram.com/${instagramUsername}`;

  /* =====================================================
     SEU WHATSAPP

     Coloque:
     55 + DDD + número

     Exemplo:
     5588999999999
  ===================================================== */
  const developerWhatsapp = "5588997049149";

  const developerMessage =
    "Olá! Vi o catálogo da Cris Martins e gostaria de criar um catálogo personalizado para minha loja.";

  const developerWhatsappUrl = `https://wa.me/${developerWhatsapp}?text=${encodeURIComponent(
    developerMessage,
  )}`;

  return (
    <footer className="mt-20 border-t border-primary/10 bg-blush/35 pb-20 md:pb-0">
      {/* =====================================================
          CONTEÚDO PRINCIPAL
      ===================================================== */}
      <div className="container-boutique py-10 sm:py-12 lg:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.35fr_0.65fr_0.8fr] lg:gap-20">
          {/* =====================================================
              MARCA

              Mobile:
              ocupa as duas colunas.

              Desktop:
              ocupa somente a primeira coluna.
          ===================================================== */}
          <div className="col-span-2 flex flex-col items-center text-center lg:col-span-1 lg:items-start lg:text-left">
            <p className="mb-4 text-[0.625rem] font-medium uppercase tracking-[0.22em] text-primary/70">
              Beleza • Autocuidado • Presentes
            </p>

            <BrandLogo
              size="sm"
              className="mb-5"
            />

            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Beleza, autocuidado e presentes selecionados
              para transformar cada escolha em algo especial.
            </p>

            {/* LOCALIZAÇÃO */}
            <div className="mt-6 flex items-start gap-3 text-sm text-muted-foreground">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/15 bg-background/50 text-primary">
                <MapPin
                  className="size-3.5"
                  aria-hidden="true"
                />
              </div>

              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-medium text-foreground/80">
                  Poranga - CE
                </span>

                <span>
                  Seg a Sáb, 8h às 18h
                </span>

                <span>
                  Dom, 8h às 12h
                </span>
              </div>
            </div>

            {/* REDES SOCIAIS */}
            <div className="mt-6 flex items-center gap-2.5">
              {/* INSTAGRAM */}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram da Makes by Cris Martins"
                title="Instagram"
                className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-background/40 text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <InstagramIcon className="size-4" />
              </a>

              {/* WHATSAPP */}
              <a
                href={storeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp da Makes by Cris Martins"
                title="WhatsApp"
                className="flex size-10 items-center justify-center rounded-full border border-primary/20 bg-background/40 text-primary transition-all duration-300 hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <WhatsAppIcon className="size-4" />
              </a>
            </div>
          </div>

          {/* =====================================================
              EXPLORAR

              Mobile:
              coluna esquerda.

              Desktop:
              coluna central.
          ===================================================== */}
          <div className="flex flex-col items-start">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-foreground">
              Explorar
            </p>

            <ul className="mt-5 flex flex-col items-start gap-3">
              {activeCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categoria/${category.slug}`}
                    className="group relative text-sm text-muted-foreground transition-colors duration-300 hover:text-primary"
                  >
                    {category.name}

                    <span className="absolute -bottom-1 left-0 h-px w-0 bg-primary transition-all duration-300 group-hover:w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* =====================================================
              ATENDIMENTO

              Mobile:
              coluna direita.

              Desktop:
              terceira coluna.
          ===================================================== */}
          <div className="flex flex-col items-start">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.2em] text-foreground">
              Atendimento
            </p>

            <ul className="mt-5 flex flex-col items-start gap-3.5">
              {/* WHATSAPP */}
              <li>
                <a
                  href={storeWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-primary"
                >
                  <MessageCircle
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />

                  <span className="text-left">
                    {storeConfig.whatsappDisplay}
                  </span>
                </a>
              </li>

              {/* INSTAGRAM */}
              <li>
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-primary"
                >
                  <InstagramIcon className="size-4 shrink-0" />

                  <span className="min-w-0 break-all sm:break-normal">
                    {storeConfig.instagram}
                  </span>
                </a>
              </li>

              {/* SACOLA */}
              <li>
                <Link
                  href="/sacola"
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors duration-300 hover:text-primary"
                >
                  <ShoppingBag
                    className="size-4 shrink-0"
                    aria-hidden="true"
                  />

                  Minha sacola
                </Link>
              </li>
            </ul>

            {/* BOTÃO WHATSAPP */}
            <a
              href={storeWhatsAppUrl}
              target="_blank"
              rel="noreferrer"
              className="group mt-7 inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-primary/20 bg-background/40 px-3.5 text-[0.65rem] font-medium text-primary transition-all duration-300 hover:border-primary hover:bg-primary hover:text-primary-foreground sm:px-5 sm:text-xs"
            >
              <WhatsAppIcon className="size-3.5 shrink-0" />

              <span>
                Falar com a Cris
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* =====================================================
          RODAPÉ INFERIOR
      ===================================================== */}
      <div className="border-t border-primary/10">
        <div className="container-boutique flex flex-col items-center justify-between gap-5 py-6 text-center sm:flex-row sm:text-left lg:py-6">
          {/* COPYRIGHT */}
          <p className="max-w-xs text-[0.6875rem] leading-relaxed text-muted-foreground sm:max-w-none">
            © 2026 Cris Martins. Todos os direitos reservados.
          </p>

          {/* CRÉDITO DO DESENVOLVEDOR */}
          <div className="flex flex-col items-center gap-1 sm:items-end">
            <span className="text-[0.5rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              Desenvolvido por
            </span>

            <a
              href={developerWhatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1 text-xs font-medium text-primary/80 transition-colors duration-300 hover:text-primary"
            >
              Caike Marinho

              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}