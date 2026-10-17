/* eslint-disable @typescript-eslint/no-require-imports -- Isolated regression harness. Never loads MongoDB configuration or credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { MongoServerError } = require('mongodb');

function load(file, mocks = {}) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module: compiledModule, exports: compiledModule.exports, Response, Request, URL, Buffer, Date, Error,
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      // Fail closed: the subject can never import a real DB, network client or auth module.
      throw new Error(`Unmocked dependency: ${id}`);
    },
  });
  return compiledModule.exports;
}
const plain = value => JSON.parse(JSON.stringify(value));

function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some(part => matches(row, part));
    if (key === '$and') return expected.every(part => matches(row, part));
    const actual = row[key];
    if (expected && typeof expected === 'object') {
      if ('$in' in expected && !expected.$in.includes(actual)) return false;
      if ('$exists' in expected && (actual !== undefined) !== expected.$exists) return false;
      if ('$gte' in expected && !(actual >= expected.$gte)) return false;
      if ('$lte' in expected && !(actual <= expected.$lte)) return false;
      if ('$regex' in expected && !new RegExp(expected.$regex, expected.$options).test(actual ?? '')) return false;
      if ('$not' in expected && matches({ value: actual }, { value: expected.$not })) return false;
      return true;
    }
    return actual === expected;
  });
}

async function main() {
  const contracts = load('src/lib/mobile/contracts.ts');
  const scopeLib = load('src/lib/admin-scope.ts');
  const jobInput = load('src/lib/admin-job-input.ts', { '@/lib/admin-scope': scopeLib });
  const security = { all: false, verticals: ['SECURITY'] };
  const full = { all: true, verticals: [] };
  const admin = (role = 'RECRUITER') => ({ kind: 'admin', user: { id: 'ADM-1', name: 'Test Admin', email: 'admin@example.test', role, businessVerticals: ['SECURITY'] }, scope: ['SUPER_ADMIN', 'ADMIN'].includes(role) ? full : security, tokenHash: 'fixture' });
  let principal = admin();
  let calls = [];
  let reads = [];
  const secretFields = { _id: 'private-db-id', passwordHash: 'fixture-private-hash', storageKey: 'fixture-private-key', consents: { private: true }, metadata: { private: true } };
  const job = (id, businessVertical, category = businessVertical) => ({ id, title: id, businessVertical, category, company: 'Fixture', city: 'Raipur', district: 'Raipur', salaryMin: 100, salaryMax: 200, vacancies: 1, employmentType: 'FULL_TIME', urgent: false, status: 'DRAFT', postedAt: '2026-09-01T00:00:00.000Z', benefits: ['Transport'], jobRole: 'Guard', minExperience: 1, ...secretFields });
  const data = {
    jobs: [job('JOB-S', 'SECURITY'), job('JOB-R', 'RECRUITMENT'), { ...job('JOB-LEGACY', undefined, 'Security guard'), businessVertical: undefined }],
    applications: [
      { id: 'APP-S', jobId: 'JOB-S', candidateId: 'CAN-S', status: 'SHORTLISTED', appliedAt: '2026-09-01T12:00:00.000Z', ...secretFields },
      { id: 'APP-R', jobId: 'JOB-R', candidateId: 'CAN-R', status: 'SHORTLISTED', appliedAt: '2026-09-01T12:00:00.000Z', ...secretFields },
      { id: 'APP-N', jobId: 'JOB-S', candidateId: 'CAN-S', status: 'APPLIED', appliedAt: '2026-09-01T12:00:00.000Z' },
      { id: 'APP-D', jobId: 'JOB-S', candidateId: 'CAN-S', status: 'SHORTLISTED', deletedAt: '2026-09-02' },
    ],
    candidates: [
      { id: 'CAN-S', fullName: 'Security candidate', mobile: '9000000001', city: 'Raipur', verificationStatus: 'PENDING', availability: 'AVAILABLE', adminNotes: 'Keep this note', blockReason: '', createdAt: '2026-09-01T12:00:00.000Z', ...secretFields },
      { id: 'CAN-R', fullName: 'Other candidate', mobile: '9000000002', createdAt: '2026-09-01T12:00:00.000Z', ...secretFields },
    ],
    serviceRequests: [
      { id: 'SR-S', serviceType: 'SECURITY', createdAt: '2026-09-01T12:00:00.000Z', ...secretFields },
      { id: 'SR-R', serviceType: 'MANPOWER', createdAt: '2026-09-01T12:00:00.000Z', ...secretFields },
    ],
  };
  const db = {
    collection(name) {
      assert.ok(data[name], `Unexpected DB collection: ${name}`);
      return {
        find(filter) {
          reads.push({ name, filter: plain(filter) });
          let skip = 0; let limit = Infinity;
          const cursor = { sort() { return cursor; }, skip(value) { skip = value; return cursor; }, limit(value) { limit = value; return cursor; }, async toArray() { return data[name].filter(row => matches(row, filter)).slice(skip, skip + limit); } };
          // Deliberately ignore Mongo projections: DTOs must still suppress unexpected fields.
          return cursor;
        },
        async findOne(filter) { reads.push({ name, filter: plain(filter) }); return data[name].find(row => matches(row, filter)) ?? null; },
        async countDocuments(filter) { return data[name].filter(row => matches(row, filter)).length; },
        async distinct(key, filter) { return [...new Set(data[name].filter(row => matches(row, filter)).map(row => row[key]))]; },
      };
    },
  };
  const candidateAllowed = (id, scope) => scope.all || data.applications.some(application => application.candidateId === id && data.jobs.some(item => item.id === application.jobId && matches(item, scopeLib.jobScopeFilter(scope))));
  const store = {
    async listAdminServiceReviews(status) { return [{ id: 'REV-1', customerName: 'Fixture', status: status ?? 'PENDING', comment: 'Review', rating: 4, ...secretFields }]; },
    async updateServiceReviewStatus(...args) { calls.push(['review', ...args]); if (args[0] === 'missing') throw new Error('SERVICE_REVIEW_NOT_FOUND'); return { id: args[0], status: args[1], ...secretFields }; },
    async listAdminCandidatePrivacyRequests() { return [{ id: 'PRV-1', candidateId: 'CAN-S', candidate: data.candidates[0], status: 'SUBMITTED', ...secretFields }]; },
    async updateCandidatePrivacyRequest(...args) { calls.push(['privacy', ...args]); return { id: args[0], status: args[1], ...secretFields }; },
    async getSiteSettings() { return { companyName: 'Fixture company', phone: '9000000000', logoKey: 'private-logo-key', ...secretFields }; },
    async updateSiteSettings(...args) { calls.push(['settings', ...args]); return args[0]; },
    async updateAdminJob(id, input, scope, status) { calls.push(['job', id, input, scope, status]); assert.ok(data.jobs.some(item => item.id === id && matches(item, scopeLib.jobScopeFilter(scope)))); return { ...data.jobs.find(item => item.id === id), ...input, ...(status ? { status } : {}) }; },
    async getAdminCandidateDetails(id, scope) { calls.push(['candidate-read', id, scope]); if (!candidateAllowed(id, scope)) throw new Error('CANDIDATE_NOT_FOUND'); const candidate = data.candidates.find(item => item.id === id); if (!candidate) throw new Error('CANDIDATE_NOT_FOUND'); return { candidate, documents: [{ type: 'RESUME', status: 'UPLOADED', ...secretFields }] }; },
    async getAdminCandidateDocument(id, type, scope) { assert.ok(candidateAllowed(id, scope)); calls.push(['document-read', id, type, scope]); if (type === 'OTHER') throw new Error('DOCUMENT_NOT_FOUND'); return { type, storageKey: 'fixture-private-key', status: 'PENDING' }; },
    async updateCandidateDocumentStatus(id, type, status, reason, actor, scope) { assert.ok(candidateAllowed(id, scope)); calls.push(['document-write', id, type, status, reason, actor, scope]); return { type, status, rejectionReason: reason, ...secretFields }; },
    async logCandidateDocumentAccess(...args) { calls.push(['document-access', ...args]); },
    async scheduleInterview(input, scope) { calls.push(['schedule', input, scope]); return { id: 'INT-1', ...input, status: 'SCHEDULED', ...secretFields }; },
  };
  const users = {
    async listAdminUsers() { return [{ id: 'ADM-2', name: 'Partner', role: 'RECRUITER', ...secretFields }]; },
    async createPartnerAdmin(input) { calls.push(['create-team', input]); if (input.email === 'duplicate@example.test') throw new MongoServerError({ code: 11000, message: 'duplicate' }); return { id: 'ADM-2', name: input.name, ...secretFields }; },
    async updateAdminUserStatus(...args) { calls.push(['team-status', ...args]); if (args[0] === 'ADM-SUPER') throw new Error('ADMIN_USER_NOT_FOUND'); return { id: args[0], status: args[1], ...secretFields }; },
    async changeAdminPassword(...args) { if (args[1] === 'incorrect') throw new Error('CURRENT_PASSWORD_INVALID'); calls.push(['password', ...args]); },
  };
  const operations = {
    async listAuditLogs(filters) { calls.push(['audit-read', filters]); return [{ actorId: 'ADM-1', actor: { name: 'Fixture', email: 'not-needed@example.test' }, action: 'JOB_UPDATED', targetId: 'JOB-S', ...secretFields }]; },
    async recordAudit(...args) { calls.push(['audit', ...args]); },
    async updateCandidateAdminFields(id, input, actor, scope) { if (!candidateAllowed(id, scope)) throw new Error('CANDIDATE_NOT_FOUND'); if (input.verificationStatus === 'BLOCKED' && !input.blockReason?.trim()) throw new Error('BLOCK_REASON_REQUIRED'); calls.push(['candidate-write', id, input, actor, scope]); return { ...data.candidates.find(item => item.id === id), ...input }; },
  };
  const { adminPages } = load('src/lib/mobile/admin-pages.ts', {
    mongodb: { MongoServerError }, '@/lib/mongodb': { getDatabase: async () => db }, '@/lib/admin-scope': scopeLib,
    '@/lib/admin-users': users, '@/lib/admin-operations': operations, '@/lib/admin-job-input': jobInput,
    '@/lib/portal': { portalStore: store }, './contracts': contracts,
    '@/lib/storage': { createDownloadUrl: async key => { assert.equal(key, 'fixture-private-key'); calls.push(['sign-download']); return 'https://fixture.test/private?signature=test'; } },
  });
  const send = (route, method = 'GET', body) => adminPages(new Request(`https://fixture.test/api/mobile/${route}`, { method, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) }), route.split('?')[0].split('/'), principal);
  const safe = async response => {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('set-cookie'), null);
    const body = await response.json();
    const serialized = JSON.stringify(body);
    for (const secret of ['passwordHash', 'storageKey', 'private-db-id', 'fixture-private', '"consents"', '"metadata"']) assert.ok(!serialized.includes(secret), `Leaked ${secret}`);
    return body;
  };

  // Explicit dispatch contract and full permission matrix: blocked roles do no IO.
  assert.equal(await send('admin/jobs'), null);
  assert.equal(await send('candidate/reports'), null);
  for (const role of ['RECRUITER', 'PARTNER_ADMIN', 'ADMIN', 'SUPER_ADMIN']) {
    principal = admin(role);
    for (const section of ['reviews', 'privacy-requests', 'settings', 'team', 'audit-logs']) {
      const permitted = ['team', 'audit-logs'].includes(section) ? role === 'SUPER_ADMIN' : ['ADMIN', 'SUPER_ADMIN'].includes(role);
      calls = []; reads = [];
      const response = await send(`admin/${section}`);
      assert.equal(response.status, permitted ? 200 : 403, `${role} / ${section}`);
      if (!permitted) { assert.equal(calls.length, 0); assert.equal(reads.length, 0); }
      else await safe(response);
    }
  }
  principal = { kind: 'candidate' };
  assert.equal((await send('admin/reports')).status, 403);
  principal = admin();
  for (const [route, body] of [['reviews/REV-1', { status: 'APPROVED' }], ['privacy-requests/PRV-1', { status: 'IN_REVIEW' }], ['team/ADM-2', { status: 'ACTIVE' }]]) {
    calls = []; assert.equal((await send(`admin/${route}`, 'PATCH', body)).status, 403); assert.equal(calls.length, 0);
  }
  assert.equal((await send('admin/settings', 'POST', { companyName: 'Forbidden' })).status, 403);
  assert.equal((await send('admin/team', 'POST', {})).status, 403);

  // Reports preserve job, candidate, application and service scoping, including legacy categories.
  const expected = { jobs: ['JOB-S', 'JOB-LEGACY'], candidates: ['CAN-S'], applications: ['APP-S', 'APP-N', 'APP-D'], 'service-requests': ['SR-S'] };
  for (const [type, ids] of Object.entries(expected)) {
    const result = await safe(await send(`admin/reports?type=${type}`));
    assert.deepEqual(result.data.map(row => row.id), ids, type);
    assert.equal(result.total, ids.length);
  }
  assert.equal((await send('admin/reports?from=2026-02-30')).status, 400);
  assert.equal((await send('admin/reports?from=2026-09-03&to=2026-09-01')).status, 400);
  assert.equal((await send('admin/reports?type=unknown')).status, 400);
  assert.equal((await send('admin/reports?page=0')).status, 400);
  assert.equal((await safe(await send('admin/reports?from=2026-09-02'))).total, 0);
  assert.equal((await safe(await send('admin/reports?page=2'))).data.length, 0);
  principal = admin('ADMIN');
  assert.equal((await safe(await send('admin/reports?type=jobs'))).total, 3);

  // Review and privacy decisions are allowlisted; privacy completion cannot trigger deletion.
  await safe(await send('admin/reviews/REV-1', 'PATCH', { status: 'APPROVED' }));
  assert.equal((await send('admin/reviews/REV-1', 'PATCH', { status: 'PENDING' })).status, 400);
  assert.equal((await send('admin/reviews/REV-1', 'PATCH', { status: { $ne: '' } })).status, 400);
  assert.equal((await send('admin/reviews/missing', 'PATCH', { status: 'REJECTED' })).status, 404);
  assert.equal((await send('admin/reviews/REV-1', 'PATCH', '[]')).status, 400);
  assert.equal((await send('admin/reviews/REV-1', 'PATCH', '{bad')).status, 400);
  assert.equal((await send('admin/privacy-requests/PRV-1', 'PATCH', { status: 'COMPLETED' })).status, 400);
  assert.equal((await send('admin/privacy-requests/PRV-1', 'PATCH', { status: 'REJECTED', resolutionNote: ' ' })).status, 400);
  assert.equal((await send('admin/privacy-requests/PRV-1', 'PATCH', { status: 'IN_REVIEW', resolutionNote: 'x'.repeat(501) })).status, 400);
  await safe(await send('admin/privacy-requests/PRV-1', 'PATCH', { status: 'REJECTED', resolutionNote: 'Reviewed reason' }));

  // Site updates never accept storage keys or arbitrary settings fields.
  assert.equal((await send('admin/settings', 'POST', { companyName: ' ' })).status, 400);
  assert.equal((await send('admin/settings', 'POST', { logoKey: 'injected' })).status, 400);
  assert.equal((await send('admin/settings', 'POST', { facebookUrl: 'javascript:alert(1)' })).status, 400);
  assert.equal((await send('admin/settings', 'POST', { email: { $gt: '' } })).status, 400);
  await safe(await send('admin/settings', 'POST', { companyName: 'Updated', facebookUrl: 'https://example.test/' }));
  assert.equal(calls.findLast(call => call[0] === 'settings')[2], principal.user.email);

  // Team writes cannot grant roles, change scopes, or bypass protected super-admin status.
  principal = admin('SUPER_ADMIN');
  const newUser = { name: 'Partner', email: 'partner@example.test', password: 'long-fixture-password', businessVertical: 'SECURITY' };
  assert.equal((await send('admin/team', 'POST', { ...newUser, role: 'SUPER_ADMIN' })).status, 400);
  assert.equal((await send('admin/team', 'POST', { ...newUser, password: 'é'.repeat(37) })).status, 400);
  assert.equal((await send('admin/team', 'POST', { ...newUser, businessVertical: 'ANY' })).status, 400);
  assert.equal((await send('admin/team', 'POST', { ...newUser, email: 'duplicate@example.test' })).status, 409);
  const createdUser = await send('admin/team', 'POST', newUser);
  assert.equal(createdUser.status, 201); assert.equal((await createdUser.json()).data.passwordHash, undefined);
  await safe(await send('admin/team/ADM-2', 'PATCH', { status: 'SUSPENDED' }));
  assert.equal((await send('admin/team/ADM-SUPER', 'PATCH', { status: 'SUSPENDED' })).status, 404);
  assert.equal((await send('admin/audit-logs?from=wrong')).status, 400);

  // Account changes are bound to the authenticated actor; credential bytes are bounded.
  principal = admin();
  await safe(await send('admin/account'));
  assert.equal((await send('admin/account/password', 'PATCH', { currentPassword: 'incorrect', newPassword: 'new-fixture-password' })).status, 400);
  assert.equal((await send('admin/account/password', 'PATCH', { currentPassword: 'old', newPassword: 'é'.repeat(37) })).status, 400);
  assert.equal((await send('admin/account/password', 'PATCH', { currentPassword: 'same-password', newPassword: 'same-password' })).status, 400);
  assert.equal((await send('admin/account/password', 'PATCH', { currentPassword: 'old', newPassword: 'new-fixture-password', userId: 'OTHER' })).status, 400);
  const changed = await safe(await send('admin/account/password', 'PATCH', { currentPassword: 'old', newPassword: 'new-fixture-password' }));
  assert.equal(changed.reauthenticate, true);
  assert.equal(calls.findLast(call => call[0] === 'password')[1], principal.user.id);

  // Cross-scope IDs must fail before mutations; partial job edits preserve unedited fields.
  calls = [];
  assert.equal((await send('admin/job-edit/JOB-R')).status, 404);
  assert.equal((await send('admin/job-edit/JOB-R', 'PATCH', { title: 'Intrusion' })).status, 404);
  assert.equal(calls.length, 0);
  await safe(await send('admin/job-edit/JOB-S'));
  assert.equal((await safe(await send('admin/job-edit/JOB-LEGACY'))).data.businessVertical, 'SECURITY');
  assert.equal((await send('admin/job-edit/JOB-S', 'PATCH', { title: { $gt: '' } })).status, 400);
  assert.equal((await send('admin/job-edit/JOB-S', 'PATCH', { salaryMin: '100' })).status, 400);
  assert.equal((await send('admin/job-edit/JOB-S', 'PATCH', { vacancies: 1.5 })).status, 400);
  assert.equal((await send('admin/job-edit/JOB-S', 'PATCH', { benefits: [{}] })).status, 400);
  assert.equal((await send('admin/job-edit/JOB-S', 'PATCH', { publishNow: 'false' })).status, 400);
  assert.equal((await send('admin/job-edit/JOB-S', 'PATCH', { applicationDeadline: '2026-02-30' })).status, 400);
  await safe(await send('admin/job-edit/JOB-S', 'PATCH', { title: 'Updated', publishNow: true, businessVertical: 'RECRUITMENT' }));
  const jobCall = calls.find(call => call[0] === 'job');
  assert.equal(jobCall[2].businessVertical, 'SECURITY');
  assert.equal(jobCall[2].jobRole, 'Guard'); assert.deepEqual(plain(jobCall[2].benefits), ['Transport']);
  assert.equal(jobCall[3], security); assert.equal(jobCall[4], 'PUBLISHED');
  assert.ok(calls.some(call => call[0] === 'audit' && call[2] === 'JOB_UPDATED'));

  // Candidate DTOs omit private files; every read/write receives the business scope.
  assert.equal((await send('admin/candidate-verify/CAN-R')).status, 404);
  assert.equal((await send('admin/candidate-verify/CAN-R', 'PATCH', { verificationStatus: 'VERIFIED' })).status, 404);
  await safe(await send('admin/candidate-verify/CAN-S'));
  assert.equal((await send('admin/candidate-verify/CAN-S', 'PATCH', { verificationStatus: 'BLOCKED' })).status, 400);
  assert.equal((await send('admin/candidate-verify/CAN-S', 'PATCH', { verificationStatus: 'VERIFIED', adminNotes: 'x'.repeat(2001) })).status, 400);
  await safe(await send('admin/candidate-verify/CAN-S', 'PATCH', { verificationStatus: 'VERIFIED' }));
  const candidateCall = calls.findLast(call => call[0] === 'candidate-write');
  assert.equal(candidateCall[4], security); assert.equal(candidateCall[2].adminNotes, 'Keep this note');

  calls = [];
  assert.equal((await send('admin/candidate-verify/CAN-R/documents/RESUME/download', 'POST')).status, 404);
  assert.equal((await send('admin/candidate-verify/CAN-R/documents/RESUME', 'PATCH', { status: 'VERIFIED' })).status, 404);
  assert.ok(!calls.some(call => ['sign-download', 'document-write'].includes(call[0])));
  assert.equal((await send('admin/candidate-verify/CAN-S/documents/INVALID/download', 'POST')).status, 400);
  assert.equal((await send('admin/candidate-verify/CAN-S/documents/OTHER/download', 'POST')).status, 404);
  assert.equal((await send('admin/candidate-verify/CAN-S/documents/RESUME', 'PATCH', { status: 'REJECTED' })).status, 400);
  assert.equal((await send('admin/candidate-verify/CAN-S/documents/RESUME', 'PATCH', { status: 'VERIFIED', storageKey: 'injected' })).status, 400);
  await safe(await send('admin/candidate-verify/CAN-S/documents/RESUME', 'PATCH', { status: 'VERIFIED' }));
  const docWrite = calls.findLast(call => call[0] === 'document-write');
  assert.equal(docWrite[5], principal.user.email); assert.equal(docWrite[6], security);
  const download = await safe(await send('admin/candidate-verify/CAN-S/documents/RESUME/download', 'POST'));
  assert.equal(download.data.url, 'https://fixture.test/private?signature=test');
  assert.equal(calls.findLast(call => call[0] === 'document-read')[3], security);
  assert.deepEqual(calls.findLast(call => call[0] === 'document-access'), ['document-access', 'ADM-1', 'ADMIN', 'CAN-S', 'RESUME']);

  // Interview selection and scheduling require a scoped, live, shortlisted application.
  const shortlist = await safe(await send('admin/interview-schedule'));
  assert.deepEqual(shortlist.data.map(row => row.id), ['APP-S']);
  await safe(await send('admin/interview-schedule/APP-S'));
  assert.equal((await send('admin/interview-schedule/APP-R')).status, 404);
  assert.equal((await send('admin/interview-schedule/APP-N')).status, 404);
  const schedule = { applicationId: 'APP-S', scheduledAt: '2099-09-01T10:00:00+05:30', mode: 'VIDEO', meetingLink: 'https://example.test/meeting' };
  for (const applicationId of ['APP-R', 'APP-N', 'APP-D']) assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, applicationId })).status, 404);
  assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, candidateId: 'CAN-R' })).status, 400);
  assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, scheduledAt: '2000-01-01T00:00:00Z' })).status, 400);
  assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, scheduledAt: '2099-09-01T10:00:00' })).status, 400);
  assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, scheduledAt: '2099-09-01T24:00:00Z' })).status, 400);
  assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, meetingLink: 'javascript:alert(1)' })).status, 400);
  assert.equal((await send('admin/interview-schedule', 'POST', { ...schedule, mode: 'OFFLINE' })).status, 400);
  const scheduled = await send('admin/interview-schedule', 'POST', schedule);
  assert.equal(scheduled.status, 201);
  const interview = (await scheduled.json()).data;
  assert.equal(interview.storageKey, undefined); assert.equal(interview.candidateId, 'CAN-S'); assert.equal(interview.jobId, 'JOB-S');
  assert.equal(calls.findLast(call => call[0] === 'schedule')[2], security);
  principal = admin('ADMIN');
  assert.equal((await send('admin/reviews/REV-1/extra')).status, 404);
  assert.equal((await send('admin/reviews', 'DELETE')).status, 405);
  assert.equal((await send('admin/account/password', 'PATCH', JSON.stringify({ currentPassword: 'x'.repeat(17000) }))).status, 413);

  console.log('Admin extension isolated checks passed: role matrix, scoped reports and ID access, projected DTOs, validation, moderation, team, settings, password, candidate verification and linked interview scheduling. No live database or network used.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
