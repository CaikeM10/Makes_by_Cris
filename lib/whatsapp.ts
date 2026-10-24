import { fulfillmentLabels, getFulfillmentLocation } from "@/lib/fulfillment";
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

  const location = getFulfillmentLocation(data.city);
  if (location) {
    lines.push("*Tipo:*");
    lines.push(fulfillmentLabels[location.type]);
    lines.push("*Cidade:* " + location.city);
    lines.push("*Frete:* " + deliveryFeeLabel);
    if (location.type !== "home-delivery") lines.push("*Local de retirada:* " + location.locationName);
    if (location.type === "delivery-point") lines.push("*Dia:* " + location.day);
  }

  if (location?.type === "home-delivery") {
    const addressLine = [data.street, data.number].filter(Boolean).join(", ");

    lines.push("");
    lines.push("*Endereço:*");

    if (addressLine) lines.push(addressLine);
    if (data.complement) lines.push(data.complement);
    if (data.district) lines.push(data.district);

    if (data.cep) {
      lines.push(`CEP: ${data.cep}`);
    }

    if (data.landmark) {
      lines.push("");
      lines.push("*Ponto de referência:*");
      lines.push(data.landmark);
    }
  }

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
