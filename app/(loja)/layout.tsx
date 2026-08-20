import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { BottomNavigation } from '@/components/bottom-navigation'
import { SplashScreen } from '@/components/splash-screen'

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1 pb-24 lg:pb-0">{children}</main>
        <SiteFooter />
      </div>
      <BottomNavigation />
    </>
  )
}
