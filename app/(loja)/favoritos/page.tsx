'use client'

import { Heart } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { ProductGrid } from '@/components/product-grid'
import { useStore } from '@/components/store-provider'
import { useCatalog } from '@/components/catalog-provider'

export default function FavoritosPage() {
  const { products } = useCatalog()
  const { favorites } = useStore()
  const list = products.filter((product) => favorites.includes(product.id))

  return (
    <div className="container-boutique flex flex-col gap-8 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <p className="eyebrow text-primary">Sua lista</p>
        <h1 className="font-serif text-3xl leading-tight lg:text-4xl">Favoritos</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {list.length > 0
            ? `${list.length} ${list.length === 1 ? 'produto salvo' : 'produtos salvos'} para decidir com calma.`
            : 'Toque no coração dos produtos para guardá-los aqui.'}
        </p>
      </header>

      {list.length > 0 ? (
        <ProductGrid products={list} />
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center">
          <Heart className="size-8 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-serif text-xl">Nenhum favorito ainda</p>
            <p className="text-sm text-muted-foreground">
              Explore o catálogo e salve o que mais gostar.
            </p>
          </div>
          <LinkButton href="/categorias" className="mt-2 h-11 rounded-full px-7">
            Explorar catálogo
          </LinkButton>
        </div>
      )}
    </div>
  )
}
