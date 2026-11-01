// Production verification is read-only. Campaign QA fixtures live in PGlite/browser harnesses.
const fs=require('node:fs'),assert=require('node:assert/strict'),{parseEnv}=require('node:util');
const {createClient}=require('@supabase/supabase-js');
const {load}=require('./helpers/load-typescript.cjs');
const env=parseEnv(fs.readFileSync('.env.local','utf8'));
const beforeMode=process.argv.includes('--snapshot-before');
const snapshotFile='catalog-import/pre-campaign-migration-snapshot.json';
const network={reads:0,writes:0};
const transport=async(input,options={})=>{assert.ok(['GET','HEAD'].includes((options.method||'GET').toUpperCase()));network.reads++;return fetch(input,{...options,signal:AbortSignal.timeout(30000)});};
const client=key=>createClient(env.NEXT_PUBLIC_SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:transport}});
async function main(){
 const service=client(env.SUPABASE_SERVICE_ROLE_KEY),anon=client(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
 const read=async(table)=>{const {data,error}=await service.from(table).select('*').order('id');assert.ifError(error);return data;};
 const current={products:await read('products'),categories:await read('categories')};
 if(beforeMode){assert.ok(!fs.existsSync(snapshotFile),'Snapshot must not be overwritten');fs.writeFileSync(snapshotFile,JSON.stringify(current,null,2)+'\n');console.log({snapshot:snapshotFile,products:current.products.length,categories:current.categories.length});return;}
 assert.deepEqual(current,JSON.parse(fs.readFileSync(snapshotFile,'utf8')));
 const {data:campaigns,error}=await service.from('campaigns').select('*');assert.ifError(error);assert.equal(campaigns.length,0,'No QA campaign may remain in production');
 const {data:publicCampaigns,error:publicError}=await anon.from('campaigns').select('*');assert.ifError(publicError);assert.equal(publicCampaigns.length,0);
 const {readPublicCatalog}=load('lib/catalog/public-repository.ts',{},env);const catalog=await readPublicCatalog(anon);assert.equal(catalog.products.length,69);
 const {readPublicCampaign}=load('lib/campaigns/repository.ts',{},env);assert.equal(await readPublicCampaign(anon),null);
 const bucket=await service.storage.getBucket('campaign-banners');assert.ifError(bucket.error);assert.equal(bucket.data.public,false);
 const result={productsIntact:true,categoriesIntact:true,publicProducts:catalog.products.length,campaigns:campaigns.length,publicCampaigns:publicCampaigns.length,privateBucket:!bucket.data.public,defaultHero:true,network};
 fs.writeFileSync('catalog-import/campaign-remote-qa.json',JSON.stringify(result,null,2)+'\n');console.log(result);
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
