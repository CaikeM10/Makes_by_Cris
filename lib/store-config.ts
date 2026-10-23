/**
 * Configuração central da loja.
 * Troque o WhatsApp aqui (ou em /admin/configuracoes) para receber os pedidos.
 */
export const storeConfig = {
  name: "Makes by Cris Martins",
  shortName: "Makes",
  tagline: "Beleza com assinatura",
  description:
    "Catálogo digital de maquiagem, perfumes, skincare e cuidados selecionados por Cris Martins. Escolha seus produtos e finalize o pedido pelo WhatsApp.",
  city: "Poranga - CE",
  /** Número de exemplo — substitua pelo número real da loja (DDI + DDD + número) */
  whatsapp: "5588999172635",
  whatsappDisplay: "(88) 999172635",
  instagram: "@makes_by_crismartins",
  mapsUrl: "https://maps.app.goo.gl/PjL37AE7pKBMtThu9 ",
  /** Frete grátis para todas as cidades atendidas. */
  deliveryFee: 0,
  hours: "Seg a Sáb, 7:00h às 18h Dom 7:00 às 12h",
} as const;
