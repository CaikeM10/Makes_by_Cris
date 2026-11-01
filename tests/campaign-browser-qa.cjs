// Fixtures only: renders actual components/CSS in an isolated HTTP harness.
// Never creates a campaign or uploads an object in production.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const React=require('react'),{renderToStaticMarkup:render}=require('react-dom/server');
const {load}=require('./helpers/load-typescript.cjs'),{openEdge}=require('./helpers/edge-cdp.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'catalog-import');
const base=JSON.parse(fs.readFileSync(path.join(out,'post-cutover-snapshot-v2.json'),'utf8'));
const {mapPublicProduct}=load('lib/catalog/mappers.ts',{}, {NEXT_PUBLIC_SUPABASE_URL:'https://dunqpuowfdvmnzpiecmb.supabase.co'});
const products=base.realProducts.slice(0,3).map(p=>mapPublicProduct(p,base.categories.find(c=>c.id===p.category_id)));
const id='11111111-1111-4111-8111-111111111111';
const campaign={id,name:'Campanha QA',slug:'campanha-qa',title:'Um presente especial para quem você ama',description:'Perfumes e cuidados escolhidos pela Cris para celebrar.',button_text:'Ver seleção',active:true,desktop_image_path:'',mobile_image_path:'',created_at:'2026-10-30',updated_at:'2026-10-30',productIds:products.map(p=>p.id),desktopUrl:'/images/banner-editorial.png',mobileUrl:'/images/categorias/perfumes.png'};
const mocks={
  'next/link':{__esModule:true,default:({children,...props})=>React.createElement('a',props,children)},
  'next/navigation':{usePathname:()=>'/admin/campanhas',notFound:()=>{throw Error('notFound')}},
  '@/components/store-provider':{useStore:()=>({bagCount:0,favorites:[],lastAdded:null})},
  '@/components/search-overlay':{SearchOverlay:()=>null},
  '@/lib/catalog/home-server':{getHomeCatalog:async()=>({categories:base.categories,counts:{},highlights:[],preferred:[],gifts:[],latest:[]})},
  '@/lib/campaigns/public-server':{getHomeCampaign:async()=>null,getPublicCampaign:async()=>({campaign,products})},
  '@/lib/admin/auth':{requireAdmin:async()=>({supabase:{}})},
  '@/lib/admin/site-url':{getSiteUrl:()=> 'https://makes.example'},
  '@/app/admin/actions':{logout(){}},
  '@/app/admin/(protected)/campanhas/actions':{saveCampaign(){},changeCampaign(){}},
  '@/components/add-to-bag-button':{AddToBagButton:()=>React.createElement('button',null,'Adicionar à sacola')},
  '@/components/favorite-button':{FavoriteButton:()=>null},

  react:{...React,useActionState:()=>[{},()=>{},false]},
};
async function main(){
 const {BottomNavigation}=load('components/bottom-navigation.tsx',mocks);
 const {SiteHeader}=load('components/site-header.tsx',mocks);
 const HomePage=load('app/(loja)/page.tsx',mocks).default;
 const home=await HomePage();
 const wrap=hero=>render(React.createElement(React.Fragment,null,React.createElement(SiteHeader),React.cloneElement(home,{},...React.Children.toArray(home.props.children).map((child,i)=>i===0?hero:child)),React.createElement(BottomNavigation)));
 const {HomeHero}=load('components/home-hero.tsx',mocks);
 const {CampaignForm}=load('components/admin/campaign-form.tsx',mocks);
 const Layout=load('app/admin/(protected)/layout.tsx',mocks).default;
 const CampaignPage=load('app/(loja)/campanha/[slug]/page.tsx',mocks).default;
 const editor=await Layout({children:React.createElement(CampaignForm,{campaign,images:campaign,products,categories:base.categories})});
 const pages={default:wrap(React.createElement(HomeHero)),campaign:wrap(React.createElement(HomeHero,{campaign})),long:wrap(React.createElement(HomeHero,{campaign:{...campaign,title:'Titulo muito longo '.repeat(12),description:'Descricao extensa da campanha. '.repeat(60),button_text:'Ver selecao especial '.repeat(4)}})),editor:'<div class="admin-root">'+render(editor)+'</div>',selection:render(await CampaignPage({params:Promise.resolve({slug:'campanha-qa'})}))};
 const chunks=fs.readdirSync(path.join(root,'.next/static/chunks')).filter(f=>f.endsWith('.css'));
 const css=chunks.map(f=>fs.readFileSync(path.join(root,'.next/static/chunks',f),'utf8')).join('\n');
 const font=name=>css.match(new RegExp('--'+name+':\\s*([^;}]+)'))?.[1]||'sans-serif';
 const html=page=>'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+chunks.map(f=>`<link rel="stylesheet" href="/_next/static/chunks/${f}">`).join('')+`<style>:root{--font-manrope:${font('font-manrope')};--font-cormorant:${font('font-cormorant')}}body{font-family:var(--font-manrope)}</style><body>`+page+'</body></html>';
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const page=pathname==='/campanha/campanha-qa'?'selection':pathname.slice(1);
  if(pages[page]){res.setHeader('content-type','text/html; charset=utf-8');res.end(html(pages[page]));return;}
  const staticRoot=pathname.startsWith('/_next/static/')?path.join(root,'.next/static'):path.join(root,'public');
  const relative=pathname.startsWith('/_next/static/')?pathname.slice('/_next/static/'.length):'.'+pathname;
  const file=path.resolve(staticRoot,relative);if(!file.startsWith(staticRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  const mime={'.css':'text/css','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)];if(mime)res.setHeader('content-type',mime);res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await openEdge();const {send,evaluate,sleep}=browser;
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"window.qaCLS=0;new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.qaCLS+=e.value}).observe({type:'layout-shift',buffered:true})"});
  const results=[];
  for(const width of [1920,1440,768,390,360])for(const mode of ['default','campaign','long','editor']){
   await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<768});
   await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/${mode}`});
   for(let i=0;i<120;i++){if(await evaluate("document.readyState==='complete' && !!document.querySelector('h1,form') && [...document.images].every(i=>i.complete)"))break;await sleep(100);}
   await evaluate('document.fonts.ready');await sleep(100);
   const state=await evaluate(`(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,broken:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src),title:document.querySelector('h1')?.textContent,cta:document.querySelector('section a')?.getAttribute('href'),image:document.querySelector('section img')?.currentSrc,objectFit:document.querySelector('section img')?getComputedStyle(document.querySelector('section img')).objectFit:null,cls:window.qaCLS||0,heroHeight:document.querySelector('section')?.getBoundingClientRect().height,heroBox:document.querySelector('.home-hero')?.getBoundingClientRect().toJSON(),ctaBox:document.querySelector('section a')?.getBoundingClientRect().toJSON(),categoriesTop:[...document.querySelectorAll('h2')].find(h=>h.textContent==='Categorias')?.getBoundingClientRect().top,categoryCardTop:document.querySelector('a[href^="/categoria/"]')?.getBoundingClientRect().top,mobilePreviewRatio:(()=>{const box=document.querySelector('.campaign-art-preview-mobile')?.getBoundingClientRect();return box?box.width/box.height:null})(),previewCount:document.querySelectorAll('.campaign-art-preview').length,selected:document.querySelectorAll('input[name="product_ids"]').length}))()`);
   state.mode=mode;assert.equal(state.overflow,false);assert.equal(state.broken.length,0);assert.ok(state.cls<0.1,`CLS ${state.cls}`);
   if(mode==='campaign'){assert.equal(state.cta,'/campanha/campanha-qa');assert.ok(state.image.endsWith(width<=767?campaign.mobileUrl:campaign.desktopUrl));assert.equal(state.objectFit,width<1024?'cover':'contain');}
   if(mode==='default'){assert.equal(state.cta,'/categorias');assert.equal(state.objectFit,width>=640&&width<1024?'contain':'cover');}
   if(mode!=='editor' && width<1024){assert.equal(state.heroBox.height,320);assert.ok(state.ctaBox.bottom<=state.heroBox.bottom);assert.ok(state.categoriesTop<600);assert.ok(state.categoryCardTop<700);assert.ok(state.ctaBox.bottom<844-72);}
   if(mode==='editor'){assert.equal(state.previewCount,2);assert.ok(Math.abs(state.mobilePreviewRatio-350/320)<0.01);assert.equal(state.selected,products.length);}
   const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(path.join(out,`campaign-${mode}-${width}.png`),Buffer.from(screenshot.data,'base64'));if(width===390&&mode!=='editor'){const viewport=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(path.join(out,`hero-${mode}-390-viewport.png`),Buffer.from(viewport.data,'base64'));}results.push(state);
  }
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/campaign`});
  for(let i=0;i<60;i++){if(await evaluate("!!document.querySelector('section a')"))break;await sleep(100);}
  await evaluate("document.querySelector('section a').click()");
  for(let i=0;i<60;i++){if(await evaluate("location.pathname==='/campanha/campanha-qa' && document.querySelectorAll('article').length===3"))break;await sleep(100);}
  assert.equal(await evaluate("location.pathname==='/campanha/campanha-qa' && document.querySelectorAll('article').length===3"),true);
  assert.equal(browser.exceptions.length,0);
  const report={results,ctaClick:true,fixtureOnly:true,productionCampaignsCreated:0,exceptions:browser.exceptions};fs.writeFileSync(path.join(out,'campaign-browser-qa.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
