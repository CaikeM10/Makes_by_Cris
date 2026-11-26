const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const pricing = load('lib/pricing.ts');
const { validateProduct } = load('lib/catalog/validation.ts');
const { mapPublicProduct, mapProduct } = load('lib/catalog/mappers.ts');
const { buildOrderMessage } = load('lib/whatsapp.ts');
const a = { id: 'a', name: 'Produto A', price: 85, cashPrice: 79.9, creditPrice: 94 };
const b = { id: 'b', name: 'Produto B', price: 40, cashPrice: null, creditPrice: 44.5 };
const items = [{ product: a, quantity: 1 }, { product: b, quantity: 1 }];
const valid = { name: 'Produto', category_id: 'cat', price: '85,00', cash_price: '79,90', credit_price: '94,00', active: true, available: true, featured: false, best_seller: false, gift_section: false, new_arrival: false };
const data = { name: 'Cliente', whatsapp: '88999999999', receivingMode: 'store-pickup' };

test('dinheiro: registros antigos NULL e campo ausente usam PIX; igualdade não duplica destaque', () => {
  for (const cashPrice of [null, undefined, 85]) {
    assert.equal(pricing.getProductPrice({ ...a, cashPrice }, 'Dinheiro'), 85);
    assert.equal(pricing.hasSpecialCashPrice({ ...a, cashPrice }), false);
  }
  assert.equal(pricing.hasSpecialCashPrice(a), true);
  assert.equal(pricing.getProductPrice({ ...a, cashPrice: 100 }, 'Dinheiro'), 100);
});
for (const [payment, total, unit] of [['Dinheiro', 119.9, 79.9], ['PIX', 125, 85], ['Cartão de débito', 125, 85], ['Cartão de crédito', 138.5, 94]]) {
  test(`sacola mista e WhatsApp: ${payment}`, () => {
    assert.equal(pricing.getCartTotal(items, payment), total);
    assert.equal(pricing.getProductPrice(a, payment), unit);
    const message = buildOrderMessage(items, { ...data, payment });
    const { formatCurrency } = load('lib/format.ts');
    assert.ok(message.includes(`Valor unitário: ${formatCurrency(unit)}`));
    assert.ok(message.includes(`*Total: ${formatCurrency(total)}*`));
    assert.ok(message.includes(`1x Produto A — ${formatCurrency(unit)}`));
    assert.ok(message.includes(payment));
    const multiple = [{ product: a, quantity: 3 }, { product: b, quantity: 2 }];
    assert.equal(pricing.getCartTotal(multiple, payment), (Math.round(unit * 100) * 3 + Math.round(pricing.getProductPrice(b, payment) * 100) * 2) / 100);
    assert.equal(pricing.getCartTotal(multiple.slice(1), payment), pricing.getLineTotal(multiple[1], payment));
  });
}
test('crédito ausente permanece indisponível, sem fallback ou desconto automático', () => {
  const noCredit = [{ product: { ...a, creditPrice: null }, quantity: 2 }, items[1]];
  assert.equal(pricing.canPayWithCredit(noCredit), false);
  assert.throws(() => pricing.getCartTotal(noCredit, 'Cartão de crédito'), /indisponível/);
  assert.throws(() => buildOrderMessage(noCredit, { ...data, payment: 'Cartão de crédito' }), /indisponível/);
  assert.equal(pricing.getCartTotal(noCredit, 'Dinheiro'), 199.8);
});
test('validação aceita preços independentes, normaliza opcionais e rejeita inválidos nos três campos', () => {
  for (const cash_price of ['', ' ', null, undefined]) assert.equal(validateProduct({ ...valid, cash_price }).data.cash_price, null);
  for (const cash_price of ['1,00', '100,00', '9999999999,99']) assert.equal(validateProduct({ ...valid, cash_price }).data.cash_price, cash_price.replace(',', '.'));
  for (const key of ['cash_price', 'price', 'credit_price']) {
    for (const invalid of ['0', '0,00', '-1', 'NaN', 'Infinity', '1e2', '1.234,56', '1.001', '10000000000', {}, 12]) assert.ok(validateProduct({ ...valid, [key]: invalid }).errors[key], `${key}: ${invalid}`);
  }
});
test('mappers preservam NULL e convenção cash_price / cashPrice', () => {
  for (const value of [null, undefined, '79.90', 79.9]) {
    const row = { ...a, cash_price: value, credit_price: null, price: '85.00' };
    assert.equal(mapPublicProduct(row, { slug: 'cat' }).cashPrice, value == null ? null : 79.9);
    assert.equal(mapProduct(row).cash_price, value == null ? null : '79.90');
  }
});
test('cadastro, edição e remoção persistem dinheiro sem mudar preços, imagens ou versão', async () => {
  const { saveCatalogProduct } = load('lib/catalog/save-product.ts');
  const version = '2026-11-26T12:00:00.123456Z';
  for (const editing of [false, true]) for (const cash_price of ['79,90', '']) {
    let saved;
    const repo = { categories: async () => [{ id: 'cat' }], get: async () => ({ updated_at: version, image: 'old.png' }), slugExists: async () => false,
      insert: async row => { saved = row; return 'created'; }, update: async (id, token, patch) => { assert.equal(token, version); saved = patch; return true; } };
    const file = new File([Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0])], 'test.png', { type: 'image/png' });
    const storage = { upload: async () => {}, remove: async () => assert.fail('não remover imagem') };
    const result = await saveCatalogProduct(repo, storage, { ...valid, cash_price }, editing ? null : file, editing ? { id: 'a', version } : undefined);
    assert.equal(result.error, undefined);
    assert.equal(saved.cash_price, cash_price ? '79.90' : null);
    assert.equal(saved.price, '85.00'); assert.equal(saved.credit_price, '94.00');
    if (editing) assert.equal(saved.image, undefined);
  }
});
test('formulário mantém ordem, obrigatoriedade, valor antigo vazio e feedback acessível', () => {
  const { ProductPriceFields } = load('components/admin/product-price-fields.tsx');
  const html = render(React.createElement(ProductPriceFields, { product: { cash_price: null, price: '85.00', credit_price: null }, errors: { cash_price: 'Inválido' } }));
  assert.ok(html.indexOf('name="cash_price"') < html.indexOf('name="price"'));
  assert.ok(html.indexOf('name="price"') < html.indexOf('name="credit_price"'));
  const input = html.match(/<input[^>]*name="cash_price"[^>]*>/)[0];
  assert.match(input, /value=""/); assert.doesNotMatch(input, /required/);
  assert.match(input, /aria-invalid="true"/); assert.match(input, /cash_price-error/);
  assert.match(html.match(/<input[^>]*name="price"[^>]*>/)[0], /required/);
});
test('SEO mantém oferta de PIX/débito com condição explícita', () => {
  const { productJsonLd } = load('lib/seo.ts', {}, { NEXT_PUBLIC_SITE_URL: 'https://makes.example', NODE_ENV: 'production' });
  const offer = productJsonLd({ ...a, slug: 'a' }).offers;
  assert.equal(offer.price, 85); assert.match(offer.description, /PIX.*débito/);
});

test('checkout renderiza o total e subtotais da modalidade selecionada, inclusive após mudar quantidades', () => {
  const noop = () => {};
  for (const payment of ['Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito']) {
    for (const quantity of [1, 3]) {
      const current = [{ product: a, quantity }, items[1]];
      const mocks = {
        react: { ...React, useState: initial => React.useState(initial?.payment ? { ...initial, payment } : initial) },
        '@/components/store-provider': { useStore: () => ({ items: current, clearBag: noop }) },
        'next/navigation': { useRouter: () => ({ push: noop }) },
        'next/link': ({ children, ...props }) => React.createElement('a', props, children),
      };
      const Page = load('app/(loja)/checkout/page.tsx', mocks).default;
      const html = render(React.createElement(Page));
      const { formatCurrency } = load('lib/format.ts');
      assert.ok(html.includes(formatCurrency(pricing.getCartTotal(current, payment))));
      assert.ok(html.includes(formatCurrency(pricing.getLineTotal(current[0], payment))));
      assert.ok(html.includes(payment));
    }
  }
});

test('select público inclui cash_price; migration incremental não altera registros ou RLS', () => {
  const fs = require('node:fs');
  const { PUBLIC_PRODUCT_COLUMNS } = load('lib/catalog/public-repository.ts');
  assert.ok(PUBLIC_PRODUCT_COLUMNS.split(',').includes('cash_price'));
  const sql = fs.readFileSync('supabase/migrations/202611260001_cash_payment_pricing.sql', 'utf8');
  assert.match(sql, /cash_price numeric\(12,2\) null/i);
  assert.match(sql, /cash_price > 0/);
  assert.doesNotMatch(sql, /\b(update|delete|drop|rename|policy)\b/i);
});
