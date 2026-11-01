// Real local production build + live public Supabase data; no writes or fixtures in the app.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {openEdge}=require('./helpers/edge-cdp.cjs');
const remote=require('../catalog-import/search-remote-qa.json');
async function main(){
 const browser=await openEdge();const {send,evaluate,sleep}=browser;const results=[];
 const popup='[role="dialog"]';
 const waitFor=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await sleep(100)}throw Error('Browser timeout: '+expression)};
 async function open(){
  await evaluate("(()=>{const b=document.querySelector('header button[aria-label=\"Buscar produtos\"]');b.focus();b.click()})()");
  await waitFor("!!document.querySelector('[role=\"dialog\"] input') && document.activeElement === document.querySelector('[role=\"dialog\"] input')");
 }
 async function query(term){
  await evaluate("(()=>{const i=document.querySelector('[role=\"dialog\"] input');i.focus();i.select()})()");
  await send('Input.insertText',{text:term});await sleep(100);
  await waitFor("document.querySelector('[data-search-scroll]')?.getAttribute('aria-busy') === 'false'");
 }
 async function readyImages(){await waitFor("[...document.querySelectorAll('[role=\"dialog\"] img')].every(i=>i.complete)");}
 async function bounds(){return evaluate(`(()=>{const p=document.querySelector('${popup}'),r=p.getBoundingClientRect(),v=visualViewport;const b=p.querySelector('[aria-label="Fechar busca"]').getBoundingClientRect();return{width:innerWidth,height:innerHeight,top:r.top,bottom:r.bottom,visibleHeight:v.height,overflow:document.documentElement.scrollWidth>innerWidth||p.scrollWidth>p.clientWidth,closeVisible:b.top>=r.top&&b.bottom<=r.bottom,broken:[...p.querySelectorAll('img')].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)}})()`);}
 const canonical=remote.categories.map(c=>({href:'/categoria/'+c.slug,name:c.name,image:c.image,count:c.count}));
 try{
  await send('Page.addScriptToEvaluateOnNewDocument',{source:"window.qaFetches=[];const originalFetch=window.fetch;window.fetch=(...args)=>{window.qaFetches.push(String(args[0]));return originalFetch(...args)}"});
  for(const width of [1440,768,390]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});
   await send('Page.navigate',{url:'http://localhost:3100/'});
   await waitFor("document.readyState==='complete' && document.querySelectorAll('main article').length===16");await sleep(3000);
   const home=await evaluate("[...document.querySelectorAll('main a[href^=\"/categoria/\"]')].map(a=>({href:a.getAttribute('href'),name:a.querySelector('h3').textContent,image:a.querySelector('img').src,count:parseInt(a.querySelector('p').textContent)}))");
   assert.deepEqual(home,canonical);
   await open();await readyImages();
   const initial=await evaluate(`(()=>{const p=document.querySelector('${popup}');return{suggestions:[...[...p.querySelectorAll('p')].find(el=>el.textContent==='Sugestões').parentElement.querySelectorAll('button')].map(b=>b.textContent),categories:[...p.querySelectorAll('a[href^="/categoria/"]')].map(a=>({href:a.getAttribute('href'),name:a.querySelector('.font-medium').textContent,image:a.querySelector('img').src,count:parseInt(a.querySelector('.text-xs').textContent)})),productCount:p.querySelectorAll('a[href^="/produto/"]').length,frequent:p.textContent.includes('Buscas frequentes')}})()`);
   assert.deepEqual(initial.categories,canonical);assert.equal(initial.productCount,0);assert.equal(initial.frequent,false);
   assert.deepEqual(initial.suggestions,remote.suggestions);
   const measurements=await bounds();assert.equal(measurements.overflow,false);assert.equal(measurements.closeVisible,true);assert.equal(measurements.broken.length,0);
   const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`catalog-import/search-empty-${width}.png`,Buffer.from(screenshot.data,'base64'));
   const queries=[];const fetchCount=await evaluate('window.qaFetches.length');
   await evaluate("(()=>{const p=document.querySelector('[role=\"dialog\"]');const group=[...p.querySelectorAll('p')].find(el=>el.textContent==='Sugestões').parentElement;const b=group.querySelector('button');b.focus();b.click()})()");
   await waitFor("document.activeElement === document.querySelector('[role=\"dialog\"] input')");
   for(const expected of remote.queries){
    await query(expected.term);await readyImages();
    const rows=await evaluate("[...document.querySelectorAll('[role=\"dialog\"] a[href^=\"/produto/\"]')].map(a=>a.getAttribute('href'))");
    assert.deepEqual(rows,expected.products.slice(0,6).map(p=>'/produto/'+p.slug),expected.term);
    const state=await bounds();assert.equal(state.overflow,false);assert.equal(state.broken.length,0);
    if(!expected.count)assert.ok(await evaluate("document.querySelector('[role=\"dialog\"]').textContent.includes('Nenhum produto encontrado para')"));
    queries.push({term:expected.term,total:expected.count,visible:rows.length});
   }
   assert.equal(await evaluate('window.qaFetches.length'),fetchCount,'Typing must not make search/prefetch requests');
   await query('iLiA');assert.equal(await evaluate("document.querySelectorAll('[role=\"dialog\"] a[href^=\"/produto/\"]').length"),2);
   await query('Kit');
   await evaluate("[...document.querySelectorAll('[role=\"dialog\"] button')].find(b=>b.textContent.startsWith('Mostrar mais resultados')).click()");
   assert.equal(await evaluate("document.querySelectorAll('[role=\"dialog\"] a[href^=\"/produto/\"]').length"),12);
   await query('Lily');await readyImages();
   const lilyShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`catalog-import/search-lily-${width}.png`,Buffer.from(lilyShot.data,'base64'));
   let keyboard;
   if(width===390){
    await query(''); // Input.insertText with an empty string may not delete the selection.
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});await sleep(100);
    await send('Emulation.setDeviceMetricsOverride',{width,height:430,deviceScaleFactor:1,mobile:true});await sleep(150);
    keyboard=await bounds();assert.equal(keyboard.overflow,false);assert.equal(keyboard.closeVisible,true);assert.ok(keyboard.bottom<=keyboard.visibleHeight+1);
    const scroll=await evaluate("(()=>{const p=document.querySelector('[role=\"dialog\"]'),s=p.querySelector('[data-search-scroll]');s.scrollTop=s.scrollHeight;const a=[...p.querySelectorAll('a[href^=\"/categoria/\"]')].at(-1);const r=a.getBoundingClientRect();return{scrollable:s.scrollHeight>s.clientHeight,clickable:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a')===a};})()");
    assert.equal(scroll.scrollable,true);assert.equal(scroll.clickable,true);
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:true});await sleep(100);
   }
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
   await waitFor("!document.querySelector('[role=\"dialog\"]')");
   await waitFor("document.activeElement === document.querySelector('header button[aria-label=\"Buscar produtos\"]')");
   assert.equal(await evaluate("document.activeElement === document.querySelector('header button[aria-label=\"Buscar produtos\"]')"),true);
   await open();await query('Lily');
   const productHref=await evaluate("document.querySelector('[role=\"dialog\"] a[href^=\"/produto/\"]').getAttribute('href')");
   await evaluate("document.querySelector('[role=\"dialog\"] a[href^=\"/produto/\"]').click()");
   await waitFor(`location.pathname===${JSON.stringify(productHref)} && !document.querySelector('[role="dialog"]') && !!document.querySelector('main h1')`);
   await open();await waitFor("document.querySelectorAll('[role=\"dialog\"] a[href^=\"/categoria/\"]').length===8");
   const categoryHref=await evaluate("document.querySelector('[role=\"dialog\"] a[href^=\"/categoria/\"]').getAttribute('href')");
   await evaluate("document.querySelector('[role=\"dialog\"] a[href^=\"/categoria/\"]').click()");
   await waitFor(`location.pathname===${JSON.stringify(categoryHref)} && !document.querySelector('[role="dialog"]') && !!document.querySelector('main h1')`);
   await send('Page.navigate',{url:'http://localhost:3100/categorias'});await waitFor("document.querySelectorAll('main a[href^=\"/categoria/\"]').length===8");
   const categoriesPage=await evaluate("[...document.querySelectorAll('main a[href^=\"/categoria/\"]')].map(a=>({href:a.getAttribute('href'),name:a.querySelector('h3').textContent,image:a.querySelector('img').src,count:parseInt(a.querySelector('p').textContent)}))");assert.deepEqual(categoriesPage,home);
   results.push({width,initial,measurements,queries,keyboard,productHref,categoryHref,focusRestored:true,synchronized:true,typingRequests:0});
  }
  assert.equal(browser.exceptions.length,0);
  fs.writeFileSync('catalog-import/search-browser-qa.json',JSON.stringify({results,exceptions:browser.exceptions},null,2)+'\n');
  console.log(JSON.stringify({results:results.map(r=>({width:r.width,categories:r.initial.categories.length,overflow:r.measurements.overflow,keyboard:r.keyboard,focusRestored:r.focusRestored,synchronized:r.synchronized,typingRequests:r.typingRequests})),exceptions:browser.exceptions},null,2));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
