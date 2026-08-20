'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CategoryCard } from '@/components/category-card'
import type { Category } from '@/lib/types'
import { cn } from '@/lib/utils'

type CategoryCarouselProps = {
  categories: Category[]
  counts: Record<string, number>
  /** Destino do atalho final, exibido só no mobile (no desktop o "Ver tudo" fica no título). */
  allHref?: string
}

export function CategoryCarousel({ categories, counts, allHref = '/categorias' }: CategoryCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [scrollable, setScrollable] = useState(false)

  const syncScroll = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const max = track.scrollWidth - track.clientWidth
    setScrollable(max > 8)
    setProgress(max > 8 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    syncScroll()
    track.addEventListener('scroll', syncScroll, { passive: true })

    if (typeof ResizeObserver === 'undefined') {
      return () => track.removeEventListener('scroll', syncScroll)
    }

    const observer = new ResizeObserver(syncScroll)
    observer.observe(track)

    return () => {
      track.removeEventListener('scroll', syncScroll)
      observer.disconnect()
    }
  }, [syncScroll])

  return (
    <div className="flex flex-col gap-3.5">
      <div className="relative">
        {/* Esfumaçado à direita: pista visual de que há mais categorias na horizontal. */}
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 lg:hidden',
            scrollable && progress < 0.98 ? 'opacity-100' : 'opacity-0',
          )}
        />

        <div
          ref={trackRef}
          className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              count={counts[category.slug]}
              className="w-[6.75rem] shrink-0 snap-start sm:w-[9.5rem] md:w-[11.5rem] lg:w-auto"
            />
          ))}

          {/* Fecha a fita no mobile, onde o "Ver tudo" do título fica oculto. */}
          <Link
            href={allHref}
            className="flex aspect-[4/5] w-[6.75rem] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/40 px-2 text-center transition-colors hover:border-primary/40 hover:bg-secondary sm:hidden"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-background text-primary">
              <ArrowRight className="size-4" aria-hidden="true" />
            </span>
            <span className="text-[0.6875rem] leading-tight text-muted-foreground">
              Ver todas as categorias
            </span>
          </Link>
        </div>
      </div>

      {/* Barra de progresso discreta, só quando existe rolagem real. */}
      {scrollable && (
        <div
          aria-hidden="true"
          className="h-px w-16 overflow-hidden rounded-full bg-border lg:hidden"
        >
          <div
            className="h-full w-1/2 rounded-full bg-primary transition-transform duration-200 ease-out"
            style={{ transform: `translateX(${progress * 100}%)` }}
          />
        </div>
      )}
    </div>
  )
}
