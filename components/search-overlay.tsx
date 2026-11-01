'use client'

import { useDeferredValue, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Search, SearchX, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useCatalog } from '@/components/catalog-provider'
import { formatCurrency, normalizeText } from '@/lib/format'
import { SEARCH_PAGE_SIZE } from '@/lib/catalog/search-catalog'
import { SafeImage } from '@/components/safe-image'
import { resolveProductImage } from '@/lib/catalog/product-image'


type SearchOverlayProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocus?: RefObject<HTMLElement | null>
}

/** Destaca a primeira palavra buscada dentro do nome, quando ela aparece literalmente. */
function HighlightedName({ name, term }: { name: string; term: string }) {
  const word = term.trim().split(/\s+/)[0] ?? ''
  const index = word ? normalizeText(name).indexOf(normalizeText(word)) : -1

  // Só destaca quando os índices batem com o texto original (sem acento no meio).
  if (index < 0 || normalizeText(name).length !== name.length) {
    return <>{name}</>
  }

  return (
    <>
      {name.slice(0, index)}
      <mark className="bg-primary/15 text-foreground">{name.slice(index, index + word.length)}</mark>
      {name.slice(index + word.length)}
    </>
  )
}

export function SearchOverlay({ open, onOpenChange, returnFocus }: SearchOverlayProps) {
  const { search: { searchProducts, categories, counts, suggestions, getCategoryName, searchCategories } } = useCatalog()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(SEARCH_PAGE_SIZE)

  useEffect(() => { setVisibleCount(SEARCH_PAGE_SIZE) }, [query])
  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    const syncViewport = () => {
      panelRef.current?.style.setProperty('--search-viewport-height', `${viewport?.height || window.innerHeight}px`)
      panelRef.current?.style.setProperty('--search-viewport-top', `${viewport?.offsetTop || 0}px`)
    }
    syncViewport()
    viewport?.addEventListener('resize', syncViewport)
    viewport?.addEventListener('scroll', syncViewport)
    window.addEventListener('resize', syncViewport)
    return () => {
      viewport?.removeEventListener('resize', syncViewport)
      viewport?.removeEventListener('scroll', syncViewport)
      window.removeEventListener('resize', syncViewport)
    }
  }, [open])

  // useDeferredValue mantém a digitação fluida sem atrasar o resultado artificialmente.
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const results = useMemo(() => searchProducts(deferredQuery), [deferredQuery, searchProducts])
  const matchedCategories = useMemo(() => searchCategories(deferredQuery), [deferredQuery, searchCategories])

  const hasQuery = query.trim().length > 0
  const isSearching = query !== deferredQuery
  const isEmpty = hasQuery && !isSearching && results.length === 0 && matchedCategories.length === 0

  function clearQuery() {
    setQuery('')
    inputRef.current?.focus()
  }

  function applySuggestion(term: string) {
    setQuery(term)
    inputRef.current?.focus()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={panelRef}
        initialFocus={inputRef}
        finalFocus={returnFocus}
        showCloseButton={false}
        className="top-[var(--search-viewport-top,0px)] flex h-[var(--search-viewport-height,100dvh)] max-h-[var(--search-viewport-height,100dvh)] max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 p-0 sm:top-[calc(var(--search-viewport-top,0px)+3rem)] sm:h-auto sm:max-h-[min(80dvh,var(--search-viewport-height,100dvh))] sm:max-w-2xl sm:rounded-2xl sm:border"
      >
        <DialogTitle className="sr-only">Buscar produtos</DialogTitle>

        <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
          <Search className="size-4 shrink-0 text-muted-foreground sm:size-5" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar produto ou categoria"
            aria-label="Buscar produtos"
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          />
          {hasQuery && (
            <button
              type="button"
              onClick={clearQuery}
              aria-label="Limpar busca"
              className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar busca"
            className="min-h-11 shrink-0 rounded-full px-2 py-1 text-xs tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:bg-secondary hover:text-foreground"
          >
            Fechar
          </button>
        </div>

        <div data-search-scroll aria-busy={isSearching}
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-5">
          {!hasQuery && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <p className="eyebrow text-muted-foreground">Sugestões</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => applySuggestion(term)}
                      className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <p className="eyebrow text-muted-foreground">Categorias</p>
                <div className="flex flex-col">
                  {categories.map((category) => (
                    <Link
                      key={category.id}
                      prefetch={false}
                      href={`/categoria/${category.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-secondary"
                    >
                      <SafeImage
                        src={category.image || '/placeholder.svg'}
                        fallbackSources={category.imageFallbacks}
                        alt=""
                        className="size-9 shrink-0 rounded-lg object-cover"
                      />
                      <span className="flex min-w-0 flex-col"><span className="text-sm font-medium">{category.name}</span><span className="text-xs text-muted-foreground">{counts[category.slug]} {counts[category.slug] === 1 ? 'produto' : 'produtos'}</span></span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isEmpty && (
            <div role="status" className="flex flex-col items-center gap-4 px-4 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-border bg-card">
                <SearchX className="size-5 text-primary" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1.5">
                <p className="font-serif text-xl leading-snug [overflow-wrap:anywhere]">Nenhum produto encontrado para &ldquo;{query.trim()}&rdquo;</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tente outro termo ou navegue pelas categorias.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                {suggestions.slice(0, 3).map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => applySuggestion(term)}
                    className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs transition-colors hover:border-primary/40 hover:bg-secondary"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasQuery && !isEmpty && (
            <div className="flex flex-col gap-5">
              {matchedCategories.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="eyebrow text-muted-foreground">Categorias</p>
                  <div className="flex flex-wrap gap-2">
                    {matchedCategories.map((category) => (
                      <Link
                        key={category.id}
                        prefetch={false}
                        href={`/categoria/${category.slug}`}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-secondary"
                      >
                        {category.name}
                        <ArrowUpRight className="size-3.5 text-primary" aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <p className="sr-only" role="status" aria-live="polite">{isSearching ? 'Buscando…' : `${results.length} produtos encontrados.`}</p>
              {results.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="eyebrow text-muted-foreground">
                    {results.length} {results.length === 1 ? 'produto' : 'produtos'}
                  </p>
                  <div className="flex flex-col">
                    {results.slice(0, visibleCount).map((product) => (
                      <Link
                        key={product.id}
                        prefetch={false}
                        href={`/produto/${product.slug}`}
                        onClick={() => onOpenChange(false)}
                        className="flex items-center gap-3 rounded-xl px-1.5 py-2 transition-colors hover:bg-secondary"
                      >
                        <SafeImage
                          src={resolveProductImage(product.image) || '/placeholder.svg'}
                          alt=""
                          className="size-12 shrink-0 rounded-lg bg-muted object-cover"
                        />
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate text-sm leading-snug font-medium">
                            <HighlightedName name={product.name} term={deferredQuery} />
                          </span>
                          {product.shortDescription && <span className="truncate text-xs text-muted-foreground">
                            {product.shortDescription}
                          </span>}
                          <span className="flex flex-wrap items-center gap-1.5 text-[0.7rem] text-muted-foreground">
                            <span className="tracking-[0.1em] uppercase">
                              {getCategoryName(product.category)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-primary">
                              {formatCurrency(product.price)}
                            </span>
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  {results.length > visibleCount && <button type="button" onClick={() => setVisibleCount(count => count + SEARCH_PAGE_SIZE)} className="min-h-11 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Mostrar mais resultados ({results.length - visibleCount})</button>}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
