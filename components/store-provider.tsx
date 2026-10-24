'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { CartItem, Product } from '@/lib/types'
import { getCartTotal } from '@/lib/pricing'
import { useCatalog } from '@/components/catalog-provider'
import { parseStoredBag, parseStoredFavorites, resolveStoredBag, type StoredLine } from '@/lib/catalog/stored-selection'

/**
 * A sacola e os favoritos são estado de interface do visitante: não existe cadastro,
 * e o pedido é fechado pelo WhatsApp. Guardamos no navegador apenas para que a sacola
 * sobreviva a um recarregamento da página.
 */
const BAG_KEY = 'makes:sacola'
const FAVORITES_KEY = 'makes:favoritos'
const memoryStorageFallback = new Map<string, string>()


/**
 * O armazenamento pode falhar em navegação privada, webviews e contextos com
 * quota/políticas restritivas. Mantemos uma cópia em memória para a sessão não
 * interromper caso isso aconteça.
 */
function getStoredValue(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key)
    if (value !== null) return value
  } catch {
    // Usa o valor em memória quando localStorage não puder ser acessado.
  }

  return memoryStorageFallback.get(key) ?? null
}

function setStoredValue(key: string, value: string) {
  memoryStorageFallback.set(key, value)

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // O fallback em memória mantém sacola e favoritos disponíveis nesta sessão.
  }
}


type StoreContextValue = {
  items: CartItem[]
  favorites: string[]
  bagCount: number
  subtotal: number
  /** timestamp do último item adicionado — usado para o feedback visual da sacola */
  lastAdded: number | null
  addItem: (product: Product, quantity?: number, variation?: string) => void
  removeItem: (productId: string, variation?: string) => void
  updateQuantity: (productId: string, quantity: number, variation?: string) => void
  clearBag: () => void
  toggleFavorite: (productId: string) => void
  isFavorite: (productId: string) => boolean
}

const StoreContext = createContext<StoreContextValue | null>(null)

const sameLine = (item: StoredLine, productId: string, variation?: string) =>
  item.productId === productId && (item.variation ?? '') === (variation ?? '')

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { products } = useCatalog()
  const [lines, setLines] = useState<StoredLine[]>([])
  const items = useMemo(() => resolveStoredBag(lines, products), [lines, products])
  const [favorites, setFavorites] = useState<string[]>([])
  const [lastAdded, setLastAdded] = useState<number | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Restaura depois da hidratação para o HTML do servidor e do cliente combinarem.
  useEffect(() => {
    setLines(parseStoredBag(getStoredValue(BAG_KEY)))
    setFavorites(parseStoredFavorites(getStoredValue(FAVORITES_KEY)))
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    setStoredValue(BAG_KEY, JSON.stringify(lines))
  }, [lines, hydrated])

  useEffect(() => {
    if (!hydrated) return
    setStoredValue(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites, hydrated])

  const addItem = useCallback((product: Product, quantity = 1, variation?: string) => {
    setLines((current) => {
      const existing = current.find((item) => sameLine(item, product.id, variation))
      if (existing) {
        return current.map((item) =>
          sameLine(item, product.id, variation)
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        )
      }
      return [...current, { productId: product.id, quantity, variation }]
    })
    setLastAdded(Date.now())
  }, [])

  const removeItem = useCallback((productId: string, variation?: string) => {
    setLines((current) => current.filter((item) => !sameLine(item, productId, variation)))
  }, [])

  const updateQuantity = useCallback((productId: string, quantity: number, variation?: string) => {
    setLines((current) =>
      current.flatMap((item) => {
        if (!sameLine(item, productId, variation)) return [item]
        if (quantity < 1) return []
        return [{ ...item, quantity: Math.min(quantity, 99) }]
      }),
    )
  }, [])

  const clearBag = useCallback(() => setLines([]), [])

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }, [])

  const value = useMemo<StoreContextValue>(() => {
    const bagCount = items.reduce((total, item) => total + item.quantity, 0)
    const subtotal = getCartTotal(items, 'PIX')

    return {
      items,
      favorites,
      bagCount,
      subtotal,
      lastAdded,
      addItem,
      removeItem,
      updateQuantity,
      clearBag,
      toggleFavorite,
      isFavorite: (productId: string) => favorites.includes(productId),
    }
  }, [items, favorites, lastAdded, addItem, removeItem, updateQuantity, clearBag, toggleFavorite])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore precisa estar dentro de StoreProvider')
  }
  return context
}
