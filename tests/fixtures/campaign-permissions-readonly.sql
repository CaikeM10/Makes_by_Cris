begin read only;
do $$ begin
  if has_table_privilege('anon','public.campaigns','INSERT')
    or has_table_privilege('anon','public.campaigns','UPDATE')
    or has_table_privilege('anon','public.campaigns','DELETE')
    or has_function_privilege('anon','public.save_campaign(uuid,timestamptz,jsonb,text[],boolean)','EXECUTE')
    or not has_function_privilege('authenticated','public.save_campaign(uuid,timestamptz,jsonb,text[],boolean)','EXECUTE')
    then raise exception 'campaign-grants-invalid'; end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('campaigns','campaign_products') and not c.relrowsecurity)
    then raise exception 'campaign-rls-disabled'; end if;
end $$;
select c.relname, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('campaigns','campaign_products');
select
  has_table_privilege('anon','public.campaigns','SELECT') as anon_select,
  has_table_privilege('anon','public.campaigns','INSERT') as anon_insert,
  has_table_privilege('anon','public.campaigns','UPDATE') as anon_update,
  has_table_privilege('anon','public.campaigns','DELETE') as anon_delete,
  has_function_privilege('anon','public.save_campaign(uuid,timestamptz,jsonb,text[],boolean)','EXECUTE') as anon_save,
  has_function_privilege('authenticated','public.save_campaign(uuid,timestamptz,jsonb,text[],boolean)','EXECUTE') as authenticated_save;
select tablename,policyname,cmd,roles from pg_policies
where schemaname='public' and tablename in ('campaigns','campaign_products') order by tablename,policyname;
select policyname,cmd,roles from pg_policies
where schemaname='storage' and policyname like 'campaign_banners_%' order by policyname;
-- Exercise the existing admin authorization with an enabled identity, without
-- creating a session or exposing credentials/identity in the output.
select set_config('request.jwt.claim.sub',(select user_id::text from private.admin_users where enabled order by user_id limit 1),true) is not null as configured_existing_admin;
set local role authenticated;
do $$ begin if not public.is_admin() then raise exception 'admin-authorization-failed'; end if; end $$;
select public.is_admin() as authorized_admin, (select count(*) from public.campaigns) as campaigns_visible;
reset role;
select set_config('request.jwt.claim.sub','',true) = '' as cleared_identity;
set local role anon;
select count(*) as anonymous_campaigns from public.campaigns;
rollback;
