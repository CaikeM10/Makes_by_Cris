import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

type CategoryCardProps = {
  category: Category
  count?: number
  className?: string
}

export function CategoryCard({ category, count, className }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${category.slug}`}
      className={cn(
        'group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl bg-muted',
        className,
      )}
    >
      <img
        src={category.image || '/placeholder.svg'}
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/15 to-transparent"
      />

      <div className="relative flex items-end justify-between gap-2 p-3 sm:gap-3 sm:p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="font-serif text-sm leading-tight text-background sm:text-lg">
            {category.name}
          </h3>
          {typeof count === 'number' && (
            <p className="text-[0.625rem] tracking-wide text-background/75 sm:text-[0.6875rem]">
              {count} {count === 1 ? 'produto' : 'produtos'}
            </p>
          )}
        </div>
        {/* Em cards estreitos o selo competiria com o nome, então só aparece a partir de sm. */}
        <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-background/95 text-foreground transition-transform group-hover:-translate-y-0.5 sm:flex">
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </span>
      </div>
    </Link>
  )
}
