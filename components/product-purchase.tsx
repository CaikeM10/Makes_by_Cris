'use client'

import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { AddToBagButton } from '@/components/add-to-bag-button'
import { AnchorButton } from '@/components/link-button'
import { formatCurrency } from '@/lib/format'
import { storeConfig } from '@/lib/store-config'
import { buildWhatsAppUrl } from '@/lib/whatsapp'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

export function ProductPurchase({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1)
  const [variation, setVariation] = useState<string | undefined>(product.variations?.[0])

  const total = product.price * quantity
  const questionUrl = buildWhatsAppUrl(
    `Olá! Gostaria de saber mais sobre o produto *${product.name}*${
      variation ? ` (${variation})` : ''
    }.`,
    storeConfig.whatsapp,
  )

  return (
    <div className="flex flex-col gap-6">
      {product.variations && product.variations.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="eyebrow text-muted-foreground">Escolha a opção</legend>
          <div className="flex flex-wrap gap-2">
            {product.variations.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setVariation(option)}
                aria-pressed={variation === option}
                className={cn(
                  'rounded-full border px-4 py-2 text-xs transition-colors',
                  variation === option
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-foreground hover:border-foreground/30',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-3">
        <p className="eyebrow text-muted-foreground">Quantidade</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-full border border-border">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              disabled={quantity <= 1}
              aria-label="Diminuir quantidade"
              className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary disabled:opacity-35"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span aria-live="polite" className="w-10 text-center text-sm font-medium">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(99, value + 1))}
              disabled={quantity >= 99}
              aria-label="Aumentar quantidade"
              className="flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary disabled:opacity-35"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Total <span className="font-serif text-lg text-foreground">{formatCurrency(total)}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <AddToBagButton
          product={product}
          quantity={quantity}
          variation={variation}
          className="w-full"
        />
        <AnchorButton
          href={questionUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outline"
          size="lg"
          className="h-13 w-full rounded-full border-foreground/15 text-sm"
        >
          Tirar dúvida no WhatsApp
        </AnchorButton>
      </div>
    </div>
  )
}
