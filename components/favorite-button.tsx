'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useStore } from '@/components/store-provider'
import { cn } from '@/lib/utils'

type FavoriteButtonProps = {
  productId: string
  productName: string
  className?: string
  size?: 'sm' | 'md'
}

export function FavoriteButton({
  productId,
  productName,
  className,
  size = 'sm',
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useStore()
  const [popping, setPopping] = useState(false)
  const active = isFavorite(productId)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggleFavorite(productId)
        if (!active) {
          setPopping(true)
          setTimeout(() => setPopping(false), 420)
        }
      }}
      aria-label={
        active ? `Remover ${productName} dos favoritos` : `Adicionar ${productName} aos favoritos`
      }
      aria-pressed={active}
      className={cn(
        'flex items-center justify-center rounded-full border border-border/80 bg-background/90 text-foreground/70 backdrop-blur-sm transition-colors hover:text-primary',
        size === 'sm' ? 'size-9' : 'size-11',
        active && 'border-primary/30 text-primary',
        className,
      )}
    >
      <Heart
        className={cn(
          size === 'sm' ? 'size-4' : 'size-5',
          popping && 'animate-heart-pop',
          active && 'fill-current',
        )}
        aria-hidden="true"
      />
    </button>
  )
}
