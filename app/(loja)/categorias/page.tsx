import type { Metadata } from 'next'
import { CategoryCard } from '@/components/category-card'
import { getPublicCatalog } from '@/lib/catalog/public-server'

export const metadata: Metadata = {
  title: 'Categorias',
  description: 'Explore maquiagem, perfumes, cabelos, skincare, corpo e banho e acessórios.',
}

export default async function CategoriasPage() {
  const { categories, getProductsByCategory } = await getPublicCatalog()
  const activeCategories = categories.filter((category) => category.active)

  return (
    <div className="container-boutique flex flex-col gap-8 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-primary">Catálogo</p>
        <h1 className="font-serif text-3xl leading-tight text-balance lg:text-4xl">Categorias</h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Escolha um universo e descubra os produtos selecionados para cada etapa da sua rotina.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {activeCategories.map((category) => (
          <div key={category.id} className="flex flex-col gap-3">
            <CategoryCard
              category={category}
              count={getProductsByCategory(category.slug).length}
              className="aspect-[3/4]"
            />
            <p className="px-1 text-xs leading-relaxed text-muted-foreground">
              {category.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
