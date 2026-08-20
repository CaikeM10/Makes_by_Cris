import { ProductCard } from '@/components/product-card'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

type ProductGridProps = {
  products: Product[]
  emptyMessage?: string
  className?: string
}

export function ProductGrid({
  products,
  emptyMessage = 'Nenhum produto disponível nesta categoria.',
  className,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-16 text-center">
        <p className="font-serif text-xl">{emptyMessage}</p>
        <p className="text-sm text-muted-foreground">Volte em breve para conferir as novidades.</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
