import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ProductBrowser } from '@/components/product-browser'
import { categories, getCategoryBySlug } from '@/lib/data/categories'
import { getProductsByCategory } from '@/lib/data/products'

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return categories.map((category) => ({ slug: category.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const category = getCategoryBySlug(slug)
  if (!category) return { title: 'Categoria não encontrada' }

  return { title: category.name, description: category.description }
}

export default async function CategoriaPage({ params }: PageProps) {
  const { slug } = await params
  const category = getCategoryBySlug(slug)

  if (!category || !category.active) notFound()

  const products = getProductsByCategory(category.slug)

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden bg-muted">
        <img
          src={category.image || '/placeholder.svg'}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/20"
        />

        <div className="container-boutique relative flex flex-col gap-3 py-12 lg:py-16">
          <nav aria-label="Você está aqui" className="flex items-center gap-1 text-xs">
            <Link href="/" className="text-muted-foreground hover:text-primary">
              Início
            </Link>
            <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
            <Link href="/categorias" className="text-muted-foreground hover:text-primary">
              Categorias
            </Link>
            <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
            <span className="text-foreground">{category.name}</span>
          </nav>

          <h1 className="font-serif text-3xl leading-tight text-balance lg:text-5xl">
            {category.name}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            {category.description}
          </p>
          <p className="eyebrow text-primary">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
          </p>
        </div>
      </div>

      <div className="container-boutique py-8 lg:py-12">
        <ProductBrowser products={products} />
      </div>
    </div>
  )
}
