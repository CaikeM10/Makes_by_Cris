import { LinkButton } from '@/components/link-button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="eyebrow text-primary">Erro 404</p>
      <h1 className="font-serif text-4xl leading-tight text-balance lg:text-5xl">
        Não encontramos esta página
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        O link pode ter mudado ou o produto saiu do catálogo.
      </p>
      <LinkButton href="/" size="lg" className="h-12 rounded-full px-7">
        Voltar ao início
      </LinkButton>
    </main>
  )
}
