import {
  ArrowRight,
  MapPin,
  MessageCircle,
  Store,
  type LucideIcon,
} from "lucide-react"
import type { bioActions } from "@/lib/bio-links"

type BioAction = (typeof bioActions)[number]

const actionIcons: Record<BioAction["icon"], LucideIcon> = {
  store: Store,
  message: MessageCircle,
  pin: MapPin,
}

export function BioActionButton({
  action,
  index,
}: {
  action: BioAction
  index: number
}) {
  const Icon = actionIcons[action.icon]
  const isExternal = action.href.startsWith("http")

  return (
    <a
      className={`bio-action bio-action-${action.emphasis} rise-in rise-in-${index + 2}`}
      href={action.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
    >
      <span className="bio-action-icon" aria-hidden="true">
        <Icon size={19} strokeWidth={1.65} />
      </span>
      <span className="bio-action-label">{action.label}</span>
      <ArrowRight
        className="bio-action-arrow"
        size={17}
        strokeWidth={1.6}
        aria-hidden="true"
      />
    </a>
  )
}
