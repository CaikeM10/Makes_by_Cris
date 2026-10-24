// Static render of the real components with isolated server boundaries.
// No authentication bypass or fixture route is added to the application.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, URLSearchParams, require(name) {
    if (name === 'react') return { ...React, useActionState: () => [{}, () => {}, false] };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'next/link') return { default: ({ children, href, ...props }) => React.createElement('a', { href, ...props }, children) };
    if (name === '@/lib/admin/auth') return { requireAdmin: async () => ({ supabase: {} }) };
    if (name.endsWith('/produtos/actions')) return { saveProduct() {} };
    if (name === '@/lib/catalog/supabase-repository') return { PAGE_SIZE: 24, createCatalogRepository: () => ({ list: async () => ({ products, count: products.length }), categories: async () => categories }) };
    if (name.startsWith('@/')) return load(name.slice(2) + (name.includes('components/') ? '.tsx' : '.ts'));
    if (name.startsWith('./')) return load(path.join(path.dirname(file), name) + (name.includes('product-') ? '.tsx' : '.ts'));
    throw Error(name);
  } });
  return cache[file] = module.exports;
}
const { categories } = load('lib/data/categories.ts');
const legacy = load('lib/data/products.ts').products;
const products = legacy.map(p => ({ ...p, image: 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'public', p.image)).toString('base64'), short_description: p.shortDescription, credit_price: p.creditPrice.toFixed(2), price: p.price.toFixed(2), category_id: categories.find(c => c.slug === p.category).id, best_seller: p.bestSeller, gift_section: false, updated_at: '2026-10-23T00:00:00Z' }));
async function main() {
  const list = await load('app/admin/(protected)/produtos/page.tsx').default({ searchParams: Promise.resolve({}) });
  const form = React.createElement(load('components/admin/product-form.tsx').ProductForm, { product: products[20], categories });
  const css = fs.readFileSync(path.join(root, 'app/admin/admin.css'), 'utf8');
  const out = path.join(root, '.next/catalog-responsive');
  fs.mkdirSync(out, { recursive: true });
  for (const [name, component] of [['list', list], ['edit', form]]) {
    const html = '<!doctype html><meta charset="utf-8"><style>:root{--font-manrope:Arial;--font-cormorant:Georgia}*{box-sizing:border-box}body{margin:0}a{color:inherit;text-decoration:none}button,input,select,textarea{font:inherit}img{max-width:100%;display:block}fieldset{margin:0}h1,h2,p,dl,dd{margin:0}' + css + '</style><body><div class="admin-root"><div class="admin-shell"><aside class="admin-sidebar">Editor do Catálogo</aside><main class="admin-main">' + renderToStaticMarkup(component) + '</main></div></div><script>document.body.dataset.overflow=String(document.documentElement.scrollWidth>innerWidth);document.body.dataset.width=innerWidth</script>';
    fs.writeFileSync(path.join(out, name + '.html'), html);
    for (const width of [1440, 1024, 768, 390]) {
      fs.writeFileSync(path.join(out, `frame-${name}-${width}.html`), `<body style="margin:0"><iframe style="border:0;width:${width}px;height:1000px" src="${name}.html" onload="document.body.dataset.result=this.contentDocument.body.dataset.overflow;document.body.dataset.width=this.contentWindow.innerWidth"></iframe>`);
    }
  }
  console.log(out);
}
main().catch(e => { console.error(e); process.exitCode = 1; });
