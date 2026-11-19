// Portrait artwork reviewed for these products must remain fully visible.
const fullImageProducts = new Set([
  '8ee5429f-4cab-4cba-8273-cb3f2577d66e', // Body Splash Kaiak Tradicional 200ml
  '9be9aa42-ccbf-4711-87a6-4af6ba00413c', // Body Splash Infantil Cici Bela 150ml
  '3574bce3-3873-4782-97df-0b8e54f6aef1', // Malbec
]);

export function showFullProductImage(productId: string) {
  return fullImageProducts.has(productId);
}
