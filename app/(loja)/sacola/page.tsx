'use client'

import Link from 'next/link'
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { useStore } from '@/components/store-provider'
import { getCartTotal, getLineTotal } from '@/lib/pricing'
import { formatCurrency } from '@/lib/format'
import { storeConfig } from '@/lib/store-config'

export default function SacolaPage() {
  const { items, subtotal, bagCount, updateQuantity, removeItem, clearBag } = useStore()

  const creditTotal = getCartTotal(items, 'Cartão de crédito')

  if (items.length === 0) {
    return (
      <div className="container-boutique flex flex-col gap-8 py-10 lg:py-14">
        <header className="flex flex-col gap-2">
          <p className="eyebrow text-primary">Seu pedido</p>
          <h1 className="font-serif text-3xl leading-tight lg:text-4xl">Sacola</h1>
        </header>

        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border py-20 text-center">
          <ShoppingBag className="size-8 text-primary" strokeWidth={1.5} aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-serif text-xl">Sua sacola está vazia</p>
            <p className="text-sm text-muted-foreground">
              Adicione produtos e finalize o pedido pelo WhatsApp.
            </p>
          </div>
          <LinkButton href="/categorias" className="mt-2 h-11 rounded-full px-7">
            Ver produtos
          </LinkButton>
        </div>
      </div>
    )
  }

  return (
    <div className="container-boutique flex flex-col gap-8 py-10 lg:py-14">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="eyebrow text-primary">Seu pedido</p>
          <h1 className="font-serif text-3xl leading-tight lg:text-4xl">Sacola</h1>
          <p className="text-sm text-muted-foreground">
            {bagCount} {bagCount === 1 ? 'item' : 'itens'} selecionados
          </p>
        </div>

        <button
          type="button"
          onClick={clearBag}
          className="text-xs tracking-wide text-muted-foreground underline underline-offset-4 hover:text-destructive"
        >
          Limpar sacola
        </button>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-14">
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {items.map((item) => {
            const key = `${item.product.id}-${item.variation ?? ''}`
            return (
              <li key={key} className="flex gap-4 py-5">
                <Link
                  href={`/produto/${item.product.slug}`}
                  className="shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  <img
                    src={item.product.image || '/placeholder.svg'}
                    alt={item.product.name}
                    className="size-24 object-cover sm:size-28"
                  />
                </Link>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="eyebrow text-muted-foreground">{item.product.brand}</p>
                      <h2 className="text-sm leading-snug font-medium text-pretty">
                        <Link href={`/produto/${item.product.slug}`} className="hover:text-primary">
                          {item.product.name}
                        </Link>
                      </h2>
                      {item.variation && (
                        <p className="text-xs text-muted-foreground">{item.variation}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.product.id, item.variation)}
                      aria-label={`Remover ${item.product.name} da sacola`}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-full border border-border">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity - 1, item.variation)
                        }
                        aria-label="Diminuir quantidade"
                        className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                      >
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.product.id, item.quantity + 1, item.variation)
                        }
                        aria-label="Aumentar quantidade"
                        className="flex size-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    <span className="font-serif text-lg text-primary">
                      {formatCurrency(getLineTotal(item, 'PIX'))}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="flex flex-col gap-5 rounded-3xl bg-secondary p-6">
            <h2 className="font-serif text-xl">Resumo</h2>

            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-secondary-foreground/75">Subtotal no PIX, débito ou dinheiro</dt>
                <dd className="shrink-0 font-medium">{formatCurrency(subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-secondary-foreground/75">Total no crédito</dt>
                <dd className="shrink-0 font-medium">{formatCurrency(creditTotal)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-secondary-foreground/75">Entrega</dt>
                <dd className="text-secondary-foreground/75">
                  {storeConfig.deliveryFee === null
                    ? 'Combinada no pedido'
                    : formatCurrency(storeConfig.deliveryFee)}
                </dd>
              </div>
            </dl>

            <div className="flex items-baseline justify-between gap-4 border-t border-foreground/10 pt-4">
              <span className="eyebrow text-secondary-foreground/75">Total no PIX, débito ou dinheiro</span>
              <span className="shrink-0 font-serif text-3xl text-primary">{formatCurrency(subtotal)}</span>
            </div>

            <LinkButton href="/checkout" size="lg" className="h-13 gap-2 rounded-full">
              Finalizar pedido
              <ArrowRight className="size-4" aria-hidden="true" />
            </LinkButton>

            <p className="text-center text-xs leading-relaxed text-secondary-foreground/70">
              O pedido é enviado para o WhatsApp da loja para confirmação de pagamento e entrega.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
