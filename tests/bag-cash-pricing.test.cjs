const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const { getCartTotal } = load('lib/pricing.ts');
const { formatCurrency } = load('lib/format.ts');
const product = { id: 'a', slug: 'a', name: 'Produto A', price: 85, cashPrice: 79.9, creditPrice: 94 };
const legacy = { id: 'b', slug: 'b', name: 'Produto antigo', price: 40, creditPrice: 44.5 };
function render(items) {
  const Page = load('app/(loja)/sacola/page.tsx', {
    '@/components/store-provider': { useStore: () => ({ items, subtotal: getCartTotal(items, 'PIX'), bagCount: items.reduce((n, i) => n + i.quantity, 0) }) },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
  }).default;
  return renderToStaticMarkup(React.createElement(Page));
}
function mainTotal(html, amount) {
  assert.ok(html.includes(`class="shrink-0 font-serif text-3xl text-primary">${formatCurrency(amount)}</span>`));
}
test('sacola: desconto destaca dinheiro por quantidade e total misto, sem duplicar PIX', () => {
  for (const quantity of [1, 3, 99]) {
    const html = render([{ product, quantity }, { product: legacy, quantity: 2 }]);
    const line = html.match(/<li\b[\s\S]*?<\/li>/)[0];
    assert.ok(line.includes(`${formatCurrency(79.9 * quantity)}<span class="block font-sans text-xs text-muted-foreground">em dinheiro`));
    assert.ok(line.includes(`${formatCurrency(85 * quantity)} no PIX/débito`));
    assert.ok(line.includes(`${formatCurrency(94 * quantity)} no crédito`));
    mainTotal(html, Math.round(7990 * quantity + 8000) / 100);
    assert.equal((html.match(/Total no PIX\/débito/g) || []).length, 1);
    assert.match(html, /forma de pagamento será definida na próxima etapa/);
    assert.match(html, /Entrega/);
    assert.match(html, /href="\/checkout"/);
  }
});
test('sacola: antigos, igualdade e preço superior mantêm PIX principal', () => {
  for (const cashPrice of [undefined, null, 85, 90]) {
    const html = render([{ product: { ...product, cashPrice }, quantity: 2 }]);
    mainTotal(html, 170);
    const line = html.match(/<li\b[\s\S]*?<\/li>/)[0];
    assert.doesNotMatch(line, /em dinheiro|no crédito/);
    assert.equal((html.match(/Total no PIX\/débito/g) || []).length, 1);
    if (cashPrice !== 90) assert.doesNotMatch(html, /Total em dinheiro/);
  }
});
test('sacola: crédito ausente oculta modalidade por item e no total', () => {
  for (const creditPrice of [null, undefined, 0]) {
    const html = render([{ product: { ...product, creditPrice }, quantity: 2 }, { product: legacy, quantity: 1 }]);
    assert.doesNotMatch(html, /no crédito/);
    mainTotal(html, 199.8);
  }
});
test('sacola: remoção e mistura de preços maiores recalculam o destaque', () => {
  mainTotal(render([{ product, quantity: 1 }, { product: { ...legacy, cashPrice: 60 }, quantity: 1 }]), 125);
  const remaining = render([{ product: legacy, quantity: 1 }]);
  mainTotal(remaining, 40);
  assert.doesNotMatch(remaining, /em dinheiro/);
  assert.match(render([]), /Sua sacola está vazia/);
});
