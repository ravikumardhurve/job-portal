/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TS test harness; no network or database access. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, require(id) {
    if (Object.hasOwn(mocks, id)) return mocks[id];
    if (id.startsWith('.') || id.startsWith('@/')) throw new Error(`Unmocked import: ${id}`);
    return require(id);
  }, Response, Request, URL, Buffer, console, Date, Error, process });
  return compiledModule.exports;
}

async function main() {
  const contracts = load('src/lib/mobile/contracts.ts');
  assert.throws(() => contracts.textField({ name: { $ne: '' } }, 'name'));
  assert.throws(() => contracts.numberField({ count: -1 }, 'count'));
  assert.throws(() => contracts.paging(new URL('https://fixture.test/?page=0')));
  assert.throws(() => contracts.paging(new URL('https://fixture.test/?page=1.5')));
  await assert.rejects(() => contracts.readBody(new Request('https://fixture.test/', { method: 'POST', body: '[]' })));
  const candidate = { id: 'C1', fullName: 'Fixture Candidate', mobile: '9000000000', verificationStatus: 'PENDING', passwordHash: 'SECRET', adminNotes: 'INTERNAL', blockReason: 'INTERNAL' };
  const safe = contracts.candidateView(candidate);
  assert.equal(safe.passwordHash, undefined); assert.equal(safe.adminNotes, undefined); assert.equal(safe.blockReason, undefined);
  assert.equal(contracts.interviewView({ id: 'I1', internalNotes: 'INTERNAL' }).internalNotes, undefined);

  let principal = { kind: 'candidate', user: safe, tokenHash: 'hashed' };
  const calls = [];
  const store = {
    getPublishedJob: async () => ({ id: 'J1', title: 'Guard' }),
    updateJobStatus: async (...args) => { calls.push(args); },
    listCandidateInterviews: async () => [{ id: 'I1', internalNotes: 'INTERNAL' }],
    listCandidateApplications: async () => [],
    createApplication: async () => { throw new Error('DUPLICATE_APPLICATION'); },
  };
  const { mobileHandler } = load('src/lib/mobile/handler.ts', {
    '@/app/api/jobs/route': { GET: async () => Response.json({ data: [], total: 0 }) },
    '@/lib/mongodb': {}, '@/lib/admin-scope': {}, '@/lib/admin-job-input': {},
    '@/lib/admin-operations': { recordAudit: async () => {} },
    '@/lib/portal': { portalStore: store }, './contracts': contracts,
    './auth': { authenticate: async () => { if (!principal) throw new contracts.MobileError('Unauthorized', 401); return principal; }, logout: async () => { calls.push('logout'); } },
    './admin': { adminList: async () => ({ data: [], total: 0 }) },
    './public': { publicPages: async () => null },
    './candidate-pages': { candidatePages: async () => null },
    './admin-pages': { adminPages: async () => null },
    './admin-assets': { adminAssets: async () => null },
    './record-pages': { recordPages: async () => null },
  });
  const send = (route, method = 'GET', body) => mobileHandler(new Request(`https://fixture.test/api/mobile/${route}`, { method, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }), route.split('/'));
  assert.equal((await send('admin/jobs')).status, 403);
  assert.equal((await send('admin/jobs/J1', 'PATCH', { status: 'PUBLISHED' })).status, 403);
  assert.equal(calls.length, 0);
  const interviews = await (await send('candidate/interviews')).json();
  assert.equal(interviews.data[0].internalNotes, undefined);
  assert.equal((await send('candidate/applications', 'POST', { jobId: 'J1' })).status, 409);
  assert.equal((await send('candidate/applications', 'POST', '{bad')).status, 400);
  assert.equal((await send('candidate/applications', 'POST', { jobId: { $ne: '' } })).status, 400);
  principal = { kind: 'admin', user: { id: 'A1' }, scope: { all: false, verticals: ['SECURITY'] } };
  assert.equal((await send('candidate/profile')).status, 403);
  assert.equal((await send('admin/jobs/J1', 'PATCH', { status: 'ARCHIVED' })).status, 400);
  const changed = await send('admin/jobs/J1', 'PATCH', { status: 'PAUSED' });
  assert.equal(changed.status, 200);
  assert.equal(calls[0][0], 'J1'); assert.equal(calls[0][1], 'PAUSED'); assert.equal(calls[0][2], principal.scope);
  assert.equal(changed.headers.get('cache-control'), 'private, no-store');
  principal = null;
  assert.equal((await send('admin/jobs')).status, 401);
  assert.equal((await send('candidate/profile')).status, 401);
  assert.equal((await send('jobs')).status, 200);

  // Exercise token issuing, hashing, expiry, password-change invalidation and revocation.
  let storedSession;
  let adminUser = { id: 'A1', name: 'Fixture', email: 'fixture@example.test', role: 'RECRUITER', businessVerticals: ['SECURITY'], status: 'ACTIVE', passwordHash: 'original-fixture-hash' };
  const counters = new Map();
  const collections = {
    mobileSessions: { createIndex: async () => {}, insertOne: async doc => { storedSession = doc; }, findOne: async filter => storedSession?.tokenHash === filter.tokenHash && storedSession.expiresAt > filter.expiresAt.$gt ? storedSession : null, deleteOne: async () => { storedSession = null; } },
    mobileAuthAttempts: { createIndex: async () => {}, findOneAndUpdate: async filter => { const count = (counters.get(filter._id) ?? 0) + 1; counters.set(filter._id, count); return { count }; } },
    users: { findOne: async () => adminUser?.status === 'ACTIVE' ? adminUser : null },
  };
  const auth = load('src/lib/mobile/auth.ts', {
    '@/lib/mongodb': { getDatabase: async () => ({ collection: name => { assert.ok(collections[name]); return collections[name]; } }) },
    '@/lib/admin-users': { authenticateAdmin: async () => adminUser },
    '@/lib/admin-scope': { normalizeBusinessVerticals: value => value ?? ['RECRUITMENT'] },
    '@/lib/portal': { portalStore: {} }, '@/lib/privacy': {}, './contracts': contracts,
  });
  const result = await auth.login({ kind: 'admin', identity: 'fixture@example.test', password: 'fixture-password' });
  assert.match(result.token, /^[a-f0-9]{64}$/);
  assert.notEqual(storedSession.tokenHash, result.token);
  assert.equal(result.user.passwordHash, undefined);
  const authenticatedRequest = new Request('https://fixture.test/', { headers: { Authorization: `Bearer ${result.token}` } });
  assert.equal((await auth.authenticate(authenticatedRequest)).scope.all, false);
  adminUser = { ...adminUser, passwordHash: 'changed-fixture-hash' };
  await assert.rejects(() => auth.authenticate(authenticatedRequest), error => error.status === 401);
  adminUser = { ...adminUser, passwordHash: 'original-fixture-hash' };
  storedSession.expiresAt = new Date(0);
  await assert.rejects(() => auth.authenticate(authenticatedRequest), error => error.status === 401);
  storedSession.expiresAt = new Date(Date.now() + 100000);
  await auth.logout(storedSession.tokenHash);
  await assert.rejects(() => auth.authenticate(authenticatedRequest), error => error.status === 401);
  for (let n = 0; n < 11; n++) await auth.login({ kind: 'admin', identity: 'fixture@example.test', password: 'fixture-password' });
  await assert.rejects(() => auth.login({ kind: 'admin', identity: 'fixture@example.test', password: 'fixture-password' }), error => error.status === 429);
  console.log('Mobile isolated checks passed: validation, safe response fields, role boundaries, scoped mutations, duplicate application, hashed sessions, expiry, credential changes, revocation and throttling. No live data touched.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
