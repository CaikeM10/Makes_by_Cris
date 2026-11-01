import { HomeHero } from "@/components/home-hero";
import { getHomeCampaign } from "@/lib/campaigns/public-server";

import { CategoryCarousel } from "@/components/category-carousel";
import { ProductGrid } from "@/components/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { getHomeCatalog } from "@/lib/catalog/home-server";

export default async function HomePage() {
  const [catalog, campaign] = await Promise.all([getHomeCatalog(), getHomeCampaign()]);
  const { categories, counts: categoryCounts, highlights, preferred, gifts, latest } = catalog;

  return (
    <div className="flex flex-col gap-11 pb-14 sm:gap-14 lg:gap-20 lg:pb-24">
      <HomeHero campaign={campaign} />

      {/* Categorias */}
      <section className="container-boutique flex flex-col gap-7">
        <SectionHeading
          eyebrow="Navegue"
          title="Categorias"
          description="Do preparo da pele ao toque final do perfume."
          href="/categorias"
        />

        <CategoryCarousel
          categories={categories}
          counts={categoryCounts}
        />
      </section>

      {/* Destaques */}
      <section className="container-boutique flex flex-col gap-6 sm:gap-8">
        <SectionHeading
          eyebrow="Seleção da Cris"
          title="Destaques da semana"
          description="Uma seleção especial para descobrir nesta semana."
        />

        <ProductGrid products={highlights} />
      </section>

      {/* Mais vendidos */}
      <section className="container-boutique flex flex-col gap-6 sm:gap-8">
        <SectionHeading
          eyebrow="Preferidos"
          title="Preferidos"
          description="Escolhas para conhecer e encontrar o seu favorito."
        />

        <ProductGrid products={preferred} />
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
