const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, process: { env: {} }, require(name) {
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
    if (name.startsWith('./')) return load(path.join(path.dirname(file), name) + '.ts');
    throw Error(name);
  } });
  return module.exports;
}
const { validateCheckout, fulfillmentLocations } = load('lib/fulfillment.ts');
const { buildOrderMessage, buildWhatsAppUrl } = load('lib/whatsapp.ts');
const { getCartTotal } = load('lib/pricing.ts');
const data = { name: 'Cliente Teste', whatsapp: '88999999999', payment: 'PIX', receivingMode: 'store-pickup', city: '', street: '', district: '', number: '', complement: '', landmark: '' };
const items = [{ product: { id: 'teste', name: 'Produto', price: 10, creditPrice: 12 }, quantity: 2 }];
const errors = overrides => validateCheckout({ ...data, ...overrides });
const message = overrides => buildOrderMessage(items, { ...data, ...overrides });

test('retirada não exige cidade nem endereço e identifica sede sem endereço residencial', () => {
  assert.equal(Object.keys(errors({})).length, 0);
  const text = message({ city: 'Poranga - CE', street: 'Rua oculta', district: 'Bairro oculto', number: '123' });
  assert.match(text, /Forma de recebimento:\* Retirada na loja/);
  assert.match(text, /Local:\* Makes by Cris Martins — Poranga - CE/);
  assert.doesNotMatch(text, /Rua oculta|Bairro oculto|123|Cidade:|CEP/);
});
test('entrega exige cidade atendida', () => {
  for (const city of ['', 'Não atendida']) assert.equal(errors({ receivingMode: 'delivery', city }).city, 'Selecione uma cidade atendida.');
});
test('Poranga exige especificamente Rua e Bairro com mensagens próprias', () => {
  const delivery = { receivingMode: 'delivery', city: 'Poranga - CE' };
  assert.equal(errors({ ...delivery, street: ' ', district: 'Centro' }).street, 'Informe a rua para entrega.');
  assert.equal(errors({ ...delivery, street: 'Principal', district: ' ' }).district, 'Informe o bairro para entrega.');
  assert.equal(Object.keys(errors({ ...delivery, street: 'Principal', district: 'Centro' })).length, 0);
});
test('opcionais vazios são omitidos e preenchidos são incluídos; CEP ausente', () => {
  const delivery = { receivingMode: 'delivery', city: 'Poranga - CE', street: 'Principal', district: 'Centro' };
  const text = message(delivery);
  assert.match(text, /Forma de recebimento:\* Entrega/);
  assert.match(text, /Cidade:\* Poranga - CE/);
  assert.match(text, /Rua:\* Principal/); assert.match(text, /Bairro:\* Centro/);
  assert.doesNotMatch(text, /Número|Complemento|referência|CEP/);
  const full = message({ ...delivery, number: '12', complement: 'Casa', landmark: 'Praça' });
  for (const value of ['Número:* 12', 'Complemento:* Casa', 'Ponto de referência:* Praça']) assert.ok(full.includes(value));
  assert.doesNotMatch(message({ ...delivery, number: ' ', complement: ' ', landmark: ' ' }), /Número|Complemento|referência/);
});
test('Entrega → Retirada ignora erros ocultos e mantém dados para voltar', () => {
  const delivery = { ...data, receivingMode: 'delivery', city: 'Poranga - CE', street: 'Principal' };
  assert.ok(validateCheckout(delivery).district);
  const pickup = { ...delivery, receivingMode: 'store-pickup' };
  assert.equal(Object.keys(validateCheckout(pickup)).length, 0);
  assert.doesNotMatch(buildOrderMessage(items, pickup), /Principal|Rua:/);
  assert.equal(pickup.street, 'Principal');
  assert.ok(validateCheckout({ ...pickup, receivingMode: 'delivery' }).district);
});
test('demais cidades preservam todos os locais e dias sem exigir endereço', () => {
  const expected = [
    ['Ararendá - CE', 'Makes by Cris Martins', undefined],
    ['Crateús - CE', 'Mary Baby', 'Terça-feira'],
    ['Ipaporanga - CE', 'Farmácia do Trabalhador BR', 'Terça-feira'],
    ['Ipueiras - CE', 'Izzibida Acessórios', 'Quinta-feira'],
    ['Nova Russas - CE', 'Mundo da Moda', 'Sábado'],
  ];
  assert.equal(fulfillmentLocations.length, 6);
  for (const [city, local, day] of expected) {
    const overrides = { receivingMode: 'delivery', city };
    assert.equal(Object.keys(errors(overrides)).length, 0);
    const text = message({ ...overrides, street: 'Oculta' });
    assert.ok(text.includes(city)); assert.ok(text.includes(local));
    if (day) assert.ok(text.includes(day)); else assert.doesNotMatch(text, /Dia:/);
    assert.doesNotMatch(text, /Oculta|Rua:|Bairro:|CEP/);
  }
});
test('preços PIX, dinheiro, débito e crédito e totais da mensagem preservados', () => {
  for (const payment of ['PIX', 'Dinheiro', 'Cartão de débito', 'Cartão de crédito']) {
    const total = payment === 'Cartão de crédito' ? 24 : 20;
    assert.equal(getCartTotal(items, payment), total);
    assert.ok(message({ payment }).includes(total + ',00'));
    assert.equal(Object.keys(errors({ payment })).length, 0);
  }
});
test('WhatsApp oficial centralizado e texto codificado', () => {
  const text = message({});
  const url = new URL(buildWhatsAppUrl(text));
  assert.equal(url.pathname, '/558896803746');
  assert.equal(url.searchParams.get('text'), text);
});
test('checkout remove CEP e usa validador central e campos condicionais', () => {
  const source = fs.readFileSync(path.join(root, 'app/(loja)/checkout/page.tsx'), 'utf8');
  assert.doesNotMatch(source, /\bcep\b|CEP|maskCep/);
  assert.ok(source.includes('validateCheckout(data)'));
  assert.ok(source.includes('data.receivingMode === "delivery" && ('));
  assert.ok(source.includes('{isDelivery && ('));
});
