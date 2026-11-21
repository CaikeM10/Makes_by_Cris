import type { Metadata } from "next"
import "./links.css"

export const metadata: Metadata = {
  title: "Canais oficiais",
  description: "Acesse o catálogo oficial, fale pelo WhatsApp e encontre a loja Makes by Cris Martins em Poranga, Ceará.",
}

import { BioActionButton } from "@/components/links/bio-action-button"
import { BioFooter } from "@/components/links/bio-footer"
import { BioHeader } from "@/components/links/bio-header"
import { SocialLinks } from "@/components/links/social-links"
import { bioActions, socialLinks } from "@/lib/bio-links"

export default function Page() {
  return (
    <main className="bio-page">
      <div className="bio-orb bio-orb-one" aria-hidden="true" />
      <div className="bio-orb bio-orb-two" aria-hidden="true" />
      <section className="bio-card" aria-labelledby="page-title">
        <BioHeader />
        <h2 id="page-title" className="sr-only">
          Canais oficiais da Makes by Cris Martins
        </h2>

        <nav className="bio-actions" aria-label="Canais principais">
          {bioActions.map((action, index) => (
            <BioActionButton action={action} index={index} key={action.label} />
          ))}
        </nav>

        <SocialLinks links={socialLinks} />
        <BioFooter />
      </section>
      <p className="page-signature" aria-hidden="true">
        Feito com carinho, para você.
      </p>
    </main>
  )
}
