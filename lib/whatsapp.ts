import { getFulfillmentLocation, storePickup } from "@/lib/fulfillment";
import { storeConfig } from "@/lib/store-config";
import { formatCurrency } from "@/lib/format";
import type { CartItem, CheckoutData } from "@/lib/types";

import { getCartTotal, getLineTotal } from "@/lib/pricing";
import { deliveryFeeLabel } from "@/lib/delivery";

export function buildOrderMessage(
  items: CartItem[],
  data: CheckoutData,
) {
  const lines: string[] = [];

  lines.push("Olá! Gostaria de realizar um pedido:");
  lines.push("");
  lines.push(`*PEDIDO — ${storeConfig.name.toUpperCase()}*`);
  lines.push("");
  lines.push("*Produtos:*");

  for (const item of items) {
    const variation = item.variation ? ` (${item.variation})` : "";
    const lineTotal = getLineTotal(item, data.payment);

    lines.push(
      `${item.quantity}x ${item.product.name}${variation} — ${formatCurrency(lineTotal)}`,
    );
  }

  lines.push("");
  lines.push(`*Total:* ${formatCurrency(getCartTotal(items, data.payment))}`);
  lines.push("");

  lines.push("*Cliente:*");
  lines.push(data.name);
  lines.push("");

  lines.push("*WhatsApp:*");
  lines.push(data.whatsapp);
  lines.push("");

  lines.push("*Forma de pagamento:*");
  lines.push(data.payment);
  lines.push("");

  if (data.receivingMode === "store-pickup") {
    lines.push("*Forma de recebimento:* Retirada na loja");
    lines.push(`*Local:* ${storePickup.locationName} — ${storePickup.city}`);
  } else if (data.receivingMode === "delivery") {
    lines.push("*Forma de recebimento:* Entrega");
    const location = getFulfillmentLocation(data.city);
    if (location) {
      lines.push("*Cidade:* " + location.city);
      if (location.type !== "home-delivery") lines.push("*Local de recebimento:* " + location.locationName);
      if (location.type === "delivery-point") lines.push("*Dia:* " + location.day);
      if (location.type === "home-delivery") {
        const fields = [
          ["Rua", data.street], ["Bairro", data.district],
          ["Número", data.number], ["Complemento", data.complement],
          ["Ponto de referência", data.landmark],
        ];
        for (const [label, value] of fields) {
          if (value.trim()) lines.push(`*${label}:* ${value.trim()}`);
        }
      }
    }
  }
  lines.push("*Frete:* " + deliveryFeeLabel);

  lines.push("");
  lines.push("Obrigada!");

  return lines.join("\n");
}

export function buildWhatsAppUrl(
  message: string,
  phone = storeConfig.whatsapp,
) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
