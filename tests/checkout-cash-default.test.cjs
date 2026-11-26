const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const { buildOrderMessage } = load('lib/whatsapp.ts');
const { formatCurrency } = load('lib/format.ts');
const coffee = { id: 'coffee', name: 'Coffee Woman Duo', price: 140, cashPrice: 136.9, creditPrice: 156 };
function harness(initialItems) {
  let items = initialItems, cursor = 0;
  const state = [];
  const Page = load('app/(loja)/checkout/page.tsx', {
    react: { ...React, useMemo: fn => fn(), useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    } },
    '@/components/store-provider': { useStore: () => ({ items, clearBag() {} }) },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    'next/link': ({ children, ...props }) => React.createElement('a', props, children),
  }).default;
  return {
    render() { cursor = 0; return Page(); },
    setItems(value) { items = value; },
    message() { return buildOrderMessage(items, state[0]); },
  };
}
function find(node, predicate) {
  if (!React.isValidElement(node)) return;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props.children)) {
    const result = find(child, predicate);
    if (result) return result;
  }
}
const paymentGroup = tree => find(tree, node => node.props.onValueChange && ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito'].includes(node.props.value));
function check(h, payment, amount) {
  const tree = h.render();
  assert.equal(paymentGroup(tree).props.value, payment);
  const html = render(tree);
  assert.ok(html.includes(`class="font-serif text-3xl text-primary">${formatCurrency(amount)}</span>`));
  assert.ok(h.message().includes(`*Total: ${formatCurrency(amount)}*`));
  assert.ok(h.message().includes(payment));
  return tree;
}
test('checkout inicia Coffee Woman Duo em dinheiro por R$ 136,90 e ordena as modalidades', () => {
  const h = harness([{ product: coffee, quantity: 1 }]);
  const tree = check(h, 'Dinheiro', 136.9);
  assert.deepEqual(React.Children.toArray(paymentGroup(tree).props.children).map(label => label.props.htmlFor),
    ['payment-Dinheiro', 'payment-PIX', 'payment-Cartão de débito', 'payment-Cartão de crédito']);
  assert.match(render(tree), /id="payment-Dinheiro"[^>]*checked/);
});
test('checkout mantém escolha manual em novas renderizações, mudança de dados e itens', () => {
  const h = harness([]);
  h.render(); // Estado inicial antes de o StoreProvider restaurar a sacola.
  h.setItems([{ product: coffee, quantity: 1 }]);
  check(h, 'Dinheiro', 136.9);
  for (const [payment, price] of [['PIX', 140], ['Cartão de débito', 140], ['Cartão de crédito', 156], ['Dinheiro', 136.9]]) {
    paymentGroup(h.render()).props.onValueChange(payment);
    check(h, payment, price);
    find(h.render(), node => node.props.id === 'name').props.onChange({ target: { value: 'Cliente Teste' } });
    check(h, payment, price);
    h.setItems([{ product: { ...coffee }, quantity: 2 }]);
    check(h, payment, price * 2);
    h.setItems([{ product: coffee, quantity: 1 }]);
    check(h, payment, price);
  }
});
test('checkout inicia em dinheiro com fallback antigo e crédito indisponível', () => {
  for (const cashPrice of [null, undefined]) {
    const h = harness([{ product: { ...coffee, cashPrice, creditPrice: null }, quantity: 2 }]);
    const tree = check(h, 'Dinheiro', 280);
    assert.equal(find(tree, node => node.props.id === 'payment-Cartão de crédito').props.disabled, true);
  }
});
