import Image from "next/image"
import { Sparkles } from "lucide-react"

export function BioHeader() {
  return (
    <header className="bio-header rise-in rise-in-1">
      <div className="brand-mark" aria-label="Makes by Cris Martins">
        <Image
          className="brand-logo"
          src="/links/makes-logo.png"
          alt="Emblema Makes by Cris Martins"
          width={78}
          height={78}
        />
        <span className="brand-wordmark">
          <span className="brand-wordmark-main">MAKES</span>
          <span className="brand-wordmark-by">by Cris Martins</span>
        </span>
      </div>

      <div className="brand-divider" aria-hidden="true">
        <span />
        <Sparkles size={13} strokeWidth={1.4} />
        <span />
      </div>

      <p className="brand-eyebrow">PERFUMES · PRESENTES · AUTOCUIDADO</p>
      <h1 className="bio-title">Makes by Cris Martins</h1>
      <p className="bio-description">
        Perfumes, presentes e cuidados selecionados por Cris Martins.
      </p>
      <p className="bio-service-note">
        Atendimento pelo WhatsApp <span aria-hidden="true">·</span> Entregas para
        todo o Brasil
      </p>
    </header>
  )
}
