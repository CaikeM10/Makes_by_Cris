const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load-typescript.cjs');
const { buildOrderMessage, buildWhatsAppUrl } = load('lib/whatsapp.ts');
const data = {
  name: 'caikemarinho', whatsapp: '(88) 99917-2635', payment: 'PIX', receivingMode: 'store-pickup',
  city: '', street: '', number: '', district: '', complement: '', landmark: '',
};
const items = [
  { product: { name: 'Natura Ekos Maracujá', price: 61, creditPrice: 70 }, quantity: 1 },
  { product: { name: 'Coffee Addictive', price: 120, creditPrice: 130 }, quantity: 1 },
];
const expected = `Olá! Gostaria de realizar um pedido.

*PEDIDO — MAKES BY CRIS MARTINS*

*Produtos:*
• 1x Natura Ekos Maracujá — R$\u00a061,00
• 1x Coffee Addictive — R$\u00a0120,00

*Total: R$\u00a0181,00*

*Cliente:*
Nome: caikemarinho
WhatsApp: (88) 99917-2635

*Pagamento:*
PIX

*Forma de recebimento:*
Retirada na loja

*Local:*
Makes by Cris Martins — Poranga - CE

*Frete:*
Grátis

Aguardo a confirmação do pedido.`;

test('QA: two real product names, PIX and store pickup match the complete requested structure', () => {
  assert.equal(buildOrderMessage(items, data), expected);
  const url = buildWhatsAppUrl(expected);
  assert.match(url, /%0A%0A/);
  assert.equal(decodeURIComponent(url.split('?text=')[1]), expected);
  assert.equal(new URL(url).searchParams.get('text'), expected);
  assert.equal(new URL(url).pathname, '/558896803746');
});

test('single product retains quantity, variation and the checkout line total', () => {
  const message = buildOrderMessage([{ ...items[0], quantity: 2, variation: 'Maracujá' }], data);
  assert.match(message, /\n• 2x Natura Ekos Maracujá \(Maracujá\) — R\$\s122,00\n/);
  assert.equal(message.split('\n').filter(line => line.startsWith('• ')).length, 1);
  assert.match(message, /\n\n\*Total: R\$\s122,00\*\n\n/);
});

test('product count is dynamic and each item has its own bullet line', () => {
  const many = [...items, { ...items[0], quantity: 3 }];
  const message = buildOrderMessage(many, data);
  assert.equal(message.split('\n').filter(line => line.startsWith('• ')).length, many.length);
  assert.match(message, /\*Total: R\$\s364,00\*/);
});

test('pickup ignores stale delivery details and never includes an address', () => {
  const message = buildOrderMessage(items, { ...data, city: 'Poranga - CE', street: 'Rua oculta', number: '123', district: 'Centro' });
  assert.match(message, /\*Local:\*\nMakes by Cris Martins — Poranga - CE\n\n\*Frete:\*\nGrátis/);
  assert.doesNotMatch(message, /Endereço|Rua oculta|Número:|Bairro:|Cidade:/);
});

test('Poranga home delivery preserves all applicable address fields in the requested order', () => {
  const message = buildOrderMessage(items, { ...data, receivingMode: 'delivery', city: 'Poranga - CE',
    street: 'Rua São João', number: '12', district: 'Centro', complement: 'Casa A', landmark: 'Praça da Sé' });
  assert.ok(message.includes('*Forma de recebimento:*\nEntrega\n\n*Endereço:*\nRua: Rua São João\nNúmero: 12\nBairro: Centro\nComplemento: Casa A\nPonto de referência: Praça da Sé\nCidade: Poranga - CE\n\n*Frete:*\nGrátis'));
});

test('other supported cities keep pickup location and delivery day, without a home address', () => {
  const message = buildOrderMessage(items, { ...data, receivingMode: 'delivery', city: 'Crateús - CE', street: 'Ignored' });
  assert.match(message, /\*Cidade:\*\nCrateús - CE\n\n\*Local de recebimento:\*\nMary Baby\n\n\*Dia:\*\nTerça-feira/);
  assert.doesNotMatch(message, /Endereço|Ignored|Rua:/);
});

for (const blank of ['', '   ', undefined, null]) test(`optional address fields ${JSON.stringify(blank)} are omitted`, () => {
  const message = buildOrderMessage(items, { ...data, receivingMode: 'delivery', city: 'Poranga - CE',
    street: 'Principal', district: 'Centro', number: blank, complement: blank, landmark: blank });
  assert.doesNotMatch(message, /Número:|Complemento:|Ponto de referência:|undefined|null/);
  assert.match(message, /Rua: Principal\nBairro: Centro\nCidade: Poranga - CE/);
});

for (const payment of ['PIX', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro']) test(`${payment} preserves selected payment and pricing`, () => {
  const message = buildOrderMessage(items, { ...data, payment });
  assert.ok(message.includes(`*Pagamento:*\n${payment}\n\n`));
  assert.match(message, payment === 'Cartão de crédito' ? /\*Total: R\$\s200,00\*/ : /\*Total: R\$\s181,00\*/);
  assert.doesNotMatch(message, /undefined|null|Obrigada!/);
});

test('accented characters, ampersand, plus, dash, emoji and newlines survive URL encoding', () => {
  const special = 'São João & Filhos + Você — 💄';
  const message = buildOrderMessage([{ ...items[0], product: { ...items[0].product, name: special } }], { ...data, name: special });
  const url = buildWhatsAppUrl(message);
  assert.ok(url.includes('%26') && url.includes('%2B') && url.includes('%0A'));
  assert.equal(decodeURIComponent(url.split('?text=')[1]), message);
  assert.equal(new URL(url).searchParams.get('text'), message);
  assert.doesNotMatch(message, /\\n|undefined|null/);
});
