import { BrandLogo } from "@/components/brand-logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="admin-auth">
    <section className="admin-brand" aria-label="Makes by Cris Martins">
      <BrandLogo size="lg" className="admin-login-logo" />
      <div className="admin-welcome">
        <p className="admin-greeting">Bem-vinda de volta,<br /><strong>Cris.</strong></p>
        <p className="admin-brand-copy">Atualize produtos, fotos e preços do seu catálogo de forma simples.</p>
      </div>
    </section>
    <section className="admin-auth-panel">
      <div className="admin-auth-content">{children}<p className="admin-private">Acesso protegido e privado</p></div>
    </section>
  </main>;
}
