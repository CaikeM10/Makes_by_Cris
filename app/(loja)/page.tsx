import { ArrowRight } from "lucide-react";

import { LinkButton } from "@/components/link-button";
import { CategoryCarousel } from "@/components/category-carousel";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { getPublicCatalog } from "@/lib/catalog/public-server";
import { storeConfig } from "@/lib/store-config";

export default async function HomePage() {
  const { categories, bestSellers, featuredProducts, giftProducts, getProductsByCategory, newArrivals } = await getPublicCatalog();
  const activeCategories = categories.filter((category) => category.active);

  const categoryCounts = Object.fromEntries(
    activeCategories.map((category) => [
      category.slug,
      getProductsByCategory(category.slug).length,
    ]),
  );

  // Evita repetir os mesmos produtos entre as vitrines da home.
  const highlights = featuredProducts.slice(0, 4);

  const highlightIds = new Set(
    highlights.map((product) => product.id),
  );

  const topSellers = bestSellers
    .filter((product) => !highlightIds.has(product.id))
    .slice(0, 4);

  const topSellerIds = new Set(
    topSellers.map((product) => product.id),
  );

  const gifts = giftProducts
    .filter(
      (product) =>
        !highlightIds.has(product.id) &&
        !topSellerIds.has(product.id),
    )
    .slice(0, 4);

  const shownIds = new Set([
    ...highlightIds,
    ...topSellerIds,
    ...gifts.map((product) => product.id),
  ]);

  const latest = newArrivals
    .filter((product) => !shownIds.has(product.id))
    .slice(0, 4);

  return (
    <div className="flex flex-col gap-11 pb-14 sm:gap-14 lg:gap-20 lg:pb-24">
      {/* Hero editorial */}
      <section className="container-boutique pt-4 lg:pt-8">
        <div className="relative overflow-hidden rounded-2xl bg-muted lg:rounded-3xl">
          {/* Mobile: faixa editorial curta e larga, para a busca e as categorias
              aparecerem logo na primeira dobra. No desktop volta a ser um painel. */}
          <img
            src="/images/banner-editorial.png"
            alt="Modelo segurando um batom em cenário rosé"
            className="h-20 w-full object-cover object-[68%_26%] sm:h-36 lg:absolute lg:inset-0 lg:h-full lg:object-right"
          />

          <div
            aria-hidden="true"
            className="hidden lg:absolute lg:inset-0 lg:block lg:bg-gradient-to-r lg:from-background lg:via-background/85 lg:to-transparent"
          />

          <div className="relative flex flex-col items-start gap-2 px-5 pt-3.5 pb-4 sm:gap-4 sm:px-8 sm:pt-6 sm:pb-7 lg:min-h-[340px] lg:max-w-lg lg:justify-center lg:gap-5 lg:px-10 lg:py-14">
            <p className="eyebrow text-primary">{storeConfig.tagline}</p>

            <h1 className="font-serif text-xl leading-[1.3] text-balance sm:text-3xl sm:leading-[1.25] lg:text-5xl">
              Beleza selecionada, do jeito que combina com você
            </h1>

            <p className="hidden max-w-md text-sm leading-relaxed text-muted-foreground sm:block">
              {storeConfig.description}
            </p>

            <LinkButton
              href="/categorias"
              variant="outline"
              className="group relative mt-0.5 h-9 gap-2 overflow-hidden rounded-full border-foreground/20 bg-background/60 px-4 text-[0.65rem] tracking-[0.14em] uppercase transition-colors duration-500 hover:border-primary hover:text-primary-foreground sm:mt-0 sm:h-10 sm:px-5 sm:text-xs"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 z-0 w-0 bg-primary transition-[width] duration-500 ease-out group-hover:w-full"
              />
              <span className="relative z-10">Explorar catálogo</span>
              <ArrowRight
                className="relative z-10 size-3.5 transition-transform duration-500 ease-out group-hover:translate-x-1"
                aria-hidden="true"
              />
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="container-boutique flex flex-col gap-7">
        <SectionHeading
          eyebrow="Navegue"
          title="Categorias"
          description="Do preparo da pele ao toque final do perfume."
          href="/categorias"
        />

        <CategoryCarousel
          categories={activeCategories}
          counts={categoryCounts}
        />
      </section>

      {/* Destaques */}
      <section className="container-boutique flex flex-col gap-6 sm:gap-8">
        <SectionHeading
          eyebrow="Seleção da Cris"
          title="Destaques da semana"
          description="Os favoritos que estão saindo da prateleira."
        />

        <ProductGrid products={highlights} />
      </section>

      {/* Mais vendidos */}
      <section className="container-boutique flex flex-col gap-6 sm:gap-8">
        <SectionHeading
          eyebrow="Preferidos"
          title="Mais vendidos"
          description="Aprovados por quem já comprou."
        />

        <ProductGrid products={topSellers} />
      </section>

      {/* Presentes & Kits */}
      <section className="container-boutique flex flex-col gap-6 sm:gap-8">
        <SectionHeading
          eyebrow="Para presentear"
          title="Presentes & Kits"
          description="Kits completos, bolsas, ursos e escolhas especiais para surpreender."
        />

        <ProductGrid products={gifts} />
      </section>

      {/* Novidades */}
      <section className="container-boutique">
        <div className="rounded-3xl bg-blush/45 px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-10">
          <div className="flex flex-col gap-6 sm:gap-8">
            <SectionHeading
              eyebrow="Chegou agora"
              title="Novidades"
              description="Últimos lançamentos que entraram no catálogo."
            />

            <ProductGrid products={latest} />
          </div>
        </div>
      </section>
    </div>
  );
}
