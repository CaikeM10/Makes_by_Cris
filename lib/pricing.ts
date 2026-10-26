import type { CartItem, PaymentMethod, Product } from "@/lib/types";

export const creditUnavailableMessage = "Preço no crédito indisponível para um ou mais itens deste pedido.";

export function canPayWithCredit(items: CartItem[]): boolean {
  return items.length > 0 && items.every(({ product }) => typeof product.creditPrice === "number" && Number.isFinite(product.creditPrice) && product.creditPrice > 0);
}

export function getProductPrice(product: Product, payment: PaymentMethod): number {
  if (payment === "Cartão de crédito") {
    const credit = product.creditPrice;
    if (typeof credit !== "number" || !Number.isFinite(credit) || credit <= 0) throw new Error(creditUnavailableMessage);
    return credit;
  }
  return product.price;
}

export function getLineTotal(item: CartItem, payment: PaymentMethod): number {
  return Math.round(getProductPrice(item.product, payment) * 100) * item.quantity / 100;
}

export function getCartTotal(items: CartItem[], payment: PaymentMethod): number {
  if (payment === "Cartão de crédito" && !canPayWithCredit(items)) throw new Error(creditUnavailableMessage);
  return items.reduce(
    (total, item) => total + Math.round(getLineTotal(item, payment) * 100),
    0,
  ) / 100;
}
