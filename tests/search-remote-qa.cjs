// GET/HEAD only: validates current public data without changing any catalog record.
const fs=require('node:fs'),assert=require('node:assert/strict'),{parseEnv}=require('node:util');
const {createClient}=require('@supabase/supabase-js');
const {load}=require('./helpers/load-typescript.cjs');
const env=parseEnv(fs.readFileSync('.env.local','utf8'));
const network={reads:0,writes:0};
const transport=async(input,options={})=>{assert.ok(['GET','HEAD'].includes((options.method||'GET').toUpperCase()));network.reads++;return fetch(input,{...options,signal:AbortSignal.timeout(30000)});};
const client=key=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}});
async function main(){
 const service=client(env.SUPABASE_SERVICE_ROLE_KEY),anon=client(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 const snapshot=async()=>{const rows=await Promise.all(['products','categories'].map(t=>service.from(t).select('*').order('id')));rows.forEach(r=>assert.ifError(r.error));return rows.map(r=>r.data);};
 const before=await snapshot();
 const {readPublicCatalog}=load('lib/catalog/public-repository.ts',{},env);const catalog=await readPublicCatalog(anon);
 const {selectHomeCatalog}=load('lib/catalog/home-catalog.ts',{},env);
 const {selectSearchCatalog}=load('lib/catalog/search-catalog.ts',{},env);
 const {isHomeImageAvailable}=load('lib/catalog/home-server.ts',{'./public-server':{}},env);
 const valid=new Set();for(const c of catalog.categories)if(await isHomeImageAvailable(c.image))valid.add(c.image);
 const home=selectHomeCatalog(catalog,valid),search=selectSearchCatalog(home);
 assert.equal(search.products.length,69);assert.equal(search.categories.length,8);
 assert.equal(JSON.stringify(search.categories),JSON.stringify(home.categories));assert.equal(JSON.stringify(search.counts),JSON.stringify(home.counts));
 const realIds=new Set(require('../catalog-import/post-cutover-snapshot-v2.json').realProducts.map(p=>p.id));
 const queries=[];
 for(const term of ['Lily','Malbec','Eico','Kaiak','Floratta','Hidratante','Kit','Ilia','batom','base','skincare','pincéis']){
  const products=search.searchProducts(term);assert.ok(products.every(p=>realIds.has(p.id)&&p.active&&p.available));
  if(['batom','base','skincare','pincéis'].includes(term))assert.equal(products.length,0,term);else assert.ok(products.length>0,term);
  queries.push({term,count:products.length,products:products.map(p=>({id:p.id,name:p.name,slug:p.slug}))});
 }
 const categories=[];
 for(const c of search.categories){const response=await transport(c.image);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith('image/'));assert.ok((await response.arrayBuffer()).byteLength>0);categories.push({id:c.id,slug:c.slug,name:c.name,image:c.image,count:search.counts[c.slug],http:response.status});}
 assert.deepEqual(await snapshot(),before);
 const report={publicProducts:search.products.length,categories,suggestions:Array.from(search.suggestions),queries,synchronizedWithHome:true,productsAndCategoriesIntact:true,network};
 fs.writeFileSync('catalog-import/search-remote-qa.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,queries:queries.map(q=>({term:q.term,count:q.count}))},null,2));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
