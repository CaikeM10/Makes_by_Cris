export const bioDestinations = {
  catalog: "https://www.makesbycrismartins.com.br/",
  whatsapp: "https://api.whatsapp.com/send/?phone=558896803746&text&type=phone_number&app_absent=0",
  location: "https://maps.app.goo.gl/BqxL8djYxHRHkd9M6",
  instagram: "https://www.instagram.com/makes_by_crismartins/",
}

export const bioActions = [
  {
    label: "Ver catálogo oficial",
    href: bioDestinations.catalog,
    icon: "store",
    emphasis: "primary",
  },
  {
    label: "Falar no WhatsApp",
    href: bioDestinations.whatsapp,
    icon: "message",
    emphasis: "secondary",
  },
  {
    label: "Como chegar",
    href: bioDestinations.location,
    icon: "pin",
    emphasis: "tertiary",
  },
] as const

export const socialLinks = [
  {
    label: "Instagram",
    href: bioDestinations.instagram,
    icon: "instagram",
  },
  {
    label: "WhatsApp",
    href: bioDestinations.whatsapp,
    icon: "message",
  },
  {
    label: "Localização",
    href: bioDestinations.location,
    icon: "pin",
  },
] as const
