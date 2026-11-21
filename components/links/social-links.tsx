import { MapPin, MessageCircle } from "lucide-react"
import type { socialLinks } from "@/lib/bio-links"

export function SocialLinks({
  links,
}: {
  links: typeof socialLinks
}) {
  return (
    <nav className="social-links rise-in rise-in-6" aria-label="Atalhos secundários">
      {links.map((link) => {
        const Icon =
          link.icon === "message" ? MessageCircle : link.icon === "pin" ? MapPin : null
        const isExternal = link.href.startsWith("http")

        return (
          <a
            className="social-link"
            href={link.href}
            key={link.label}
            aria-label={link.label}
            title={link.label}
            target={isExternal ? "_blank" : undefined}
            rel={isExternal ? "noreferrer" : undefined}
          >
            {Icon ? (
              <Icon size={18} strokeWidth={1.65} aria-hidden="true" />
            ) : (
              <img src="/links/instagram.svg" width="18" height="18" alt="" aria-hidden="true" />
            )}
          </a>
        )
      })}
    </nav>
  )
}
