const fs=require('node:fs'),assert=require('node:assert/strict');
async function main(){
 const home=await fetch('http://localhost:3100/');const html=await home.text();assert.equal(home.status,200);
 assert.ok(html.includes('Banner padrão'));assert.ok(html.includes('Perfumes, presentes e cuidados selecionados por Cris Martins.'));
 assert.equal((html.match(/<article /g)||[]).length,16);
 const campaign=await fetch('http://localhost:3100/campanha/campanha-qa');const text=await campaign.text();
 assert.ok(campaign.status===404||text.includes('NEXT_HTTP_ERROR_FALLBACK;404'));assert.ok(!text.includes('Um presente especial para quem você ama'));
 const redirects=[];
 for(const path of ['/admin/campanhas','/admin/campanhas/nova','/admin/campanhas/11111111-1111-4111-8111-111111111111/editar']){
  const response=await fetch('http://localhost:3100'+path,{redirect:'manual'});assert.ok([307,308].includes(response.status));assert.ok(response.headers.get('location').includes('/admin/login'));redirects.push({path,status:response.status});
 }
 const result={home:home.status,defaultHero:true,homeProducts:16,inactiveCampaignUrl:campaign.status,adminProtected:redirects,productionQACampaign:false};
 fs.writeFileSync('catalog-import/campaign-runtime-qa.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
