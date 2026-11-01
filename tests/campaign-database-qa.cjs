// Real PostgreSQL/RLS integration in disposable PGlite, never production fixtures.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('../catalog-import/.campaign-test-deps/node_modules/@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202610310001_seasonal_campaigns.sql'), 'utf8');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const P = '33333333-3333-4333-8333-333333333333', Q = '44444444-4444-4444-8444-444444444444';
async function main() {
  const db = new PGlite(); const checks = [];
  const check = async (name, fn) => { await fn(); checks.push(name); };
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
      create schema storage;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text, primary key(bucket_id,name));
      alter table storage.objects enable row level security;
      grant usage on schema storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;`);
    for (const file of ['202610170001_admin_authorization.sql','202610230001_catalog.sql','202610240001_public_catalog.sql']) {
      await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
    }
    await db.exec(`insert into auth.users values ('${A}'),('${B}'); insert into private.admin_users(user_id,enabled) values ('${A}',true);
      insert into public.categories(id,name,slug) values ('real','Real','real');
      insert into public.products(id,name,slug,short_description,description,price,credit_price,image,category_id,brand)
      values ('${P}','Real A','real-a','short','description',10,12,'image','real','brand'),
      ('${Q}','Real B','real-b','short','description',15,18,'image','real','brand'),
      ('p-01','Mock','mock','short','description',10,12,'image','real','brand'),
      ('55555555-5555-4555-8555-555555555555','Produto Teste Admin1','admin1','short','description',10,12,'image','real','brand');`);
    await check('migration applies and reapplies safely', async () => { await db.exec(migration); await db.exec(migration); });
    async function role(name, user = '') { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${user}',false); set role ${name};`); }
    async function save(id, version, active, ids = [P], images = true) {
      const fields = { name: 'Campanha QA '+id[0], slug: 'campanha-'+id[0], title: 'Título', description: 'Descrição', button_text: 'Ver seleção',
        desktop_image_path: images && images !== 'mobile' ? `campaigns/${id}/desktop/${P}.webp` : '', mobile_image_path: images && images !== 'desktop' ? `campaigns/${id}/mobile/${Q}.webp` : '' };
      return db.query('select public.save_campaign($1,$2,$3,$4,$5)',[id,version,JSON.stringify(fields),ids,active]);
    }
    async function version(id) { return (await db.query('select updated_at::text as version from public.campaigns where id=$1',[id])).rows[0].version; }
    await role('anon');
    await check('anon sees no inactive/empty campaigns', async()=>assert.equal((await db.query('select * from public.campaigns')).rows.length,0));
    await check('anon cannot call save RPC',async()=>assert.rejects(save(A,null,false)));
    await check('anon cannot write campaigns directly',async()=>assert.rejects(db.exec(`insert into public.campaigns(id,name,slug,title,button_text) values('${A}','X','x','X','X')`)));
    await check('anon cannot upload banners',async()=>assert.rejects(db.exec(`insert into storage.objects(bucket_id,name) values('campaign-banners','campaigns/${A}/desktop/${P}.webp')`)));
    await role('authenticated',B);
    await check('authenticated non-admin cannot save',async()=>assert.rejects(save(A,null,false)));
    await role('authenticated',A);
    await check('admin uploads two independent objects',async()=>db.exec(`insert into storage.objects(bucket_id,name) values
      ('campaign-banners','campaigns/${A}/desktop/${P}.webp'),('campaign-banners','campaigns/${A}/mobile/${Q}.webp'),
      ('campaign-banners','campaigns/${B}/desktop/${P}.webp'),('campaign-banners','campaigns/${B}/mobile/${Q}.webp')`));
    await check('admin creates draft and reads it',async()=>{ await save(A,null,false); assert.equal((await db.query('select * from public.campaigns')).rows.length,1); });
    await check('admin direct writes cannot bypass invariants',async()=>assert.rejects(db.exec(`update public.campaigns set active=true`)));
    await check('activation requires desktop and mobile',async()=>assert.rejects(save(A,await version(A),true,[P],false)));
    await check('desktop alone cannot activate',async()=>assert.rejects(save(A,await version(A),true,[P],'desktop')));
    await check('mobile alone cannot activate',async()=>assert.rejects(save(A,await version(A),true,[P],'mobile')));
    await check('activation requires eligible products',async()=>assert.rejects(save(A,await version(A),true,[])));
    await check('mock IDs and Admin1 are forbidden',async()=>{
      await assert.rejects(save(A,await version(A),true,['p-01']));
      await assert.rejects(save(A,await version(A),true,['55555555-5555-4555-8555-555555555555']));
    });
    await check('duplicate products are rejected',async()=>assert.rejects(save(A,await version(A),true,[P,P])));
    await check('admin activates A',async()=>save(A,await version(A),true,[Q,P]));
    await check('referenced banner cannot be deleted',async()=>{ const r=await db.query(`delete from storage.objects where bucket_id='campaign-banners' and name=$1 returning name`,[`campaigns/${A}/desktop/${P}.webp`]);assert.equal(r.rows.length,0); });
    await check('stale version cannot overwrite campaign',async()=>assert.rejects(save(A,'2000-01-01T00:00:00Z',false)));
    await role('anon');
    await check('anon reads only active campaign and selected products',async()=>{
      assert.equal((await db.query('select * from public.campaigns')).rows.length,1);
      const ids=(await db.query('select product_id from public.campaign_products order by position')).rows.map(r=>r.product_id);assert.deepEqual(ids,[Q,P]);
    });
    await check('anon reads active banners only',async()=>assert.equal((await db.query("select * from storage.objects where bucket_id='campaign-banners'")).rows.length,2));
    await role('authenticated',A);
    await check('activating B atomically deactivates A',async()=>{ await save(B,null,true); const rows=(await db.query('select id from public.campaigns where active')).rows;assert.deepEqual(rows.map(r=>r.id),[B]); });
    await check('failed activation preserves previous active campaign',async()=>{await assert.rejects(save(A,await version(A),true,[]));assert.deepEqual((await db.query('select id from public.campaigns where active')).rows.map(r=>r.id),[B]);});
    await role('anon');
    await check('inactive A is hidden by RLS',async()=>assert.equal((await db.query('select id from public.campaigns where id=$1',[A])).rows.length,0));
    await db.exec(`reset role; update public.products set available=false where id='${P}';`); // Disposable fixture only.
    await role('anon');
    await check('later unavailable product is hidden and empty campaign not public',async()=>{
      assert.equal((await db.query('select * from public.campaign_products')).rows.length,0);
      assert.equal((await db.query('select * from public.campaigns')).rows.length,0);
    });
    await role('authenticated',A);
    await check('deactivation still works after products are disabled',async()=>db.query('select public.set_campaign_active($1,$2,false)',[B,await version(B)]));
    await check('admin deletes campaign without deleting products',async()=>{ await db.query('select public.delete_campaign($1,$2)',[B,await version(B)]); assert.equal((await db.query('select * from public.products')).rows.length,4); });
    await db.exec('reset role');
    await check('unique index independently enforces at most one active',async()=>{
      await db.exec(`update public.campaigns set active=true where id='${A}'`);
      await assert.rejects(db.exec(`insert into public.campaigns(id,name,slug,title,button_text,active) values('${B}','B','b','B','B',true)`));
    });
    fs.writeFileSync(path.join(root,'catalog-import/campaign-database-qa.json'),JSON.stringify({checks,passed:checks.length,productionWrites:0},null,2)+'\n');
    console.log(JSON.stringify({passed:checks.length,checks},null,2));
  } finally { await db.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
