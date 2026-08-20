'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { ProductGrid } from '@/components/product-grid'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Product } from '@/lib/types'
import { normalizeText } from '@/lib/format'
import { cn } from '@/lib/utils'

type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco' | 'nome'

const sortLabels: Record<SortOption, string> = {
  relevancia: 'Relevância',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  nome: 'Nome (A-Z)',
}

export function ProductBrowser({ products }: { products: Product[] }) {
  const [sort, setSort] = useState<SortOption>('relevancia')
  const [onlyAvailable, setOnlyAvailable] = useState(false)

  const brands = useMemo(
    () => Array.from(new Set(products.map((product) => product.brand))).sort(),
    [products],
  )
  const [brand, setBrand] = useState<string>('todas')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const visible = useMemo(() => {
    let list = [...products]

    const term = normalizeText(deferredQuery)
    if (term) {
      const words = term.split(/\s+/)
      list = list.filter((product) => {
        const haystack = normalizeText(
          `${product.name} ${product.brand} ${product.shortDescription} ${product.keywords.join(' ')}`,
        )
        return words.every((word) => haystack.includes(word))
      })
    }

    if (onlyAvailable) list = list.filter((product) => product.available)
    if (brand !== 'todas') list = list.filter((product) => product.brand === brand)

    switch (sort) {
      case 'menor-preco':
        return list.sort((a, b) => a.price - b.price)
      case 'maior-preco':
        return list.sort((a, b) => b.price - a.price)
      case 'nome':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      default:
        return list.sort(
          (a, b) => Number(b.featured) - Number(a.featured) || Number(b.bestSeller) - Number(a.bestSeller),
        )
    }
  }, [products, sort, brand, onlyAvailable, deferredQuery])

  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar nesta categoria"
          aria-label="Buscar nesta categoria"
          className="h-11 w-full rounded-full border border-border bg-card pr-10 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-3">
        <p className="text-xs tracking-wide text-muted-foreground">
          {visible.length} {visible.length === 1 ? 'produto' : 'produtos'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyAvailable((value) => !value)}
            aria-pressed={onlyAvailable}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
              onlyAvailable
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-foreground/25',
            )}
          >
            Só disponíveis
          </button>

          {brands.length > 1 && (
            <Select value={brand} onValueChange={(value) => setBrand(value ?? 'todas')}>
              <SelectTrigger
                aria-label="Filtrar por marca"
                className="h-9 w-auto min-w-32 rounded-full border-border text-xs"
              >
                <SelectValue>
                  {(value) => (value === 'todas' ? 'Todas as marcas' : String(value))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as marcas</SelectItem>
                {brands.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
            <SelectTrigger
              aria-label="Ordenar produtos"
              className="h-9 w-auto min-w-32 rounded-full border-border text-xs"
            >
              <SelectValue>{(value) => sortLabels[value as SortOption]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(sortLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ProductGrid
        products={visible}
        emptyMessage="Nenhum produto encontrado com esses filtros."
      />
    </div>
  )
}
