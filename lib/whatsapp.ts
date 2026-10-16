import { storeConfig } from "@/lib/store-config";
import { formatCurrency } from "@/lib/format";
import type { CartItem, CheckoutData } from "@/lib/types";

import { getCartTotal, getLineTotal } from "@/lib/pricing";

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

  lines.push("*Tipo:*");
  lines.push(data.fulfillment);

  if (data.fulfillment === "Entrega") {
    const addressLine = [data.street, data.number].filter(Boolean).join(", ");

    const cityLine = data.city || storeConfig.city;

    lines.push("");
    lines.push("*Endereço:*");

    if (addressLine) lines.push(addressLine);
    if (data.complement) lines.push(data.complement);
    if (data.district) lines.push(data.district);

    lines.push(cityLine);

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
