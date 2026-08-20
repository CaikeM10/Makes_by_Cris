import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { FavoriteButton } from '@/components/favorite-button'
import { ProductGrid } from '@/components/product-grid'
import { ProductPurchase } from '@/components/product-purchase'
import { SectionHeading } from '@/components/section-heading'
import { getCategoryName } from '@/lib/data/categories'
import { getProductBySlug, getProductsByCategory, products } from '@/lib/data/products'
import { formatCurrency } from '@/lib/format'

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = getProductBySlug(slug)
  if (!product) return { title: 'Produto não encontrado' }

  return {
    title: product.name,
    description: product.shortDescription,
    openGraph: { images: [product.image] },
  }
}

export default async function ProdutoPage({ params }: PageProps) {
  const { slug } = await params
  const product = getProductBySlug(slug)

  if (!product || !product.active) notFound()

  const categoryName = getCategoryName(product.category)
  const related = getProductsByCategory(product.category)
    .filter((item) => item.id !== product.id)
    .slice(0, 4)

  return (
    <div className="flex flex-col gap-16 pb-16 lg:gap-24 lg:pb-24">
      <div className="container-boutique pt-6 lg:pt-10">
        <nav aria-label="Você está aqui" className="flex flex-wrap items-center gap-1 text-xs">
          <Link href="/" className="text-muted-foreground hover:text-primary">
            Início
          </Link>
          <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
          <Link
            href={`/categoria/${product.category}`}
            className="text-muted-foreground hover:text-primary"
          >
            {categoryName}
          </Link>
          <ChevronRight className="size-3 text-muted-foreground" aria-hidden="true" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative overflow-hidden rounded-3xl bg-muted">
            <img
              src={product.image || '/placeholder.svg'}
              alt={product.name}
              className="aspect-square w-full object-cover"
            />
            <FavoriteButton
              productId={product.id}
              productName={product.name}
              className="absolute top-4 right-4"
            />
            {!product.available && (
              <span className="absolute bottom-4 left-4 rounded-full bg-background/95 px-4 py-1.5 text-[0.6875rem] font-medium tracking-wide uppercase text-muted-foreground">
                Esgotado
              </span>
            )}
          </div>

          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-3">
              <p className="eyebrow text-primary">{product.brand}</p>
              <h1 className="font-serif text-3xl leading-tight text-balance lg:text-4xl">
                {product.name}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {product.shortDescription}
              </p>
              <p className="font-serif text-4xl text-primary">{formatCurrency(product.price)}</p>
            </div>

            <ProductPurchase product={product} />

            <div className="flex flex-col gap-3 border-t border-border pt-7">
              <h2 className="eyebrow text-muted-foreground">Sobre o produto</h2>
              <p className="text-sm leading-relaxed text-foreground/85">{product.description}</p>
            </div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="container-boutique flex flex-col gap-8">
          <SectionHeading
            eyebrow="Combina com"
            title={`Mais de ${categoryName}`}
            href={`/categoria/${product.category}`}
          />
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  )
}
