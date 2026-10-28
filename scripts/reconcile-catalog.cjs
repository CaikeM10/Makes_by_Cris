'use strict';
const fs = require('node:fs'), path = require('node:path');
const { parseEnv } = require('node:util');
const { createHash } = require('node:crypto');
const { reconcile, planImport } = require('../lib/catalog/reconciliation.cjs');
function createTransport(env, fetchImpl = fetch, allowWrites = false) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonymous = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let key = anonymous;
  async function request(route, method = 'GET', body, extra = {}) {
    if (method !== 'GET' && !allowWrites) throw Error('Writes disabled');
    const response = await fetchImpl(url + route, { method, headers: { apikey: key, Authorization: `Bearer ${key}`, ...extra }, ...(body === undefined ? {} : { body }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`Remote ${method} HTTP ${response.status}`);
    return response;
  }
  async function objectHash(storagePath) {
    const response = await fetchImpl(`${url}/storage/v1/object/public/product-images/${storagePath}`, { method: 'GET', signal: AbortSignal.timeout(30000) });
    if (response.status === 404 || response.status === 400) return null;
    if (!response.ok) throw Error('Storage verification failed');
    return createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  }
  async function selectAll(table, fields) {
    const rows = [], pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const page = await request(`/rest/v1/${table}?select=${fields}&order=id&limit=${pageSize}&offset=${offset}`).then(r => r.json());
      rows.push(...page);
      if (page.length < pageSize) return rows;
    }
  }
  return {
    async readSnapshot() {
      // Public RLS cannot guarantee a complete snapshot of inactive rows.
      await request('/rest/v1/products?select=id&limit=1');
      if (!env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Complete inactive snapshot requires server-side read credential');
      key = env.SUPABASE_SERVICE_ROLE_KEY;
      const [products, categories, api] = await Promise.all([
        selectAll('products', '*'),
        selectAll('categories', 'id,name,slug,active'),
        request('/rest/v1/', 'GET', undefined, { Accept: 'application/openapi+json' }).then(r => r.json())
      ]);
      return { readAt: new Date().toISOString(), products, categories, schema: { products: api.definitions.products }, storageObjects: {}, method: 'GET / SELECT only' };
    },
    async inspectStorage(plan, snapshot) {
      for (const upload of plan.imageUploads) { const hash = await objectHash(upload.storagePath); if (hash) snapshot.storageObjects[upload.storagePath] = hash; }
    },
    async updateIfUnchanged(id, changes, expected) {
      const filter = new URLSearchParams({ id: `eq.${id}` });
      for (const [k, v] of Object.entries(expected)) filter.set(k, v === null ? 'is.null' : `eq.${v}`);
      const r = await request('/rest/v1/products?' + filter, 'PATCH', JSON.stringify(changes), { 'Content-Type': 'application/json', Prefer: 'return=representation' });
      if ((await r.json()).length !== 1) throw Error('Concurrent change detected; stopped');
    },
    async ensureImage(upload) {
      const hash = await objectHash(upload.storagePath);
      if (hash === upload.sha256) return;
      if (hash) throw Error('Existing Storage object differs');
      const bytes = fs.readFileSync(upload.localFile);
      if (createHash('sha256').update(bytes).digest('hex') !== upload.sha256) throw Error('Local image changed');
      await request('/storage/v1/object/product-images/' + upload.storagePath, 'POST', bytes, { 'Content-Type': 'image/webp', 'x-upsert': 'false' });
    },
    async insertIfAbsent(payload) {
      const filter = new URLSearchParams({ select: '*', or: `(id.eq.${payload.id},slug.eq.${payload.slug})` });
      const found = await request('/rest/v1/products?' + filter).then(r => r.json());
      if (found.length) {
        if (found.length === 1 && Object.entries(payload).every(([k, v]) => JSON.stringify(found[0][k]) === JSON.stringify(v))) return;
        throw Error('Insert UUID/slug conflict; stopped');
      }
      await request('/rest/v1/products', 'POST', JSON.stringify(payload), { 'Content-Type': 'application/json' });
    }
  };
}
async function main(args = process.argv.slice(2)) {
  if (args.some(a => !['--dry-run', '--execute', '--approve-write', '--offline'].includes(a))) throw Error('Unknown argument');
  const execute = args.includes('--execute');
  if (execute && (!args.includes('--approve-write') || args.includes('--dry-run') || args.includes('--offline'))) throw Error('Execution requires explicit --execute --approve-write');
  const root = path.resolve('catalog-import'), read = n => JSON.parse(fs.readFileSync(path.join(root, n), 'utf8'));
  const manifest = read('catalogo-real.json'), reconciliation = read('staging-reconciliation-plan.json');
  const offline = args.includes('--offline');
  const env = offline ? {} : parseEnv(fs.readFileSync('.env.local', 'utf8'));
  const transport = offline ? { readSnapshot: async () => read('final-staging-snapshot.json') } : createTransport(env, fetch, execute);
  let snapshot = await transport.readSnapshot();
  let plan = planImport(manifest, snapshot, reconciliation);
  if (!offline) { await transport.inspectStorage(plan, snapshot); plan = planImport(manifest, snapshot, reconciliation); }
  const required = snapshot.schema?.products?.required;
  if (!required) plan.globalHardBlockers.push('remote-schema-unverified');
  else if (required.includes('credit_price')) plan.globalHardBlockers.push('credit-price-required-by-schema');
  if (execute) {
    if (plan.globalHardBlockers.length) throw Error('Global blockers prevent execution');
    // Reconcile performs another complete SELECT immediately before mutations.
    plan = await reconcile({ manifest, reconciliation, transport, dryRun: false });
  }
  const output = { mode: execute ? 'execute' : offline ? 'offline-dry-run' : 'remote-select-dry-run', readAt: snapshot.readAt, ...plan };
  fs.writeFileSync(path.join(root, 'reconciliation-dry-run.json'), JSON.stringify(output, null, 2) + '\n');
  if (!execute) fs.writeFileSync(path.join(root, 'reconciliation-staging-snapshot.json'), JSON.stringify(snapshot, null, 2) + '\n');
  console.log(JSON.stringify({ mode: output.mode, totals: plan.totals, globalHardBlockers: plan.globalHardBlockers }, null, 2));
  for (const row of plan.rows) console.log(`${row.operation} ${row.name}${row.blockedReasons.length ? ' — ' + row.blockedReasons.join(', ') : ''}`);
  return output;
}
if (require.main === module) main().catch(() => { console.error('Reconciliation stopped; inspect local inputs/connectivity. Secrets suppressed.'); process.exitCode = 1; });
module.exports = { main, createTransport };
