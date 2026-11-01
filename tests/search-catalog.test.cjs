const {test}=require('node:test');
const assert=require('node:assert/strict');
const React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const {load}=require('./helpers/load-typescript.cjs');
const fixture=require('./fixtures/home-public-catalog.json');
const fields=require('./fixtures/search-product-fields.json');
const products=fixture.products.map(p=>({...p,...fields[p.id]}));
const {selectHomeCatalog}=load('lib/catalog/home-catalog.ts');
const {selectSearchCatalog,SEARCH_PAGE_SIZE}=load('lib/catalog/search-catalog.ts');
const home=selectHomeCatalog({...fixture,products});
const search=selectSearchCatalog(home);
const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const realIds=new Set(products.map(p=>p.id));

test('all 69 actual public products and eight populated categories are searchable',()=>{
 assert.equal(search.products.length,69);assert.equal(search.categories.length,8);
 assert.equal(Object.values(search.counts).reduce((a,b)=>a+b,0),69);
 assert.ok(search.products.every(p=>p.active&&p.available&&realIds.has(p.id)));
});
test('categories reuse the exact Home objects, images, slugs and counts',()=>{
 assert.equal(JSON.stringify(search.categories),JSON.stringify(home.categories));
 assert.equal(JSON.stringify(search.counts),JSON.stringify(home.counts));
 for(let i=0;i<search.categories.length;i++)assert.equal(search.categories[i],home.categories[i]);
});
test('empty query has no fake results and yields at most six real deterministic suggestions',()=>{
 assert.equal(search.searchProducts('').length,0);assert.equal(search.searchCategories(' ').length,0);
 assert.ok(search.suggestions.length>0&&search.suggestions.length<=6);
 for(const term of search.suggestions)assert.ok(search.searchProducts(term).length>0,term);
 assert.equal(JSON.stringify(search.suggestions),JSON.stringify(selectSearchCatalog(home).suggestions));
});
for(const term of ['batom','base','skincare','pincéis'])test(`obsolete term ${term} is neither suggested nor returned`,()=>{
 assert.equal(search.searchProducts(term).length,0);assert.equal(search.searchCategories(term).length,0);
 assert.ok(!search.suggestions.some(t=>normalize(t)===normalize(term)));
});
for(const term of ['Lily','Malbec','Eico','Kaiak','Floratta','Hidratante','Kit','Ilia'])test(`real catalog query ${term} returns only public real products`,()=>{
 const rows=search.searchProducts(term);assert.ok(rows.length>0,term);assert.ok(rows.every(p=>realIds.has(p.id)));
});
test('accent-insensitive search preserves original Ilía names',()=>{
 const rows=search.searchProducts('ilia');assert.ok(rows.some(p=>p.name.includes('Ilía')));
 assert.equal(JSON.stringify(rows.map(p=>p.id)),JSON.stringify(search.searchProducts('ILÍA').map(p=>p.id)));
});
test('case and extra spaces do not affect matching multiword names',()=>{
 const ids=q=>JSON.stringify(search.searchProducts(q).map(p=>p.id));assert.equal(ids('  EGEO   cHoC  '),ids('egeo choc'));
 assert.ok(search.searchProducts('egeo choc').some(p=>p.name==='Egeo Choc 90ml'));
 assert.ok(search.searchProducts('egeo choc').some(p=>p.name==='Kit Egeo Choc'));
});
test('brand, category and short description can be searched without a long description',()=>{
 const p={...products[0],name:'Produto neutro',brand:'Marca Única',shortDescription:'Cuidado delicado',description:null,keywords:[]};
 const view=selectSearchCatalog({...home,products:[p]});
 for(const term of ['marca unica','cuidado delicado',home.categories.find(c=>c.slug===p.category).name])assert.equal(view.searchProducts(term).length,1);
});
test('inactive, unavailable, mock and Admin1 entries are excluded even in a broad snapshot',()=>{
 const sample=products[0];const bad=[{...sample,id:'p-01',name:'Mock'},{...sample,id:'55555555-5555-4555-8555-555555555555',name:'Produto Teste Admin1'},
 {...sample,id:'66666666-6666-4666-8666-666666666666',active:false},{...sample,id:'77777777-7777-4777-8777-777777777777',available:false}];
 const view=selectSearchCatalog({...home,products:[...products,...bad]});assert.equal(view.products.length,products.length);
 assert.equal(view.searchProducts('Mock').length,0);assert.equal(view.searchProducts('Admin1').length,0);
});
test('zero-product categories and a completely empty catalog never fall back to mocks',()=>{
 for(const slug of ['maquiagem','perfumes','skincare','acessorios'])assert.ok(!search.categories.some(c=>c.slug===slug));
 const empty=selectSearchCatalog({products:[],categories:home.categories});assert.equal(empty.categories.length,0);assert.equal(empty.suggestions.length,0);assert.equal(empty.searchProducts('Lily').length,0);
});
test('nonexistent term returns zero results without fallback',()=>assert.equal(search.searchProducts('nãoexiste-123xyz').length,0));

function overlay(query=''){
 let cursor=0;const values=[query,SEARCH_PAGE_SIZE];const closed=[];
 const triggerRef={current:null};
 const mockReact={...React,useState:initial=>{const i=cursor++;if(!(i in values))values[i]=initial;return[values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next}]},useEffect(){},useRef:()=>({current:null}),useMemo:fn=>fn(),useDeferredValue:value=>value};
 const Box=({children,...props})=>React.createElement('div',props,children);
 const {SearchOverlay}=load('components/search-overlay.tsx',{
 react:mockReact,'@/components/catalog-provider':{useCatalog:()=>({search})},
 'next/link':{__esModule:true,default:({children,prefetch,...props})=>React.createElement('a',props,children)},
 '@/components/ui/dialog':{Dialog:({children})=>children,DialogContent:({children,showCloseButton,initialFocus,finalFocus,...props})=>React.createElement('div',props,children),DialogTitle:Box},
 });
 const nodes=value=>Array.isArray(value)?value.flatMap(nodes):React.isValidElement(value)?[value,...nodes(value.props.children)]:[];
 const draw=()=>{cursor=0;return SearchOverlay({open:true,onOpenChange:value=>closed.push(value),returnFocus:triggerRef})};
 return{draw,nodes,closed,values,triggerRef};
}
test('empty overlay shows Suggestions and resolved category images/counts, never random product results',()=>{
 const h=overlay();const html=render(h.draw());assert.match(html,/Sugestões/);assert.doesNotMatch(html,/Buscas frequentes|href="\/produto\//);
 for(const c of search.categories){assert.ok(html.includes(`href="/categoria/${c.slug}"`));assert.ok(html.includes(`src="${c.image}"`));assert.ok(html.includes(`${search.counts[c.slug]} produtos`));}
});
test('product links target existing slugs and close the drawer',()=>{
 const h=overlay('Lily');const nodes=h.nodes(h.draw());const links=nodes.filter(n=>typeof n.props.href==='string'&&n.props.href.startsWith('/produto/'));
 assert.ok(links.length>0);assert.ok(links.every(n=>search.searchProducts('Lily').some(p=>n.props.href===`/produto/${p.slug}`)));
 links[0].props.onClick();assert.deepEqual(h.closed,[false]);
});
test('category links target existing slugs and close the drawer',()=>{
 const h=overlay();const links=h.nodes(h.draw()).filter(n=>n.props.href?.startsWith('/categoria/'));
 assert.equal(links.length,search.categories.length);links[0].props.onClick();assert.deepEqual(h.closed,[false]);
});
test('drawer initially limits results to six and expands only on explicit request',()=>{
 const h=overlay('Kit');let nodes=h.nodes(h.draw());assert.equal(nodes.filter(n=>n.props.href?.startsWith('/produto/')).length,6);
 nodes.find(n=>n.type==='button'&&n.props.children?.[0]==='Mostrar mais resultados (').props.onClick();
 nodes=h.nodes(h.draw());assert.equal(nodes.filter(n=>n.props.href?.startsWith('/produto/')).length,12);
});
test('empty result is friendly and contains no product fallback',()=>{
 const h=overlay('nãotemxyz');const html=render(h.draw());assert.match(html,/Nenhum produto encontrado para/);assert.doesNotMatch(html,/href="\/produto\//);
});
test('dialog owns initial focus and restores focus explicitly to its opener',()=>{
 const h=overlay();const content=h.nodes(h.draw()).find(n=>n.props.initialFocus);
 assert.ok(content.props.initialFocus);assert.equal(content.props.finalFocus,h.triggerRef);
 assert.ok(!h.nodes(h.draw()).some(n=>n.type==='input'&&n.props.autoFocus));
});
test('suggestion chips apply a term from the current catalog',()=>{
 const h=overlay();const button=h.nodes(h.draw()).find(n=>n.type==='button'&&n.props.children===search.suggestions[0]);
 button.props.onClick();assert.equal(h.values[0],search.suggestions[0]);
 assert.ok(search.searchProducts(h.values[0]).length>0);
});
test('search snapshot is resolved separately without changing the existing cart catalog',()=>{
 const module=load('components/catalog-provider.tsx');let observed;
 function Probe(){observed=module.useCatalog();return null;}
 const unavailable={...products[0],id:'88888888-8888-4888-8888-888888888888',available:false};
 render(React.createElement(module.CatalogProvider,{catalog:{categories:fixture.categories,products:[...products,unavailable]},searchCatalog:home},React.createElement(Probe)));
 assert.equal(observed.products.length,products.length+1);assert.equal(observed.search.products.length,products.length);
 assert.ok(observed.getProductById(unavailable.id));assert.ok(!observed.search.getProductById(unavailable.id));
});
