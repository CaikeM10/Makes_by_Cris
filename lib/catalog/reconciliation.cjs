'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const uuid = value => /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value || '');
const protectedRow = row => /^p-/i.test(row.id || '') || /produto.*teste.*admin/i.test(row.name || '') || /produto-teste-admin/i.test(row.slug || '');
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function inspectImage(product, imageRoot) {
  if (!product.imageFile || path.basename(product.imageFile) !== product.imageFile) return null;
  const file = path.join(imageRoot, product.imageFile);
  if (!fs.existsSync(file)) return null;
  const bytes = fs.readFileSync(file);
  if (bytes.length < 12 || bytes.length > 5242880 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') return null;
  return { localFile: file, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}
function planImport(manifest, snapshot, reconciliation, options = {}) {
  const imageRoot = options.imageRoot || path.resolve('catalog-import/images');
  const globalHardBlockers = [], rows = [], imageUploads = [];
  const products = manifest.products || [], remote = snapshot.products || [];
  const permitted = ['existing-update', 'new-insert', 'unchanged'].flatMap(k => reconciliation[k] || []);
  const fail = reason => globalHardBlockers.push(reason);
  if (snapshot.schema?.products?.required?.includes('credit_price')) fail('credit-price-required-by-schema');
  for (const key of ['id', 'slug']) {
    if (new Set(products.map(p => p[key])).size !== products.length) fail(`manifest-${key}-collision`);
    if (new Set(remote.map(p => p[key])).size !== remote.length) fail(`remote-${key}-collision`);
  }
  if (new Set(permitted.map(p => p.uuid || p.id)).size !== permitted.length) fail('plan-uuid-collision');
  if (new Set(products.map(p => normalize(p.name))).size !== products.length) fail('manifest-identity-collision');
  for (const product of products) {
    const id = product.id, reasons = [], authorization = permitted.find(p => (p.uuid || p.id) === id);
    const byId = remote.find(p => p.id === id), bySlug = remote.find(p => p.slug === product.slug);
    const identities = [product.name, ...(product.aliases || [])].map(normalize);
    const identityMatches = remote.filter(r => identities.includes(normalize(r.name)) && r.id !== id);
    if (!authorization || authorization.slug !== product.slug) reasons.push('outside-explicit-plan');
    if (!uuid(id) || !product.slug || !product.name) reasons.push('invalid-identity');
    if (protectedRow(product) || (byId && protectedRow(byId)) || (bySlug && protectedRow(bySlug))) reasons.push('protected-record');
    if (bySlug && bySlug.id !== id) reasons.push('slug-identity-collision');
    if (identityMatches.length) reasons.push('product-identity-collision');
    if (byId && !identities.includes(normalize(byId.name))) reasons.push('uuid-identity-mismatch');
    if (byId && byId.slug !== product.slug) reasons.push('remote-slug-mismatch');
    if (typeof product.price !== 'number' || !Number.isFinite(product.price) || product.price <= 0) reasons.push('invalid-price');
    if (product.creditPrice !== null && (typeof product.creditPrice !== 'number' || !Number.isFinite(product.creditPrice) || product.creditPrice <= 0)) reasons.push('invalid-credit-price');
    const categories = (snapshot.categories || []).filter(c => c.name === product.category);
    if (product.categoryStatus === 'pending' || categories.length !== 1) reasons.push('category-pending');
    const category = categories[0];
    const image = inspectImage(product, imageRoot);
    if (!byId && !image) reasons.push('image-missing');
    if (byId && (typeof byId.image !== 'string' || !byId.image.trim())) reasons.push('remote-image-missing');
    if (byId && (byId.active !== false || byId.available !== false)) reasons.push('existing-product-not-staging');
    const target = { name: product.name, slug: product.slug, price: product.price, credit_price: product.creditPrice, category_id: category?.id };
    const changes = {};
    if (byId) for (const [key, value] of Object.entries(target)) if (value !== undefined && !equal(byId[key], value)) changes[key] = { from: byId[key], to: value };
    const row = { uuid: id, name: product.name, slug: product.slug, operation: reasons.length ? 'BLOCKED' : byId ? Object.keys(changes).length ? 'UPDATE' : 'UNCHANGED' : 'INSERT', blockedReason: reasons[0] || null, blockedReasons: reasons, softPending: product.creditPrice === null ? ['credit-price-pending'] : [], changes: reasons.length ? {} : changes };
    if (!byId && image) {
      const storagePath = `products/${id}/${image.sha256}.webp`;
      const existingHash = snapshot.storageObjects?.[storagePath];
      if (existingHash && existingHash !== image.sha256) { row.operation = 'BLOCKED'; row.blockedReasons.push('storage-content-conflict'); row.blockedReason ||= 'storage-content-conflict'; }
      if (row.operation === 'INSERT') {
        row.payload = { id, ...target, image: storagePath, brand: product.brand || null, short_description: product.shortDescription || null, description: product.description || null, active: false, available: false, featured: false, best_seller: false, gift_section: false };
        imageUploads.push({ productId: id, localFile: image.localFile, storagePath, sha256: image.sha256, bucket: 'product-images', status: existingHash === image.sha256 ? 'exists' : 'ready' });
      }
    }
    rows.push(row);
  }
  const mocks = remote.filter(p => /^p-/i.test(p.id)), testProduct = remote.filter(p => protectedRow(p) && !/^p-/i.test(p.id));
  return { globalHardBlockers, rows, imageUploads, productLevelBlockers: rows.filter(r => r.operation === 'BLOCKED').map(r => ({ uuid: r.uuid, name: r.name, blockedReason: r.blockedReason, reasons: r.blockedReasons })), slugDecisionsPending: reconciliation.slugPlans || [], totals: { manifest: products.length, remote: remote.length, remoteRealProducts: remote.filter(p => !protectedRow(p)).length, mocks: mocks.length, testProduct: testProduct.length, updatesReady: rows.filter(r => r.operation === 'UPDATE').length, insertsReady: rows.filter(r => r.operation === 'INSERT').length, blocked: rows.filter(r => r.operation === 'BLOCKED').length, unchanged: rows.filter(r => r.operation === 'UNCHANGED').length, imageUploadsReady: imageUploads.filter(r => r.status === 'ready').length, imageUploadsMissing: rows.filter(r => r.blockedReasons.includes('image-missing')).length }, protectedRecords: [...mocks, ...testProduct].map(p => ({ id: p.id, name: p.name, active: p.active, available: p.available })) };
}
// The caller supplies transport; dry-run cannot invoke a mutation, even accidentally.
// Re-read and rebuild before executing; updateIfUnchanged must atomically compare
// the supplied old fields (including active/available=false) in its UPDATE filter.
async function reconcile({ manifest, reconciliation, transport, dryRun = true, imageRoot }) {
  const snapshot = await transport.readSnapshot();
  const plan = planImport(manifest, snapshot, reconciliation, { imageRoot });
  if (dryRun) return plan;
  if (plan.globalHardBlockers.length) throw Error('Global preflight blockers');
  if (!transport.updateIfUnchanged || !transport.insertIfAbsent || !transport.ensureImage) throw Error('Safe execution transport required');
  for (const row of plan.rows) {
    if (row.operation === 'UPDATE') {
      const original = snapshot.products.find(p => p.id === row.uuid);
      await transport.updateIfUnchanged(row.uuid, Object.fromEntries(Object.entries(row.changes).map(([k, v]) => [k, v.to])), { ...Object.fromEntries(Object.entries(row.changes).map(([k, v]) => [k, v.from])), name: original.name, slug: row.slug, active: false, available: false });
    } else if (row.operation === 'INSERT') {
      const upload = plan.imageUploads.find(x => x.productId === row.uuid);
      await transport.ensureImage(upload); // Must compare object hash and never upsert.
      await transport.insertIfAbsent(row.payload); // UUID/slug conflict must fail closed.
    }
  }
  return plan;
}
module.exports = { planImport, reconcile, inspectImage, normalize, protectedRow };
