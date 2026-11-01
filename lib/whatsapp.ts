import { getFulfillmentLocation, storePickup } from "@/lib/fulfillment";
import { storeConfig } from "@/lib/store-config";
import { formatCurrency } from "@/lib/format";
import type { CartItem, CheckoutData } from "@/lib/types";

import { canPayWithCredit, creditUnavailableMessage, getCartTotal, getLineTotal } from "@/lib/pricing";
import { deliveryFeeLabel } from "@/lib/delivery";

export function buildOrderMessage(
  items: CartItem[],
  data: CheckoutData,
) {
  if (data.payment === "Cartão de crédito" && !canPayWithCredit(items)) throw new Error(creditUnavailableMessage);
  const lines: string[] = [];

  lines.push("Olá! Gostaria de realizar um pedido.");
  lines.push("");
  lines.push(`*PEDIDO — ${storeConfig.name.toUpperCase()}*`);
  lines.push("");
  lines.push("*Produtos:*");

  for (const item of items) {
    const variation = item.variation ? ` (${item.variation})` : "";
    const lineTotal = getLineTotal(item, data.payment);

    lines.push(
      `• ${item.quantity}x ${item.product.name}${variation} — ${formatCurrency(lineTotal)}`,
    );
  }

  lines.push("");
  lines.push(`*Total: ${formatCurrency(getCartTotal(items, data.payment))}*`);
  lines.push("");

  lines.push("*Cliente:*");
  lines.push(`Nome: ${data.name}`);
  lines.push(`WhatsApp: ${data.whatsapp}`);
  lines.push("");

  lines.push("*Pagamento:*");
  lines.push(data.payment);
  lines.push("");

  if (data.receivingMode === "store-pickup") {
    lines.push("*Forma de recebimento:*", "Retirada na loja", "");
    lines.push("*Local:*", `${storePickup.locationName} — ${storePickup.city}`);
  } else if (data.receivingMode === "delivery") {
    lines.push("*Forma de recebimento:*", "Entrega", "");
    const location = getFulfillmentLocation(data.city);
    if (location) {
      if (location.type === "home-delivery") {
        lines.push("*Endereço:*");
        const fields = [
          ["Rua", data.street], ["Número", data.number],
          ["Bairro", data.district], ["Complemento", data.complement],
          ["Ponto de referência", data.landmark],
        ];
        for (const [label, value] of fields) {
          if (value?.trim()) lines.push(`${label}: ${value.trim()}`);
        }
        lines.push(`Cidade: ${location.city}`);
      } else {
        lines.push("*Cidade:*", location.city, "");
        lines.push("*Local de recebimento:*", location.locationName);
        if (location.type === "delivery-point") lines.push("", "*Dia:*", location.day);
      }
    }
  }
  lines.push("", "*Frete:*", deliveryFeeLabel);

  lines.push("");
  lines.push("Aguardo a confirmação do pedido.");

  // Keep real LF characters here; buildWhatsAppUrl encodes them as %0A.
  return lines.join("\n");
}

export function buildWhatsAppUrl(
  message: string,
  phone = storeConfig.whatsapp,
) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
