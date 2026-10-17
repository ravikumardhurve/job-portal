/* eslint-disable @typescript-eslint/no-require-imports -- Isolated checks: never import DB configuration or credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, expose = '') {
  const loaded = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(`${code}\n${expose}`, { module: loaded, exports: loaded.exports, Request, Response, URL, Date, Error, Buffer,
    require(id) { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error(`Unmocked dependency: ${id}`); },
  });
  return loaded.exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some(item => matches(row, item));
    const actual = row[key];
    if (expected && typeof expected === 'object') {
      if ('$in' in expected && !expected.$in.includes(actual)) return false;
      if ('$exists' in expected && (actual !== undefined) !== expected.$exists) return false;
      if ('$regex' in expected && !new RegExp(expected.$regex, expected.$options).test(actual ?? '')) return false;
      if ('$not' in expected && matches({ value: actual }, { value: expected.$not })) return false;
      return true;
    }
    return actual === expected;
  });
}

async function main() {
  const scopeLib = load('src/lib/admin-scope.ts');
  const contracts = load('src/lib/mobile/contracts.ts');
  const statuses = load('src/lib/statuses.ts');
  const secret = { _id: 'secret-id', passwordHash: 'secret-password', storageKey: 'secret-storage', metadata: { secret: true } };
  const rows = { jobs: [], applications: [], interviews: [], serviceRequests: [], employerRequirements: [], auditLogs: [] };
  for (const [suffix, businessVertical] of [['S', 'SECURITY'], ['R', 'RECRUITMENT'], ['L', undefined]]) {
    rows.jobs.push({ id: `JOB-${suffix}`, businessVertical, category: businessVertical ?? 'Security guard' });
    rows.applications.push({ id: `APP-${suffix}`, jobId: `JOB-${suffix}`, candidateId: `CAN-${suffix}`, status: 'APPLIED', statusHistory: [{ status: 'APPLIED', at: '2026-09-01T00:00:00Z', ...secret }], ...secret });
    rows.interviews.push({ id: `INT-${suffix}`, applicationId: `APP-${suffix}`, candidateId: `CAN-${suffix}`, jobId: `JOB-${suffix}`, status: 'SCHEDULED', scheduledAt: '2099-01-01T00:00:00Z', mode: 'OFFLINE', address: 'Office', internalNotes: 'Keep interview note', ...secret });
    rows.serviceRequests.push({ id: `SR-${suffix}`, serviceType: suffix === 'R' ? 'MANPOWER' : 'SECURITY', status: 'NEW', assignedStaff: 'Staff', assignedVendor: 'Vendor', scheduledAt: '2099-01-01T00:00:00Z', internalNotes: 'Keep service note', ...secret });
    rows.employerRequirements.push({ id: `ER-${suffix}`, businessVertical, category: businessVertical ?? 'Security guard', status: 'NEW', assignedTo: 'Recruiter', internalNotes: 'Keep employer note', nextFollowUpAt: '2099-01-01T00:00:00Z', ...secret });
  }
  rows.applications.push({ ...rows.applications[0], id: 'APP-DELETED', deletedAt: '2026-09-01' });
  let reads = 0, writes = 0;
  function update(collection, filter, change) {
    writes++;
    const row = rows[collection].find(item => matches(item, filter));
    if (!row) return null;
    Object.assign(row, change.$set);
    for (const [key, item] of Object.entries(change.$push ?? {})) (row[key] ??= []).push(item);
    return row;
  }
  const db = { collection(name) {
    assert.ok(Object.hasOwn(rows, name), `Unexpected collection ${name}`);
    return {
      find(filter) { reads++; return { toArray: async () => rows[name].filter(row => matches(row, filter)) }; },
      async findOne(filter) { reads++; const row = rows[name].find(item => matches(item, filter)); return row ? plain(row) : null; },
      async findOneAndUpdate(filter, change) { return update(name, filter, change); },
      async updateOne(filter, change) { return update(name, filter, change); },
      async insertOne(row) { writes++; rows[name].push(row); },
    };
  } };
  const database = { getDatabase: async () => db, withMongoTransaction: async action => action(db, { fixture: true }) };
  // Exercise the real interview/service/employer operations, including linked statuses and audit.
  const operations = load('src/lib/admin-operations.ts', { '@/lib/mongodb': database, '@/lib/admin-scope': scopeLib });
  const portalStore = { async updateApplicationStatus(id, status, scope) {
    const jobs = rows.jobs.filter(job => matches(job, scopeLib.jobScopeFilter(scope))).map(job => job.id);
    return update('applications', { id, ...(scope.all ? {} : { jobId: { $in: jobs } }) }, { $set: { status }, $push: { statusHistory: { status, at: '2026-09-28T00:00:00Z' } } });
  } };
  const { recordPages } = load('src/lib/mobile/record-pages.ts', { '@/lib/mongodb': database, '@/lib/admin-scope': scopeLib, '@/lib/admin-operations': operations, '@/lib/portal': { portalStore }, '@/lib/statuses': statuses, './contracts': contracts });
  const admin = (role = 'RECRUITER', verticals = ['SECURITY']) => ({ kind: 'admin', user: { id: 'ADM-1', role }, scope: { all: ['ADMIN', 'SUPER_ADMIN'].includes(role), verticals } });
  let principal = admin();
  const send = (route, method = 'GET', body) => recordPages(new Request(`https://fixture.test/${route}`, { method, ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }) }), route.split('/'), principal);
  const routes = { applications: 'APP', interviews: 'INT', services: 'SR', requirements: 'ER' };
  async function safe(response) {
    assert.equal(response.status, 200, await response.clone().text());
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const body = await response.json();
    for (const text of ['secret-', 'passwordHash', 'storageKey', 'metadata']) assert.ok(!JSON.stringify(body).includes(text), `Leaked ${text}`);
    return body;
  }
  async function blocked(route, body, status = 400) {
    const before = writes;
    assert.equal((await send(route, 'PATCH', body)).status, status, JSON.stringify(body));
    assert.equal(writes, before, 'Rejected payload wrote data');
  }
  assert.equal(await send('admin/applications'), null);
  assert.equal(await send('candidate/records/applications/APP-S'), null);
  for (const role of ['RECRUITER', 'PARTNER_ADMIN', 'ADMIN', 'SUPER_ADMIN']) {
    principal = admin(role);
    for (const [section, prefix] of Object.entries(routes)) {
      await safe(await send(`admin/records/${section}/${prefix}-S`));
      await safe(await send(`admin/records/${section}/${prefix}-L`));
      assert.equal((await send(`admin/records/${section}/${prefix}-R`)).status, principal.scope.all ? 200 : 404);
      if (!principal.scope.all) await blocked(`admin/records/${section}/${prefix}-R`, { status: 'REJECTED', confirmed: true }, 404);
      await safe(await send(`admin/records/${section}/${prefix}-S`, 'PATCH', { status: section === 'applications' ? 'UNDER_REVIEW' : section === 'interviews' ? 'SCHEDULED' : 'CONTACTED' }));
    }
  }
  for (const invalid of [{ kind: 'candidate' }, admin('VIEWER')]) {
    principal = invalid;
    const beforeReads = reads;
    for (const [section, prefix] of Object.entries(routes)) {
      assert.equal((await send(`admin/records/${section}/${prefix}-S`)).status, 403);
      await blocked(`admin/records/${section}/${prefix}-S`, { status: 'REJECTED' }, 403);
    }
    assert.equal(reads, beforeReads);
  }
  principal = admin('RECRUITER', []);
  for (const [section, prefix] of Object.entries(routes)) assert.equal((await send(`admin/records/${section}/${prefix}-S`)).status, 404);
  principal = admin();
  assert.equal((await send('admin/records/applications/APP-DELETED')).status, 404);
  await blocked('admin/records/applications/APP-DELETED', { status: 'REJECTED', confirmed: true }, 404);
  for (const route of ['admin/records/jobs/JOB-S', 'admin/records/services/SR-S/extra', 'admin/records/services/$ne']) assert.equal((await send(route)).status, 404);
  assert.equal((await send('admin/records/services/SR-S', 'DELETE')).status, 405);
  for (const [section, prefix] of Object.entries(routes)) {
    const route = `admin/records/${section}/${prefix}-S`;
    for (const payload of [{}, [], '{bad', { status: { $ne: '' } }, { status: 'INVENTED' }, { id: 'OTHER' }, { jobId: 'JOB-R' }, { confirmed: 'yes', status: 'NEW' }, { $set: { status: 'NEW' } }]) await blocked(route, payload);
    await blocked(route, { internalNotes: 'x'.repeat(17000) }, 413);
  }
  const app = 'admin/records/applications/APP-S';
  assert.equal((await safe(await send(app))).statuses.length, 10);
  await blocked(app, { internalNotes: 'No invented notes workflow' });
  await blocked(app, { status: 'REJECTED' });
  await safe(await send(app, 'PATCH', { status: 'REJECTED', confirmed: true }));
  assert.equal(rows.applications[0].statusHistory.at(-1).status, 'REJECTED');
  const interview = 'admin/records/interviews/INT-S';
  for (const payload of [{ mode: 'REMOTE' }, { scheduledAt: '2099-02-30T10:00:00+05:30' }, { scheduledAt: '2099-01-01T10:00' }, { scheduledAt: '2000-01-01T10:00:00Z' }, { scheduledAt: '' }, { status: 'RESCHEDULED' }, { status: 'CANCELLED', confirmed: true }, { meetingLink: 'javascript:alert(1)' }, { contactMobile: 'abc' }, { internalNotes: null }, { internalNotes: 'x'.repeat(2001) }]) await blocked(interview, payload);
  await safe(await send(interview, 'PATCH', { scheduledAt: '2099-03-01T10:00:00+05:30' }));
  assert.equal(rows.interviews[0].scheduledAt, '2099-03-01T04:30:00.000Z');
  assert.equal(rows.interviews[0].status, 'RESCHEDULED');
  assert.equal(rows.interviews[0].internalNotes, 'Keep interview note');
  for (const [status, linked] of [['COMPLETED', 'INTERVIEWED'], ['SELECTED', 'SELECTED'], ['REJECTED', 'REJECTED']]) {
    await safe(await send(interview, 'PATCH', { status, confirmed: true }));
    assert.equal(rows.applications[0].status, linked);
    assert.equal(rows.applications[0].statusHistory.at(-1).status, linked);
  }
  await blocked(interview, { status: 'CANCELLED', cancelReason: 'Reason' });
  await safe(await send(interview, 'PATCH', { status: 'CANCELLED', cancelReason: 'Employer unavailable', confirmed: true }));
  await safe(await send(interview, 'PATCH', { internalNotes: 'Notes only' }));
  assert.equal(rows.interviews[0].scheduledAt, '2099-03-01T04:30:00.000Z');
  const service = 'admin/records/services/SR-S';
  await blocked(service, { assignedStaff: {} });
  await blocked(service, { status: 'CANCELLED' });
  await safe(await send(service, 'PATCH', { internalNotes: 'Updated' }));
  assert.equal(rows.serviceRequests[0].assignedStaff, 'Staff');
  assert.equal(rows.serviceRequests[0].assignedVendor, 'Vendor');
  await safe(await send(service, 'PATCH', { assignedStaff: '', scheduledAt: '', assignedVendor: 'New vendor' }));
  assert.equal(rows.serviceRequests[0].scheduledAt, '');
  const employer = 'admin/records/requirements/ER-S';
  await blocked(employer, { status: 'CLOSED' });
  await blocked(employer, { assignedTo: 'x'.repeat(121) });
  await blocked(employer, { nextFollowUpAt: '2099-13-01T10:00:00Z' });
  await safe(await send(employer, 'PATCH', { internalNotes: 'Notes only' }));
  assert.equal(rows.employerRequirements[0].assignedTo, 'Recruiter');
  assert.equal(rows.employerRequirements[0].nextFollowUpAt, '2099-01-01T00:00:00Z');
  assert.equal(rows.employerRequirements[0].status, 'CONTACTED');
  await safe(await send(employer, 'PATCH', { status: 'APPROVED' }));
  assert.equal(rows.employerRequirements[0].internalNotes, 'Notes only');
  await safe(await send(employer, 'PATCH', { assignedTo: '', internalNotes: '', nextFollowUpAt: '' }));
  assert.equal(rows.employerRequirements[0].internalNotes, '');
  assert.ok(rows.auditLogs.some(row => row.action === 'INTERVIEW_RESCHEDULED' && row.actorId === 'ADM-1'));
  assert.ok(rows.auditLogs.some(row => row.action === 'SERVICE_REQUEST_UPDATED'));
  assert.ok(rows.auditLogs.some(row => row.action === 'EMPLOYER_REQUIREMENT_UPDATED'));

  // Test native payload construction and the actual Save handler's confirmation gate.
  let state = [], cursor = 0, buttons, apiCalls = [];
  const react = { useState(initial) { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next; }]; }, useRef(initial) { const index = cursor++; return state[index] ??= { current: initial }; }, useEffect() {} };
  const jsx = (type, props) => ({ type, props });
  const ui = Object.fromEntries(['Badge', 'Button', 'Card', 'Empty', 'Field', 'Loading', 'Notice'].map(name => [name, name]));
  const native = load('mobile/src/screens/RecordActions.tsx', { react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View' }, '../alert': { Alert: { alert(_title, _message, actions) { buttons = actions; } } }, '../api': { errorMessage: error => error.message }, '../session': { useSession: () => ({ api: async (...args) => { apiCalls.push(args); } }) }, '../ui': { ...ui, human: text => text, colors: {}, styles: {} } }, 'module.exports.test = { inIST, fromIST, changes, RecordForm };').test;
  assert.equal(native.inIST('2099-03-01T04:30:00Z'), '2099-03-01T10:00');
  assert.equal(native.inIST('2099-03-01T10:00'), '2099-03-01T10:00');
  assert.equal(native.fromIST('2099-03-01T10:00', true), '2099-03-01T10:00:00+05:30');
  assert.throws(() => native.fromIST('2099-02-30T10:00', true));
  assert.throws(() => native.fromIST('', true));
  assert.deepEqual(plain(native.changes('requirements', { status: 'NEW', assignedTo: 'Keep', internalNotes: 'Old' }, { status: 'NEW', assignedTo: 'Keep', internalNotes: 'New' })), { internalNotes: 'New' });
  const props = { section: 'applications', path: app, result: { data: { id: 'APP-S', status: 'APPLIED' }, statuses: ['APPLIED', 'REJECTED'] }, done() {} };
  const render = () => { cursor = 0; return native.RecordForm(props); };
  const find = (node, predicate) => { if (!node || typeof node !== 'object') return; if (predicate(node)) return node; for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, predicate); if (match) return match; } };
  let tree = render();
  find(tree, node => node.props?.label === 'Status').props.onChange('REJECTED');
  tree = render();
  find(tree, node => node.props?.label === 'Save changes').props.onPress();
  assert.equal(apiCalls.length, 0, 'Save bypassed confirmation');
  assert.equal(buttons[0].style, 'cancel');
  buttons[1].onPress();
  await Promise.resolve();
  assert.equal(apiCalls.length, 1);
  assert.deepEqual(plain(apiCalls[0][1].body), { status: 'REJECTED', confirmed: true });
  console.log('Record checks passed: role/scope matrix, safe DTOs, strict payloads, confirmations, IST dates, partial updates, real linked interview operations/audit, native Save gate. No live DB or network.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
