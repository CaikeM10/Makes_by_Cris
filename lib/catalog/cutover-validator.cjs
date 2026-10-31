'use strict';
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const RECENT_NAMES = [
  'Kit Floratta Red Embalagem Lata', 'Kit Floratta Red Passion + Nativa Spa',
  'Kit Egeo Choc', 'Kit Elysée Parfum + Hidratante', 'Kit Liz Tradicional',
  'Kits Eico todos ganham a máscara de BRINDE',
  'Body Splash Kaiak Tradicional 200ml', 'Coffee Addictive',
];

// Origin counts are informational. Older provisional batches and unknown origins
// are publishable; availability, identity and image association are the blockers.
async function validateImages({ rows, manifest, audit, image, fetchImage }) {
  assert.equal(rows.length, manifest.length);
  assert.equal(new Set(rows.map(p => p.id)).size, manifest.length);
  const recent = RECENT_NAMES.map(name => {
    const matches = manifest.filter(p => p.name === name);
    assert.equal(matches.length, 1, 'Recent manifest identity: ' + name);
    const m = matches[0];
    assert.ok(rows.some(p => p.id === m.id && p.name === name), 'Recent UUID: ' + name);
    if (m.imageSource != null) assert.equal(m.imageSource, 'generated-provisional');
    return { id: m.id, name };
  });
  const origins = {}, checks = [];
  for (const p of rows) {
    const m = manifest.find(m => m.id === p.id);
    const evidence = audit.find(a => a.id === p.id);
    assert.ok(m && evidence && m.name === p.name, 'Product identity: ' + p.id);
    assert.ok(typeof p.image === 'string' && image.isProductImagePath(p.image), 'Missing/invalid image path: ' + p.id);
    assert.ok(p.image.startsWith('products/' + p.id + '/'), 'Image owner: ' + p.id);
    assert.equal(p.image, evidence.storagePath, 'Audited image association: ' + p.id);
    const url = image.resolveProductImage(p.image);
    assert.equal(new URL(url).protocol, 'https:');
    assert.equal(url, evidence.image_url);
    const response = await fetchImage(url);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(response.status, 200, 'Image HTTP: ' + p.id);
    assert.ok(bytes.length > 0, 'Empty image: ' + p.id);
    assert.equal(response.headers.get('content-type')?.split(';')[0], 'image/webp');
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.sha256, 'Image content association: ' + p.id);
    const origin = evidence.originClassification;
    origins[origin] = (origins[origin] || 0) + 1;
    checks.push({ id: p.id, name: p.name, path: p.image, url, status: response.status, bytes: bytes.length, ok: true });
  }
  return { resolved: checks.length, http200: checks.length, broken: 0, missing: 0,
    generatedProvisionalTotal: origins['generated-provisional'] || 0,
    confirmedExisting: origins['confirmed-existing'] || 0,
    unknownOrigin: origins['unknown-origin'] || 0, origins, recent, checks };
}
module.exports = { RECENT_NAMES, validateImages };
