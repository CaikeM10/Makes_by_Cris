const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { load } = require('./helpers/load-typescript.cjs');
const fixture = require('./fixtures/home-public-catalog.json');
// The Home fixture omits detail/search fields; supply distinct routes and prices.
fixture.products = fixture.products.map(p => ({ ...p, slug: p.id, price: 59.9, creditPrice: 65,
  keywords: [], brand: 'Marca', shortDescription: '' }));
const { selectPublicCatalog } = load('lib/catalog/public-catalog.ts');
const { selectHomeCatalog } = load('lib/catalog/home-catalog.ts');
const { mapPublicProduct } = load('lib/catalog/mappers.ts');

test('reviewed placement preserves identity, prices, commercial categories, lookup and search', () => {
  const before = JSON.stringify(fixture);
  const publicCatalog = selectPublicCatalog(fixture);
  const home = selectHomeCatalog(fixture);
  const exclusions = [
    ['Essencial Exclusivo', 'perfumes-masculinos', null],
    ['Essencial Oud', 'perfumes-masculinos', null],
    ['Essencial Sentir', 'perfumes-masculinos', null],
    ['Deleite 400ml', 'hidratantes-corporais', null],
    ['Kaiak Tradicional', 'perfumes-masculinos', 'perfumes-femininos'],
    ['Essencial Tradicional', 'perfumes-masculinos', 'perfumes-femininos'],
  ];
  for (const [name, from, to] of exclusions) {
    const product = fixture.products.find(p => p.name === name);
    for (const catalog of [publicCatalog, home]) {
      assert.ok(!catalog.getProductsByCategory(from).some(p => p.id === product.id));
      if (to) assert.ok(catalog.getProductsByCategory(to).includes(product));
    }
    assert.equal(publicCatalog.getProductBySlug(product.slug), product);
    assert.ok(publicCatalog.searchProducts(name).includes(product));
  }
  // Every other SKU retains its existing listing, including the distinct Kaiak body splash and Deleite kit.
  for (const product of publicCatalog.products.filter(p => !exclusions.some(([name]) => p.name === name))) {
    assert.ok(home.getProductsByCategory(product.category).includes(product));
  }
  assert.equal(JSON.stringify(fixture), before);
});

test('Kit Ameixa uses a byte-identical copy of the final image; mapping changes only image', () => {
  const product = fixture.products.find(p => p.name === 'Kit Ameixa');
  const row = { ...product, category_id: product.category, short_description: product.shortDescription,
    credit_price: product.creditPrice, best_seller: product.bestSeller, gift_section: product.giftSection,
    created_at: product.createdAt };
  const category = fixture.categories.find(c => c.slug === product.category);
  const mapped = mapPublicProduct(row, category);
  const control = mapPublicProduct({ ...row, id: 'another-product' }, category);
  assert.equal(mapped.image, '/images/catalogo/presentes-femininos/kit-ameixa.png');
  assert.equal(JSON.stringify({ ...mapped, id: control.id, image: control.image }), JSON.stringify(control));
  assert.ok(fs.readFileSync('public' + mapped.image).equals(fs.readFileSync('catalog-import/final-image/presentes-femininos/kit ameixa.png')));
});

test('final masculine placement, counts and search category exclude only the three reviewed Essenciais', () => {
  const catalog = selectPublicCatalog(fixture);
  const home = selectHomeCatalog(fixture);
  const removed = ['Essencial Exclusivo', 'Essencial Oud', 'Essencial Sentir'];
  for (const name of removed) {
    const product = fixture.products.find(p => p.name === name);
    assert.ok(!home.getProductsByCategory('perfumes-masculinos').includes(product));
    assert.ok(!catalog.searchProducts('perfumes masculinos').includes(product));
    assert.ok(catalog.searchProducts(name).includes(product));
  }
  const sagaz = fixture.products.find(p => p.name === 'Homem Sagaz');
  assert.equal(home.getCategoryBySlug('perfumes-masculinos').image, sagaz.image);
  assert.equal(home.counts['perfumes-masculinos'], home.getProductsByCategory('perfumes-masculinos').length);
});

test('Zaad and Deleite use byte-identical real images and preserve every commercial field', () => {
  for (const [name, image, source] of [
    ['Eau de Parfum Zaad Tradicional', '/images/catalogo/perfumes-masculinos/zaad-eau-tradicional.png', 'catalog-import/final-image/perfumes-masculinos/zaad_eau_tradicional.png'],
    ['Deleite 400ml', '/images/catalogo/hidratantes-corporais/deleite400ml.png', 'catalog-import/final-image/hidratantes-corporais/deleite400ml.png'],
  ]) {
    const product = fixture.products.find(p => p.name === name);
    const category = fixture.categories.find(c => c.slug === product.category);
    const row = { ...product, category_id: category.id, short_description: product.shortDescription,
      credit_price: product.creditPrice, best_seller: product.bestSeller, gift_section: product.giftSection,
      created_at: product.createdAt };
    const mapped = mapPublicProduct(row, category);
    const control = mapPublicProduct({ ...row, id: 'control' }, category);
    assert.equal(mapped.image, image);
    assert.equal(JSON.stringify({ ...mapped, id: control.id, image: control.image }), JSON.stringify(control));
    assert.ok(fs.readFileSync('public' + image).equals(fs.readFileSync(source)));
  }
});
