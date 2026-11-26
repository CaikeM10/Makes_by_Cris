// Isolated SSR preview of production components and CSS, with local fixtures only.
// Run after npm run build: node tests/cash-pricing-preview.cjs
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const React = require('react');
const { renderToStaticMarkup: render } = require('react-dom/server');
const { load } = require('./helpers/load-typescript.cjs');
const root = path.resolve(__dirname, '..');
const base = load('lib/data/products.ts').products[0];
const products = [
  { ...base, id: 'qa-a', name: 'Produto com nome longo para verificar alinhamento e quebra de linhas no catálogo', price: 85, cashPrice: 79.9, creditPrice: 94 },
  { ...base, id: 'qa-b', name: 'Produto antigo', price: 40, cashPrice: null, creditPrice: 44.5 },
  { ...base, id: 'qa-c', name: 'Dinheiro igual ao PIX', price: 85, cashPrice: 85, creditPrice: null },
  { ...base, id: 'qa-d', name: 'Dinheiro independente acima do PIX', price: 85, cashPrice: 89.9, creditPrice: 94 },
];
const items = products.slice(0, 2).map(product => ({ product, quantity: 1 }));
const noop = () => {};
const store = { items, subtotal: 125, bagCount: 2, isFavorite: () => false, toggleFavorite: noop, addItem: noop, updateQuantity: noop, removeItem: noop, clearBag: noop };
const mocks = {
  '@/lib/catalog/public-server': { getPublicCatalog: async () => ({ getProductBySlug: () => products[0], getCategoryName: () => 'Maquiagem', getProductsByCategory: () => products }) },
  '@/components/store-provider': { useStore: () => store },
  'next/navigation': { useRouter: () => ({ push: noop }) },
  'next/link': ({ children, ...props }) => React.createElement('a', props, children),
};
const grid = load('components/product-grid.tsx', mocks).ProductGrid;
const prices = load('components/admin/product-price-fields.tsx', mocks).ProductPriceFields;
const purchase = load('components/product-purchase.tsx', mocks).ProductPurchase;
const bag = load('app/(loja)/sacola/page.tsx', mocks).default;
const checkout = load('app/(loja)/checkout/page.tsx', mocks).default;
const productPage = load('app/(loja)/produto/[slug]/page.tsx', mocks).default;
const cssPaths = fs.readdirSync(path.join(root, '.next/static/chunks')).filter(p => p.endsWith('.css'));
const fontClasses = cssPaths.flatMap(p => [...fs.readFileSync(path.join(root, '.next/static/chunks', p), 'utf8').matchAll(/\.([\w-]+)\{--font-(?:manrope|cormorant):/g)].map(m => m[1])).join(' ');
const css = cssPaths.map(p => `<link rel="stylesheet" href="/.next/static/chunks/${p}">`).join('');
async function page(route) {
  let body;
  if (route === '/bag') body = render(React.createElement(bag));
  else if (route === '/checkout') body = render(React.createElement(checkout));
  else if (route === '/product') body = render(await productPage({ params: Promise.resolve({ slug: products[0].slug }) }));
  else body = `<main class="container-boutique py-10"><h1>Prévia isolada — preços em dinheiro</h1><div id="cards">${render(React.createElement(grid, { products }))}</div><section class="admin-root admin-form mt-8" style="min-height:0">${render(React.createElement(prices, { product: { price: '85.00', cash_price: '79.90', credit_price: '94.00' } }))}</section><section class="mt-8">${render(React.createElement(purchase, { product: products[0] }))}</section></main>`;
  return `<!doctype html><html lang="pt-BR" class="${fontClasses} bg-background"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${css}<link rel="stylesheet" href="/app/admin/admin.css"></head><body class="font-sans antialiased">${body}</body></html>`;
}
http.createServer(async (req, res) => {
  try {
    const route = new URL(req.url, 'http://localhost').pathname;
    if (['/', '/bag', '/checkout', '/product'].includes(route)) { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(await page(route)); return; }
    if (route === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const file = path.resolve(root, route.startsWith('/.next/') || route.startsWith('/app/') ? '.' + route : './public' + route);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');
    res.end(fs.readFileSync(file));
  } catch (error) { console.error(error.message); res.writeHead(500); res.end('Preview failed'); }
}).listen(3101, '127.0.0.1', () => console.log('Isolated preview: http://127.0.0.1:3101'));
