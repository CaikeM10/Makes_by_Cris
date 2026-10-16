import type { CartItem, PaymentMethod, Product } from "@/lib/types";

export function getProductPrice(product: Product, payment: PaymentMethod): number {
  return payment === "Cartão de crédito" ? product.creditPrice : product.price;
}

export function getLineTotal(item: CartItem, payment: PaymentMethod): number {
  return Math.round(getProductPrice(item.product, payment) * 100) * item.quantity / 100;
}

export function getCartTotal(items: CartItem[], payment: PaymentMethod): number {
  return items.reduce(
    (total, item) => total + Math.round(getLineTotal(item, payment) * 100),
    0,
  ) / 100;
}
