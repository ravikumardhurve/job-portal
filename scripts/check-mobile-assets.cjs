/* eslint-disable @typescript-eslint/no-require-imports -- Isolated harness; every runtime dependency is explicitly mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');

// Never import the real auth/store module, dotenv, MongoDB, or a network client.
const environment = { CLOUDINARY_CLOUD_NAME: 'fixture', CLOUDINARY_API_KEY: 'fixture-public', CLOUDINARY_API_SECRET: 'fixture-secret-not-real' };
let now = Date.now();
class Clock extends Date { static now() { return now; } }
function load(file, mocks = {}) {
  const fixtureModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    module: fixtureModule, exports: fixtureModule.exports, Response, Request, URL, Buffer, Date: Clock, Error,
    process: { env: environment },
    require(id) { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error(`Unmocked dependency: ${id}`); },
  });
  return fixtureModule.exports;
}
const plain = value => JSON.parse(JSON.stringify(value));

async function main() {
  let settings, reads = 0, writes = [], destroyed = [], heads = [], displayOverride, uploadOverride;
  let metadata = { bytes: 1000, format: 'jpg' };
  const storage = load('src/lib/storage.ts', { cloudinary: { v2: {
    config() {}, utils: { api_sign_request() { return 'fixture-signature'; } },
    url(publicId) { return displayOverride ?? `https://res.cloudinary.com/fixture/image/upload/${publicId}`; },
    api: { async resource(id, options) { heads.push({ id, ...options }); return metadata; } },
    uploader: { async destroy(id, options) { destroyed.push({ id, ...options }); } },
  } } });
  const contracts = load('src/lib/mobile/contracts.ts');
  const slugs = ['job-placement', 'security-services', 'baby-care', 'housekeeping', 'pest-control'];
  const { adminAssets } = load('src/lib/mobile/admin-assets.ts', {
    'node:crypto': crypto,
    './contracts': contracts,
    '@/lib/storage': { ...storage, createUploadSignature(...args) { const signed = storage.createUploadSignature(...args); return uploadOverride ? { ...signed, uploadUrl: uploadOverride } : signed; } },
    '@/lib/service-pages': { SERVICE_PAGE_SLUGS: slugs, SERVICE_PAGES: Object.fromEntries(slugs.map(slug => [slug, { shortTitle: slug }])), isServicePageSlug: slug => slugs.includes(slug) },
    '@/lib/portal': { portalStore: {
      async getSiteSettings() { reads++; return structuredClone(settings); },
      async updateSiteSettings(patch, email) { writes.push({ patch: plain(patch), email }); settings = { ...settings, ...plain(patch) }; return { ...settings, dangerousSecret: 'must-not-leak' }; },
    } },
  });
  const admin = (role = 'ADMIN', all = true) => ({ kind: 'admin', user: { id: 'ADM-1', email: 'admin@example.test', role }, scope: { all, verticals: [] } });
  const banner = { type: 'HERO_BANNER' };
  const gallery = { type: 'SERVICE_GALLERY', serviceSlug: 'baby-care' };
  const hero = { type: 'SERVICE_HERO', serviceSlug: 'baby-care' };
  const key = (id, overrides = {}) => storage.createCloudinaryStorageKey({ publicId: id, resourceType: 'image', deliveryType: 'upload', format: 'jpg', ...overrides });
  const b1 = key('site-assets/HERO_BANNER/one'), b2 = key('site-assets/HERO_BANNER/two');
  const g1 = key('site-assets/SERVICE_GALLERY/baby-care/one');
  function reset() {
    settings = { heroBannerKeys: [b1, b2], serviceAssets: { 'baby-care': { heroKey: key('site-assets/SERVICE_HERO/baby-care/one'), galleryKeys: [g1] } }, companyName: 'Preserve company', smtpPassword: 'must-not-leak' };
    reads = 0; writes = []; destroyed = []; heads = []; metadata = { bytes: 1000, format: 'jpg' }; displayOverride = undefined; uploadOverride = undefined;
  }
  async function call(action = '', method = 'GET', body, session = admin()) {
    const response = await adminAssets(new Request(`https://portal.test/api/mobile/admin/assets${action ? `/${action}` : ''}`, { method, ...(body !== undefined ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) }), ['admin', 'assets', ...(action ? action.split('/') : [])], session);
    return { status: response.status, data: await response.json().catch(() => null), response };
  }
  const presign = async (target = banner, extra = {}) => call('upload-url', 'POST', { ...target, fileName: 'sample.jpg', contentType: 'image/jpeg', fileSize: 1000, ...extra });
  async function confirmation(target = banner) {
    const result = await presign(target); assert.equal(result.status, 200);
    const { publicId, resourceType, deliveryType, receipt } = result.data.data;
    return { ...target, publicId, resourceType, deliveryType, receipt };
  }
  reset();
  assert.equal(await adminAssets(new Request('https://portal.test'), ['admin', 'settings'], admin()), null);
  for (const session of [null, { kind: 'candidate' }, admin('RECRUITER'), admin('PARTNER_ADMIN'), admin('ADMIN', false)]) {
    for (const [action, method] of [['', 'GET'], ['upload-url', 'POST'], ['upload-confirm', 'POST'], ['remove', 'DELETE'], ['reorder', 'PATCH']]) assert.equal((await call(action, method, method === 'GET' ? undefined : {}, session)).status, 403);
  }
  assert.equal(reads, 0); assert.equal(writes.length, 0); assert.equal(heads.length, 0);
  for (const role of ['ADMIN', 'SUPER_ADMIN']) {
    const result = await call('', 'GET', undefined, admin(role)); assert.equal(result.status, 200);
    assert.equal(result.data.data.banners.length, 2); assert.equal(result.data.data.services.length, 5);
    assert.ok(!JSON.stringify(result.data).includes('must-not-leak')); assert.equal(result.response.headers.get('Cache-Control'), 'private, no-store');
  }
  assert.equal((await call('unknown')).status, 404);
  assert.equal((await call('remove/extra', 'DELETE', {})).status, 404);
  assert.equal((await call('', 'POST', {})).status, 405);
  for (const extra of [{ type: 'LOGO' }, { type: 'toString' }, { fileSize: -1 }, { fileSize: 0 }, { fileSize: 1.5 }, { fileSize: 5242881 }, { fileSize: '1000' }, { contentType: 'image/svg+xml' }, { fileName: 'script.svg' }, { fileName: 'image.png' }, { serviceSlug: 'baby-care' }, { smtpPassword: 'injected' }, { url: 'https://evil.test/a.jpg' }]) assert.equal((await presign(banner, extra)).status, 400, JSON.stringify(extra));
  for (const serviceSlug of ['../baby-care', 'toString', '__proto__', 'missing']) assert.equal((await presign({ ...gallery, serviceSlug })).status, 400);
  uploadOverride = 'https://api.cloudinary.com.evil.test/v1_1/cloud/image/upload'; assert.equal((await presign()).status, 503); uploadOverride = undefined;
  const malformed = await adminAssets(new Request('https://portal.test', { method: 'POST', body: '{' }), ['admin', 'assets', 'upload-url'], admin()); assert.equal(malformed.status, 400);
  const oversized = await adminAssets(new Request('https://portal.test', { method: 'POST', body: 'x'.repeat(16001) }), ['admin', 'assets', 'upload-url'], admin()); assert.equal(oversized.status, 413);
  assert.equal(writes.length, 0);

  reset();
  const upload = await confirmation();
  assert.ok(upload.publicId.startsWith('site-assets/HERO_BANNER/'));
  for (const override of [{ publicId: 'candidate-documents/private' }, { publicId: 'site-assets/HERO_BANNER/../private' }, { publicId: `${upload.publicId}/nested` }, { resourceType: 'raw' }, { deliveryType: 'authenticated' }, { receipt: `${upload.receipt}tampered` }, { publicId: `${upload.publicId}-different` }]) assert.equal((await call('upload-confirm', 'POST', { ...upload, ...override })).status, 403);
  assert.equal((await call('upload-confirm', 'POST', { ...upload, secure_url: 'https://evil.test/a' })).status, 400);
  assert.equal((await call('upload-confirm', 'POST', upload, { ...admin(), user: { ...admin().user, id: 'ADM-2' } })).status, 403);
  now += 3600001; assert.equal((await call('upload-confirm', 'POST', upload)).status, 403); now -= 3600001;
  for (const head of [{ bytes: 0, format: 'jpg' }, { bytes: -1, format: 'jpg' }, { bytes: 5242881, format: 'jpg' }, { format: 'jpg' }, { bytes: 999, format: 'jpg' }, { bytes: 1000, format: 'svg' }, { bytes: 1000, format: 'png' }, { bytes: 1000, format: 'toString' }]) { metadata = head; assert.equal((await call('upload-confirm', 'POST', upload)).status, 400); }
  metadata = { bytes: 1000, format: 'jpg' };
  for (const url of ['http://res.cloudinary.com/x/image/upload/a', 'https://evil.test/a', 'https://res.cloudinary.com/x/raw/upload/a', 'https://user:pass@res.cloudinary.com/x/image/upload/a']) { displayOverride = url; assert.equal((await call('upload-confirm', 'POST', upload)).status, 400); }
  displayOverride = undefined;
  assert.equal(writes.length, 0); assert.equal(destroyed.length, 0);
  const saved = await call('upload-confirm', 'POST', upload); assert.equal(saved.status, 200); assert.ok(!JSON.stringify(saved.data).includes('must-not-leak'));
  assert.equal(settings.heroBannerKeys.length, 3); assert.equal(settings.companyName, 'Preserve company');
  assert.equal(writes[0].email, 'admin@example.test'); assert.deepEqual(Object.keys(writes[0].patch), ['heroBannerKeys']);
  await call('upload-confirm', 'POST', upload); assert.equal(writes.length, 1, 'Confirm retry must be idempotent');

  reset();
  const serviceUpload = await confirmation(gallery);
  assert.equal((await call('upload-confirm', 'POST', { ...serviceUpload, serviceSlug: 'housekeeping' })).status, 403);
  assert.equal((await call('upload-confirm', 'POST', serviceUpload)).status, 200);
  assert.equal(settings.serviceAssets['baby-care'].galleryKeys.length, 2);
  const heroUpload = await confirmation(hero);
  assert.equal((await call('upload-confirm', 'POST', heroUpload)).status, 200); assert.equal(destroyed.length, 1);
  assert.equal(destroyed[0].id, 'site-assets/SERVICE_HERO/baby-care/one');
  assert.equal(settings.serviceAssets['baby-care'].galleryKeys.length, 2);
  const tooMany = await confirmation(gallery);
  settings.serviceAssets['baby-care'].galleryKeys = Array.from({ length: 12 }, (_, i) => key(`site-assets/SERVICE_GALLERY/baby-care/${i}`));
  assert.equal((await presign(gallery)).status, 400);
  assert.equal((await call('upload-confirm', 'POST', tooMany)).status, 400);

  reset();
  const unsafe = [key('candidate-documents/private'), key('site-assets/HERO_BANNER/private', { deliveryType: 'authenticated' }), key('site-assets/HERO_BANNER/raw', { resourceType: 'raw' }), key('site-assets/HERO_BANNER/../private'), key('site-assets/HERO_BANNER/subfolder/one'), 'cloudinary:image:upload:jpg:%zz', key('site-assets/SERVICE_GALLERY/housekeeping/one')];
  for (const fileKey of unsafe) assert.equal((await call('remove', 'DELETE', { ...banner, fileKey })).status, 403);
  assert.equal((await call('remove', 'DELETE', { ...banner, fileKey: key('site-assets/HERO_BANNER/absent') })).status, 404);
  assert.equal((await call('remove', 'DELETE', { ...banner, fileKey: b1, secret: true })).status, 400);
  assert.equal(destroyed.length, 0); assert.equal(writes.length, 0);
  settings.heroBannerKeys.push(...unsafe);
  const listed = await call(); assert.equal(listed.data.data.banners.length, 2);
  displayOverride = 'https://evil.test/preview'; assert.equal((await call()).data.data.banners[0].url, null); displayOverride = undefined;
  reset();
  for (const keys of [[b1], [b1, b1], [b1, key('site-assets/HERO_BANNER/unknown')]]) assert.equal((await call('reorder', 'PATCH', { ...banner, keys, expectedKeys: [b1, b2] })).status, 400);
  assert.equal((await call('reorder', 'PATCH', { ...banner, keys: [b2, b1], expectedKeys: [b2, b1] })).status, 409);
  assert.equal((await call('reorder', 'PATCH', { ...banner, keys: [b2, b1], expectedKeys: [b1, b2] })).status, 200);
  assert.deepEqual(settings.heroBannerKeys, [b2, b1]);
  assert.equal((await call('remove', 'DELETE', { ...gallery, fileKey: g1 })).status, 200);
  assert.equal(settings.serviceAssets['baby-care'].galleryKeys.length, 0);
  const heroKey = settings.serviceAssets['baby-care'].heroKey;
  assert.equal((await call('remove', 'DELETE', { ...hero, fileKey: heroKey })).status, 200);
  assert.ok(!Object.hasOwn(settings.serviceAssets['baby-care'], 'heroKey'));
  assert.equal((await call('remove', 'DELETE', { ...banner, fileKey: b1 })).status, 200);
  assert.deepEqual(settings.heroBannerKeys, [b2]);
  assert.equal((await call('remove', 'DELETE', { ...banner, fileKey: b1 })).status, 404);
  assert.equal(destroyed.length, 3);

  const screen = fs.readFileSync(path.join(__dirname, '../mobile/src/screens/AdminAssets.tsx'), 'utf8');
  assert.match(screen, /DocumentPicker\.getDocumentAsync/); assert.match(screen, /form\.append\('file'/);
  assert.match(screen, /text: 'Cancel', style: 'cancel'/); assert.match(screen, /export function AdminAssets/);
  assert.match(screen, /export function nativePage/); assert.match(screen, /credentials: 'omit'/);
  console.log('PASS: admin media roles/scope, safe DTOs, signed uploads, authoritative format/size, URL/namespace boundaries, retry, gallery limit, removal and reorder. All storage is mocked; no live writes.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
