import { SplashScreen } from '@/components/splash-screen'

export const dynamic = 'force-dynamic'

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return <><SplashScreen />{children}</>
}
