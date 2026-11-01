const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const React=require('react');
const {renderToStaticMarkup:render}=require('react-dom/server');
const {load}=require('./helpers/load-typescript.cjs');
const model=load('lib/campaigns/model.ts');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
const desktop=`campaigns/${A}/desktop/${B}.webp`,mobile=`campaigns/${A}/mobile/${B}.webp`;
const campaign={id:A,name:'Campanha QA',slug:'campanha-qa',title:'Um presente especial',description:'Seleção da Cris',button_text:'Ver seleção',desktop_image_path:desktop,mobile_image_path:mobile,active:true,created_at:'2026-10-30',updated_at:'2026-10-30'};
const fixture=require('./fixtures/home-public-catalog.json');
const products=fixture.products.slice(0,3);
const uiMocks={
  '@/components/link-button':{LinkButton:({children,href,...props})=>React.createElement('a',{href,...props},children)},
};
const {HomeHero}=load('components/home-hero.tsx',uiMocks);
const banner={...campaign,desktopUrl:'https://example.com/desktop.webp',mobileUrl:'https://example.com/mobile.webp'};
for(const value of [undefined,null,{...banner,active:false}])test(`no active campaign means permanent default Hero (${value?.active})`,()=>{
  const html=render(React.createElement(HomeHero,{campaign:value}));assert.match(html,/banner-editorial.png/);assert.match(html,/href="\/categorias"/);assert.doesNotMatch(html,/campanha-qa/);
});
test('active campaign replaces default, CTA leads to exclusive selection',()=>{
  const html=render(React.createElement(HomeHero,{campaign:banner}));assert.match(html,/href="\/campanha\/campanha-qa"/);assert.match(html,/Um presente especial/);assert.doesNotMatch(html,/banner-editorial.png/);
});
test('desktop and mobile art use independent picture sources and compact mobile ratio',()=>{
  const html=render(React.createElement(HomeHero,{campaign:banner}));assert.match(html,/<source media="\(max-width: 767px\)" srcSet="https:\/\/example.com\/mobile.webp"/);assert.match(html,/<img src="https:\/\/example.com\/desktop.webp"/);assert.ok(html.includes('aspect-[3/2]'));
});
test('default composition keeps accessible image, complete copy and high priority',()=>{
  const html=render(React.createElement(HomeHero));assert.match(html,/fetchPriority="high"/);assert.match(html,/alt="Modelo segurando/);assert.match(html,/Perfumes, presentes e cuidados/);assert.doesNotMatch(html,/object-\[68%|h-20|skincare/);
});
test('campaign with missing desktop falls back to default rather than broken art',()=>{
  assert.match(render(React.createElement(HomeHero,{campaign:{...banner,desktopUrl:''}})),/banner-editorial.png/);
});
test('legacy missing mobile has a safe desktop fallback',()=>{
  const html=render(React.createElement(HomeHero,{campaign:{...banner,mobileUrl:''}}));assert.match(html,/<source[^>]*desktop.webp/);
});
test('image path parser accepts independent slots and rejects foreign/traversal paths',()=>{
  for(const p of [desktop,mobile])assert.equal(model.isCampaignImagePath(p),true);
  for(const p of ['',`products/${A}/${B}.webp`,desktop+'\n',desktop.replace('desktop','../desktop'),desktop.replace(B,'not-a-uuid'),desktop.replace('.webp','.svg')])assert.equal(model.isCampaignImagePath(p),false,p);
});
test('eligible options exclude inactive, unavailable, legacy mocks and Admin1',()=>{
  assert.ok(model.eligibleCampaignProduct(products[0]));
  for(const patch of [{active:false},{available:false},{id:'p-01'},{name:'Produto Teste Admin1'}])assert.equal(model.eligibleCampaignProduct({...products[0],...patch}),false);
});
test('campaign validation requires fields, valid slug, no duplicate IDs and nonempty active selection',()=>{
  assert.deepEqual(Object.keys(model.validateCampaign(campaign,[products[0].id],true).errors),[]);
  for(const [input,ids,active] of [[{...campaign,title:''},[],false],[{...campaign,slug:'unsafe?x'},[],false],[campaign,[A,A],false],[campaign,[],true]])assert.ok(Object.keys(model.validateCampaign(input,ids,active).errors).length);
});

function repository(c=campaign,rows=products){
  const calls=[];
  const client={calls,from(table){assert.equal(table,'campaigns');return{select(){return this},eq(k,v){calls.push([k,v]);return this},async maybeSingle(){return{data:c?{...c,campaign_products:[{product_id:rows[1]?.id,position:0},{product_id:rows[0]?.id,position:1}]}:null,error:null}}}},
    storage:{from(bucket){assert.equal(bucket,'campaign-banners');return{async createSignedUrls(paths){return{data:paths.map(path=>({path,signedUrl:'https://example.com/'+path})),error:null}}}}}};
  const api=load('lib/campaigns/repository.ts',{'@/lib/catalog/public-repository':{readPublicCatalog:async()=>({products:rows,categories:fixture.categories})}});
  return{client,api};
}
test('public selection includes only related products in stored order',async()=>{
  const {client,api}=repository();const result=await api.readPublicCampaign(client,'campanha-qa');assert.deepEqual(Array.from(result.products.map(p=>p.id)),[products[1].id,products[0].id]);assert.ok(client.calls.some(([k,v])=>k==='active'&&v===true));
});
test('inactive campaign is never returned publicly even with a broad admin client',async()=>{
  const {client,api}=repository({...campaign,active:false});assert.equal(await api.readPublicCampaign(client),null);
});
test('later inactive or unavailable associated products are filtered',async()=>{
  for(const patch of [{active:false},{available:false}]){const rows=[{...products[0],...patch},products[1],products[2]];const {client,api}=repository(campaign,rows);assert.equal((await api.readPublicCampaign(client)).products.length,1);}
});
test('empty active selection falls back safely',async()=>{
  const {client,api}=repository(campaign,products.map(p=>({...p,active:false})));assert.equal(await api.readPublicCampaign(client),null);
});
test('campaign page reuses existing grid and inactive URL returns notFound',async()=>{
  const mocks={'@/lib/campaigns/public-server':{getPublicCampaign:async()=>({campaign:banner,products})},'@/components/product-grid':{ProductGrid:({products})=>React.createElement('div',{'data-count':products.length})},'next/navigation':{notFound:()=>{throw Error('notFound')}}};
  const Page=load('app/(loja)/campanha/[slug]/page.tsx',mocks).default;assert.match(render(await Page({params:Promise.resolve({slug:campaign.slug})})),/data-count="3"/);
  const Missing=load('app/(loja)/campanha/[slug]/page.tsx',{...mocks,'@/lib/campaigns/public-server':{getPublicCampaign:async()=>null}}).default;await assert.rejects(Missing({params:Promise.resolve({slug:campaign.slug})}),/notFound/);
});

const {validateCampaignUpload,persistCampaign}=load('lib/campaigns/save.ts');
for(const [name,type,bytes] of [['bad.svg','image/svg+xml','<svg/>'],['bad.png','image/png','not an image'],['bad.webp','image/jpeg','\xff\xd8\xff000000000']])test(`invalid upload rejected: ${name}/${type}`,async()=>assert.ok(await validateCampaignUpload(new File([bytes],name,{type}))));
test('valid WebP signature accepted, oversized upload rejected',async()=>{
  assert.equal(await validateCampaignUpload(new File(['RIFF0000WEBPtest'],'art.webp',{type:'image/webp'})),undefined);
  assert.ok(await validateCampaignUpload(new File([new Uint8Array(5*1024*1024+1)],'big.png',{type:'image/png'})));
});
function saveSetup(fail=false){
  const events=[];const mock={storage:{from(bucket){assert.equal(bucket,'campaign-banners');return{async upload(path,file,options){events.push('upload');assert.equal(options.upsert,false);return{}},async remove(paths){events.push('cleanup');return{}}}}},async rpc(name,args){events.push('rpc');assert.equal(name,'save_campaign');assert.equal(args.p_product_ids.length,1);return{error:fail?{code:'23505'}:null}}};
  const api=load('lib/campaigns/save.ts',{'./repository':{getCampaign:async()=>null,campaignProductOptions:async()=>({products:[products[0]]})}});
  const form=new FormData();for(const key of ['name','slug','title','description','button_text'])form.set(key,campaign[key]);form.append('product_ids',products[0].id);form.set('active','on');
  form.set('desktop',new File(['RIFF0000WEBPtest'],'desktop.webp',{type:'image/webp'}));form.set('mobile',new File(['RIFF0000WEBPtest'],'mobile.webp',{type:'image/webp'}));
  return{api,mock,events,form};
}
test('upload both arts first, then atomically persist campaign; never mutate products',async()=>{
  const {api,mock,events,form}=saveSetup();assert.ok((await api.persistCampaign(mock,null,null,form)).id);assert.deepEqual(events,['upload','upload','rpc']);
});
for(const slot of ['desktop','mobile'])test(`activation without ${slot} is rejected before upload`,async()=>{
  const {api,mock,events,form}=saveSetup();form.delete(slot);assert.ok((await api.persistCampaign(mock,null,null,form)).errors[slot]);assert.equal(events.length,0);
});
test('failed persistence cleans only freshly uploaded campaign images',async()=>{
  const {api,mock,events,form}=saveSetup(true);assert.ok((await api.persistCampaign(mock,null,null,form)).error);assert.deepEqual(events,['upload','upload','rpc','cleanup']);
});
test('admin actions require authorization before storage or RPC',async()=>{
  const api=load('app/admin/(protected)/campanhas/actions.ts',{'@/lib/admin/auth':{requireAdmin:async()=>{throw Error('denied')}},'next/cache':{revalidatePath(){}},'next/navigation':{redirect(){} }});
  await assert.rejects(api.saveCampaign(null,null,{},new FormData()),/denied/);await assert.rejects(api.changeCampaign(A,'version','activate',{}),/denied/);
});
test('migration guarantees a single active campaign and narrowly grants only authenticated RPC writes',()=>{
  const sql=fs.readFileSync('supabase/migrations/202610310001_seasonal_campaigns.sql','utf8');assert.match(sql,/unique index if not exists campaigns_one_active/);assert.match(sql,/pg_advisory_xact_lock/);assert.match(sql,/set active=false where active and id<>p_id/);assert.match(sql,/from public,anon/);assert.doesNotMatch(sql,/update public.products|delete from public.products|insert into public.products/i);
});

function formHarness(existing=false){
  const values=[];let cursor=0;
  const mockReact={...React,useActionState:()=>[{},()=>{},false],useState:initial=>{
    const i=cursor++;if(!(i in values))values[i]=typeof initial==='function'?initial():initial;
    return[values[i],next=>{values[i]=typeof next==='function'?next(values[i]):next;}];
  }};
  const {CampaignForm}=load('components/admin/campaign-form.tsx',{
    react:mockReact,'@/app/admin/(protected)/campanhas/actions':{saveCampaign(){}},
  });
  const props={products:products.map(p=>({...p,price:10})),categories:fixture.categories,
    ...(existing?{campaign:{...campaign,productIds:[products[0].id]},images:banner}:{})};
  const draw=()=>{cursor=0;return CampaignForm(props);};
  const nodes=value=>Array.isArray(value)?value.flatMap(nodes):React.isValidElement(value)?[value,...nodes(value.props.children)]:[];
  return{draw:()=>nodes(draw())};
}
test('product picker selects/deselects, searches by name and preserves selection order with up/down',()=>{
  const h=formHarness();let nodes=h.draw();
  let boxes=nodes.filter(n=>n.props.type==='checkbox'&&!n.props.name);boxes[0].props.onChange({target:{checked:true}});
  nodes=h.draw();boxes=nodes.filter(n=>n.props.type==='checkbox'&&!n.props.name);boxes[1].props.onChange({target:{checked:true}});
  nodes=h.draw();nodes.find(n=>n.props['aria-label']===`Subir ${products[1].name}`).props.onClick();
  nodes=h.draw();assert.deepEqual(Array.from(nodes.filter(n=>n.props.name==='product_ids').map(n=>n.props.value)),[products[1].id,products[0].id]);
  nodes.find(n=>n.props.id==='campaign-search').props.onChange({target:{value:products[1].name.toUpperCase()}});
  nodes=h.draw();boxes=nodes.filter(n=>n.props.type==='checkbox'&&!n.props.name);assert.equal(boxes.length,1);boxes[0].props.onChange({target:{checked:false}});
  nodes=h.draw();assert.deepEqual(Array.from(nodes.filter(n=>n.props.name==='product_ids').map(n=>n.props.value)),[products[0].id]);
});
test('editor activation becomes unavailable when the last selected product is removed',()=>{
  const h=formHarness(true);let nodes=h.draw();assert.equal(nodes.find(n=>n.props.name==='active').props.checked,true);
  nodes.find(n=>n.props.type==='checkbox'&&!n.props.name).props.onChange({target:{checked:false}});
  nodes=h.draw();const active=nodes.find(n=>n.props.name==='active');assert.equal(active.props.checked,false);assert.equal(active.props.disabled,true);
});
test('campaign sidebar destination is active throughout campaign editing',()=>{
  const {AdminNavigation}=load('components/admin/admin-navigation.tsx',{'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},'next/navigation':{usePathname:()=>`/admin/campanhas/${A}/editar`}});
  assert.match(render(React.createElement(AdminNavigation)),/href="\/admin\/campanhas" aria-current="page">Campanhas/);
});


test('campaign copy keeps the existing validation limits and rejects descriptions above the limit',()=>{
  assert.ok(model.validateCampaign({...campaign,description:'x'.repeat(2001)},[],false).errors.description);
  assert.equal(model.validateCampaign({...campaign,description:'x'.repeat(2000)},[],false).errors.description,undefined);
});

test('Admin copy explains compact artwork, visual truncation and complete campaign content',()=>{
  const source=fs.readFileSync('components/admin/campaign-form.tsx','utf8');
  assert.ok(source.includes('1080 \u00d7 720 (3:2)'));
  assert.ok(!source.includes('1350'));
  assert.ok(source.includes('retic\u00eancias'));
});
