import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BottomNavigation } from '@/components/bottom-navigation'
import { getPublicCatalog } from '@/lib/catalog/public-server'
import { CatalogProvider } from '@/components/catalog-provider'
import { StoreProvider } from '@/components/store-provider'

// Each navigation receives a new shared snapshot; selections restore by ID.
export default async function LojaTemplate({ children }: { children: React.ReactNode }) {
  const { products, categories } = await getPublicCatalog()
  return (
    <CatalogProvider catalog={{ products, categories }}><StoreProvider>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1 pb-24 lg:pb-0">{children}</main>
        <SiteFooter />
      </div>
      <BottomNavigation />
    </StoreProvider></CatalogProvider>
  )
}
