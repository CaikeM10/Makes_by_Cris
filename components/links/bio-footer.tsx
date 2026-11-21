import { Check } from "lucide-react"

export function BioFooter() {
  return (
    <footer className="bio-footer rise-in rise-in-7">
      <p className="trust-note">
        <span className="trust-icon" aria-hidden="true">
          <Check size={12} strokeWidth={2} />
        </span>
        <span className="trust-item">Catálogo atualizado</span>
        <span className="trust-separator" aria-hidden="true">·</span>
        <span className="trust-item">Pedido finalizado pelo WhatsApp</span>
      </p>
      <div className="footer-rule" aria-hidden="true" />
      <p className="footer-brand">Makes by Cris Martins</p>
      <p className="footer-location">Poranga <span aria-hidden="true">·</span> Ceará</p>
    </footer>
  )
}
