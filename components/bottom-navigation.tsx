'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Heart, House, LayoutGrid, ShoppingBag, User } from 'lucide-react'
import { useStore } from '@/components/store-provider'
import { cn } from '@/lib/utils'

const items = [
  { href: '/', label: 'Início', icon: House },
  { href: '/categorias', label: 'Categorias', icon: LayoutGrid },
  { href: '/favoritos', label: 'Favoritos', icon: Heart },
  { href: '/sacola', label: 'Sacola', icon: ShoppingBag },
  { href: '/conta', label: 'Conta', icon: User },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const { bagCount, favorites } = useStore()

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur-md lg:hidden"
    >
      <ul className="flex items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          const badge =
            item.href === '/sacola' ? bagCount : item.href === '/favoritos' ? favorites.length : 0

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="relative">
                  <Icon className="size-5" strokeWidth={active ? 2 : 1.6} aria-hidden="true" />
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-primary text-[0.5625rem] font-semibold text-primary-foreground">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                <span className="text-[0.625rem] tracking-wide">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
