const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, URLSearchParams, require(name) {
    if (name in mocks) return mocks[name];
    if (name === 'server-only') return {};
    if (name === 'react' || name === 'react/jsx-runtime') return require(name);
    const resolve = base => load(base + (fs.existsSync(path.join(root, base + '.ts')) ? '.ts' : '.tsx'), mocks);
    if (name.startsWith('@/')) return resolve(name.slice(2));
    if (name.startsWith('./')) return resolve(path.join(path.dirname(file), name));
    throw Error(name);
  } });
  return module.exports;
}
const category = { id: 'cat-1', slug: 'perfumes', name: 'Perfumes', active: true };
const row = { id: 'test', name: 'Produto', slug: 'produto', short_description: 'Produto', description: 'Produto', brand: 'Marca', image: '/test.webp', keywords: [], variations: null, price: '10.00', credit_price: null, active: true, available: true, category_id: category.id };
const mapper = load('lib/catalog/mappers.ts');
const product = mapper.mapPublicProduct(row, category);
const items = [{ product, quantity: 2 }];
const creditItems = [{ product: { ...product, creditPrice: 12 }, quantity: 2 }];
const pricing = load('lib/pricing.ts');
const valid = { name: 'Produto', brand: 'Marca', short_description: 'Produto', description: 'Produto', category_id: category.id, price: '10,00', credit_price: '', active: false, available: true, featured: false, best_seller: false, gift_section: false };
const { validateProduct } = load('lib/catalog/validation.ts');
const data = { name: 'Cliente', whatsapp: '88999999999', payment: 'PIX', receivingMode: 'store-pickup', city: '', street: '', number: '', district: '', complement: '', landmark: '' };
const { buildOrderMessage } = load('lib/whatsapp.ts');
const element = tag => ({ children, ...props }) => React.createElement(tag, props, children);
const button = ({ children }) => React.createElement('button', null, children || 'Adicionar à sacola');
const uiMocks = {
  'next/link': { default: element('a') },
  'lucide-react': new Proxy({}, { get: () => () => null }),
  '@/lib/utils': { cn: (...classes) => classes.filter(Boolean).join(' ') },
  '@/components/add-to-bag-button': { AddToBagButton: button },
  '@/components/favorite-button': { FavoriteButton: () => null },
  '@/components/link-button': { AnchorButton: element('a'), LinkButton: element('a') },
};

test('mappers público e Admin preservam null, sem transformar em zero; números existentes preservados', () => {
  assert.equal(product.creditPrice, null);
  assert.notEqual(product.creditPrice, 0);
  assert.equal(mapper.mapProduct(row).credit_price, null);
  assert.equal(mapper.mapPublicProduct({ ...row, credit_price: '12.50' }, category).creditPrice, 12.5);
  assert.equal(mapper.mapProduct({ ...row, credit_price: 12.5 }).credit_price, '12.50');
});
test('Admin normaliza campo vazio ou null para null, mantém PIX obrigatório e valida crédito positivo', () => {
  for (const credit_price of ['', ' ', null, undefined]) assert.equal(validateProduct({ ...valid, credit_price }).data.credit_price, null);
  for (const credit_price of ['0', '0,00', '-1', 'NaN', '1.234,56', 'abc']) assert.ok(validateProduct({ ...valid, credit_price }).errors.credit_price);
  assert.equal(validateProduct({ ...valid, credit_price: '12,50' }).data.credit_price, '12.50');
  for (const price of ['', null, '-1', 'abc']) assert.ok(validateProduct({ ...valid, price }).errors.price);
});
test('Admin campo PIX obrigatório e crédito opcional vazio com ajuda acessível', () => {
  const { ProductPriceFields } = load('components/admin/product-price-fields.tsx');
  const html = render(React.createElement(ProductPriceFields, { product: { price: '10.00', credit_price: null } }));
  assert.match(html.match(/<input[^>]*name="price"[^>]*>/)[0], /required=""/);
  const credit = html.match(/<input[^>]*name="credit_price"[^>]*>/)[0];
  assert.doesNotMatch(credit, /required=/);
  assert.match(credit, /value=""/);
  assert.match(credit, /aria-describedby="credit-price-help"/);
});
for (const payment of ['PIX', 'Dinheiro', 'Cartão de débito']) {
  test(`${payment} funciona sem preço de crédito na sacola e WhatsApp`, () => {
    assert.equal(pricing.getCartTotal(items, payment), 20);
    assert.equal(pricing.getLineTotal(items[0], payment), 20);
    const text = buildOrderMessage(items, { ...data, payment });
    assert.match(text, /20,00/);
    assert.doesNotMatch(text, /R\$\s*0,00/);
  });
}
test('sacola resolve produto sem crédito normalmente', () => {
  const { resolveStoredBag } = load('lib/catalog/stored-selection.ts');
  const bag = resolveStoredBag([{ productId: product.id, quantity: 2 }], [product]);
  assert.equal(bag.length, 1);
  assert.equal(bag[0].product.creditPrice, null);
});
test('crédito bloqueado para item sem preço, sacola mista e vazia; não retorna total falso', () => {
  for (const bag of [items, [...items, ...creditItems], []]) {
    assert.equal(pricing.canPayWithCredit(bag), false);
    assert.throws(() => pricing.getCartTotal(bag, 'Cartão de crédito'), /Preço no crédito indisponível/);
    assert.throws(() => buildOrderMessage(bag, { ...data, payment: 'Cartão de crédito' }), /Preço no crédito indisponível/);
  }
  assert.throws(() => pricing.getProductPrice(product, 'Cartão de crédito'), /Preço no crédito indisponível/);
});
test('crédito permanece disponível com preços reais e sem percentual', () => {
  assert.equal(pricing.canPayWithCredit(creditItems), true);
  assert.equal(pricing.getCartTotal(creditItems, 'Cartão de crédito'), 24);
  assert.match(buildOrderMessage(creditItems, { ...data, payment: 'Cartão de crédito' }), /24,00/);
});
for (const [file, name] of [['components/product-card.tsx', 'ProductCard'], ['components/product-purchase.tsx', 'ProductPurchase']]) {
  test(`${name} renderiza PIX e compra, omite crédito ausente e preserva crédito informado`, () => {
    const Component = load(file, uiMocks)[name];
    const html = render(React.createElement(Component, { product }));
    assert.match(html, /10,00/);
    assert.match(html, /Adicionar à sacola/);
    assert.doesNotMatch(html, /no crédito|0,00.*no crédito/);
    const withCredit = render(React.createElement(Component, { product: creditItems[0].product }));
    assert.match(withCredit, /12,00/);
    assert.match(withCredit, /no crédito/);
  });
}

function checkoutHarness(bag, payment) {
  const state = [{ ...data, payment }, {}];
  let cursor = 0;
  const mocks = { ...uiMocks,
    react: { ...React, useState: () => [state[cursor++], () => {}], useMemo: fn => fn() },
    'next/navigation': { useRouter: () => ({ push() { throw Error('Não navegar'); } }) },
    sonner: { toast: { error() {}, success() { throw Error('Não finalizar'); } } },
    '@/components/store-provider': { useStore: () => ({ items: bag, clearBag() { throw Error('Não limpar'); } }) },
    '@/components/ui/button': { Button: element('button') },
    '@/components/ui/input': { Input: element('input') },
    '@/components/ui/label': { Label: element('label') },
    '@/components/ui/radio-group': { RadioGroup: ({ children }) => React.createElement('div', null, children), RadioGroupItem: ({ value, ...props }) => React.createElement('input', { type: 'radio', value, ...props }) },
    '@/components/ui/textarea': { Textarea: element('textarea') },
    '@/components/ui/select': Object.fromEntries(['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'].map(k => [k, ({ children }) => React.createElement('div', null, children)])),
  };
  return load('app/(loja)/checkout/page.tsx', mocks).default();
}
test('checkout desabilita apenas crédito na sacola mista; continua disponível se todos possuem', () => {
  for (const [bag, disabled] of [[items, true], [[...items, ...creditItems], true], [creditItems, false]]) {
    const html = render(checkoutHarness(bag, 'PIX'));
    const radio = html.match(/<input[^>]*id="payment-Cartão de crédito"[^>]*>/)[0];
    assert.equal(radio.includes('disabled=""'), disabled);
    assert.equal(html.includes(pricing.creditUnavailableMessage), disabled);
    assert.match(html, /20,00|40,00/);
  }
});
test('crédito selecionado perde disponibilidade: exige nova seleção, omite totais e impede envio', () => {
  const tree = checkoutHarness(items, 'Cartão de crédito');
  const html = render(tree);
  assert.match(html, /Selecione outra forma de pagamento/);
  assert.match(html, /Indisponível/);
  assert.doesNotMatch(html, /R\$\s*0,00/);
  const form = React.Children.toArray(tree.props.children).find(child => child.type === 'form');
  assert.doesNotThrow(() => form.props.onSubmit({ preventDefault() {} }));
});
test('sacola renderiza subtotal PIX e omite total crédito ausente', () => {
  const Component = load('app/(loja)/sacola/page.tsx', { ...uiMocks, '@/components/store-provider': { useStore: () => ({ items, bagCount: 2, subtotal: 20 }) } }).default;
  const html = render(React.createElement(Component));
  assert.match(html, /20,00/);
  assert.doesNotMatch(html, /Total no crédito/);
  assert.match(html, /Finalizar pedido/);
});
test('página individual mantém preço à vista e compra sem crédito; crédito real continua visível', async () => {
  for (const current of [product, creditItems[0].product]) {
    const Page = load('app/(loja)/produto/[slug]/page.tsx', { ...uiMocks,
      'next/navigation': { notFound() { throw Error('Produto deveria existir'); } },
      '@/components/product-grid': { ProductGrid: () => null },
      '@/components/section-heading': { SectionHeading: () => null },
      '@/lib/catalog/public-server': { getPublicCatalog: async () => ({ getProductBySlug: () => current, getCategoryName: () => 'Perfumes', getProductsByCategory: () => [] }) },
    }).default;
    const html = render(await Page({ params: Promise.resolve({ slug: product.slug }) }));
    assert.match(html, /10,00/);
    assert.match(html, /Adicionar à sacola/);
    assert.equal(html.includes('no crédito'), current.creditPrice !== null);
  }
});
test('catálogo, busca e resolução de favoritos mantêm produto com crédito null', () => {
  const catalog = load('lib/catalog/public-catalog.ts').selectPublicCatalog({ categories: [category], products: [product] });
  assert.equal(catalog.products[0].creditPrice, null);
  assert.equal(catalog.searchProducts('Produto')[0].creditPrice, null);
  const favorites = load('lib/catalog/stored-selection.ts').parseStoredFavorites(JSON.stringify([product.id]));
  assert.equal(catalog.products.filter(p => favorites.includes(p.id))[0].creditPrice, null);
});
test('migration contém exclusivamente DROP NOT NULL de credit_price', () => {
  assert.equal(fs.readFileSync(path.join(root, 'supabase/migrations/202610250001_optional_credit_price.sql'), 'utf8').trim(), 'alter table public.products\nalter column credit_price drop not null;');
});
