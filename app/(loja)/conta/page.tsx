import type { Metadata } from 'next'
import Link from 'next/link'
import { AtSign, ChevronRight, Clock, Heart, MapPin, MessageCircle, ShoppingBag } from 'lucide-react'
import { BrandLogo } from '@/components/brand-logo'
import { storeConfig } from '@/lib/store-config'
import { buildWhatsAppUrl } from '@/lib/whatsapp'

export const metadata: Metadata = {
  title: 'Conta',
  description: `Atendimento, horários e contato da ${storeConfig.name}.`,
}

const shortcuts = [
  { href: '/favoritos', label: 'Meus favoritos', icon: Heart },
  { href: '/sacola', label: 'Minha sacola', icon: ShoppingBag },
  { href: '/categorias', label: 'Explorar catálogo', icon: ChevronRight },
]

export default function ContaPage() {
  const contactUrl = buildWhatsAppUrl(
    `Olá! Vim pelo catálogo da ${storeConfig.name} e gostaria de atendimento.`,
  )

  return (
    <div className="container-boutique flex flex-col gap-10 py-10 lg:py-14">
      <header className="flex flex-col items-start gap-4 rounded-3xl bg-secondary p-7">
        <BrandLogo size="md" />
        <p className="max-w-prose text-sm leading-relaxed text-secondary-foreground/80">
          {storeConfig.description}
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow text-muted-foreground">Atalhos</h2>
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon
            return (
              <li key={shortcut.href}>
                <Link
                  href={shortcut.href}
                  className="flex items-center gap-3 py-4 text-sm transition-colors hover:text-primary"
                >
                  <Icon className="size-4 text-primary" strokeWidth={1.6} aria-hidden="true" />
                  <span className="flex-1">{shortcut.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="eyebrow text-muted-foreground">Atendimento</h2>
        <dl className="flex flex-col gap-4 text-sm">
          <div className="flex items-start gap-3">
            <MessageCircle
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <dt className="text-muted-foreground">WhatsApp</dt>
              <dd>
                <a
                  href={contactUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {storeConfig.whatsappDisplay}
                </a>
              </dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <AtSign
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <dt className="text-muted-foreground">Instagram</dt>
              <dd>{storeConfig.instagram}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <dt className="text-muted-foreground">Horário</dt>
              <dd>{storeConfig.hours}</dd>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin
              className="mt-0.5 size-4 shrink-0 text-primary"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <div className="flex flex-col">
              <dt className="text-muted-foreground">Localização</dt>
              <dd>{storeConfig.city}</dd>
            </div>
          </div>
        </dl>
      </section>
    </div>
  )
}
