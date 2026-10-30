const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const React = require('react');
function load(file, mocks = {}) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module, exports: module.exports, process: { env: {} }, URLSearchParams, require: n => n in mocks ? mocks[n] : n === 'server-only' ? {} : n.startsWith('./') ? load('lib/catalog/' + n.slice(2) + '.ts') : require(n) });
  return module.exports;
}
const snapshot = require('./fixtures/catalog-admin.json');
const defaults = { q: '', category: '', filter: 'all', page: 1 };
function repository() {
  return load('lib/catalog/supabase-repository.ts').createCatalogRepository({ from(table) {
    let rows = snapshot[table], start = 0, end = Infinity;
    const q = { select() { return q; }, eq(k,v) { rows = rows.filter(r => r[k] === v); return q; }, ilike(k,v) { rows = rows.filter(r => String(r[k]).toLowerCase().includes(v.slice(1,-1).toLowerCase())); return q; }, or(expr) {
      const terms = [...expr.matchAll(/(name|brand)\.ilike\.%([^%]*)%/g)];
      const ids = [...expr.matchAll(/"([^"]+)"/g)].map(m => m[1]);
      rows = rows.filter(r => terms.some(([,k,t]) => String(r[k] || '').toLowerCase().includes(t.toLowerCase())) || ids.includes(r.category_id)); return q;
    }, order() { return q; }, range(a,b) { start=a;end=b;return q; }, then(resolve) { resolve({ data: rows.slice(start,end+1), count: rows.length, error:null }); } };return q;
  } });
}
for (const category of snapshot.categories) test('repository category ID / filtered count: ' + category.name, async () => {
  const result = await repository().list({ ...defaults, category: category.id });
  assert.equal(result.count, snapshot.products.filter(p => p.category_id === category.id).length);
  assert.ok(result.products.every(p => p.category_id === category.id));
});
for (const name of ['Malbec','Lily']) test('case insensitive name search: ' + name, async () => {
  const r = await repository().list({ ...defaults, q: name.toLowerCase() });
  assert.ok(r.products.length); assert.ok(r.products.every(p => p.name.toLowerCase().includes(name.toLowerCase())));
});
for (const filter of ['all','active','inactive','featured','best_seller']) test('status, count and pagination: ' + filter, async () => {
  const expected = snapshot.products.filter(p => filter==='all' || (filter==='inactive' ? !p.active : p[filter]));
  const r = await repository().list({ ...defaults, filter }); assert.equal(r.count, expected.length);
  assert.deepEqual(Array.from(r.products,p=>p.id), expected.slice(0,24).map(p=>p.id));
  const next = await repository().list({ ...defaults, filter, page:2 }); assert.equal(next.count,r.count);assert.deepEqual(Array.from(next.products,p=>p.id),expected.slice(24,48).map(p=>p.id));
});
test('search AND category, unknown category, no category',async()=>{
  const cat = snapshot.categories.find(c=>c.name==='Perfumes Masculinos');
  const r=await repository().list({...defaults,q:'Malbec',category:cat.id});assert.ok(r.count);assert.ok(r.products.every(p=>p.category_id===cat.id && /malbec/i.test(p.name)));
  assert.equal((await repository().list({...defaults,category:'nonexistent'})).count,0);
  assert.equal((await repository().list(defaults)).count,snapshot.products.length);
});
test('category change submits current form; URL changes remount controls and reset page',()=>{
  const Search=load('components/admin/catalog-search.tsx').CatalogSearch;
  const form=Search({filters:{...defaults,page:5,q:'Malbec'},categories:snapshot.categories});
  const children=React.Children.toArray(form.props.children);
  assert.equal(children.find(c=>c.props.name==='page').props.value,'1');
  const select=children.flatMap(c=>React.Children.toArray(c.props.children)).find(c=>c.type==='select');
  let submits=0;select.props.onChange({currentTarget:{form:{requestSubmit(){submits++;}}}});assert.equal(submits,1);
  assert.notEqual(form.key,Search({filters:{...defaults,q:'Lily'},categories:snapshot.categories}).key);
  assert.equal(form.props.method,'get');assert.equal(form.props.action,'/admin/produtos');
});
test('status links reset page; pagination preserves all URL filters',async()=>{
  const filters={...defaults,q:'Malbec',category:'cat-2',filter:'inactive',page:2};
  const Page=load('app/admin/(protected)/produtos/page.tsx',{
    'next/link':{default:'a'}, '@/components/admin/catalog-search':{CatalogSearch:()=>null},
    '@/lib/admin/auth':{requireAdmin:async()=>({supabase:null})},
    '@/lib/catalog/supabase-repository':{PAGE_SIZE:24,createCatalogRepository:()=>({list:async()=>({products:[{id:'qa',name:'Malbec',image:'/placeholder.svg',price:'10.00',credit_price:null,category_id:'cat-2',active:false}],count:80}),categories:async()=>snapshot.categories})},
    '@/lib/catalog/product-image':{resolveProductImage:image=>image},'@/lib/catalog/validation':load('lib/catalog/validation.ts')
  }).default;
  const html=require('react-dom/server').renderToStaticMarkup(await Page({searchParams:Promise.resolve({...filters,page:String(filters.page)})}));
  assert.equal((html.match(/<dt>/g)||[]).length,1,'null credit omitted in Admin');
  const urls=[...html.matchAll(/href="([^"]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')).filter(u=>u.includes('?')).map(u=>new URL(u,'https://test').searchParams);
  assert.ok(urls.some(p=>p.get('page')==='3'));assert.ok(urls.some(p=>p.get('filter')==='active'&&p.get('page')==='1'));
  for(const p of urls){assert.equal(p.get('q'),'Malbec');assert.equal(p.get('category'),'cat-2');}
});

