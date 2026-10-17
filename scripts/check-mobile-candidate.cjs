/* eslint-disable @typescript-eslint/no-require-imports -- Isolated transpilation harness; all stores and storage are mocked. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, globals = {}) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, Response, Request, URL, Buffer, console, Date, Error,
    require(id) { if (Object.hasOwn(mocks, id)) return mocks[id]; if (id === 'node:crypto') return require(id); throw new Error(`Unmocked import forbidden: ${id}`); },
    ...globals,
  });
  return compiledModule.exports;
}

async function checkUploadIntegrity() {
  // Exercise the real shared signer and web multipart helper. Fake credentials
  // live only in this VM; the mock provider never contacts Cloudinary.
  const signatures = new Map(), assets = new Map(), forms = [];
  const storage = load('src/lib/storage.ts', { cloudinary: { v2: {
    config() {},
    utils: { api_sign_request(params, secret) {
      assert.equal(secret, 'fixture-secret');
      const signature = `fixture-signature-${signatures.size}`;
      signatures.set(signature, JSON.parse(JSON.stringify(params)));
      return signature;
    } },
  } } }, { process: { env: { CLOUDINARY_CLOUD_NAME: 'fixture-cloud', CLOUDINARY_API_KEY: 'fixture-key', CLOUDINARY_API_SECRET: 'fixture-secret' } } });
  const { uploadDirectlyToCloudinary } = load('src/lib/cloudinary-upload.ts', {}, {
    FormData,
    async fetch(url, { body: form }) {
      const expected = signatures.get(form.get('signature'));
      const signedFields = Object.fromEntries([...form.entries()].filter(([key]) => !['file', 'api_key', 'signature'].includes(key)).map(([key, value]) => [key, String(value)]));
      forms.push(signedFields);
      assert.match(url, /^https:\/\/api\.cloudinary\.com\/v1_1\/fixture-cloud\/(image|raw)\/upload$/);
      if (!expected || JSON.stringify(Object.entries(signedFields).sort()) !== JSON.stringify(Object.entries(expected).map(([key, value]) => [key, String(value)]).sort())) return Response.json({ error: { message: 'Invalid signature' } }, { status: 401 });
      const resource = url.includes('/raw/') ? 'raw' : 'image';
      const id = `${resource}:${form.get('public_id')}`;
      if (!assets.has(id) || form.get('overwrite') !== 'false') assets.set(id, await form.get('file').text());
      return Response.json({ public_id: form.get('public_id'), resource_type: resource, type: form.get('type') || 'upload', bytes: assets.get(id).length });
    },
  });
  for (const resource of ['image', 'raw']) {
    const publicId = `candidates/C1/RESUME/fixture-${resource}${resource === 'raw' ? '.docx' : ''}`;
    const signature = storage.createUploadSignature(publicId, resource, 'authenticated');
    assert.equal(signature.overwrite, false);
    assert.equal(signatures.get(signature.signature).overwrite, 'false', 'Immutability must be covered by the signature');
    await uploadDirectlyToCloudinary(new Blob(['reviewed bytes']), signature);
    assert.equal(forms.at(-1).overwrite, 'false', 'Web client must forward the signed field');
    await uploadDirectlyToCloudinary(new Blob(['replacement bytes']), signature);
    assert.equal(assets.get(`${resource}:${publicId}`), 'reviewed bytes', 'A replay must not replace the stored bytes');
    await assert.rejects(() => uploadDirectlyToCloudinary(new Blob(['replacement']), { ...signature, overwrite: undefined }), /Invalid signature/);
    await assert.rejects(() => uploadDirectlyToCloudinary(new Blob(['replacement']), { ...signature, overwrite: true }), /Invalid signature/);
  }
  const publicSignature = storage.createUploadSignature('site-assets/LOGO/fixture', 'image', 'upload');
  assert.equal(Object.hasOwn(publicSignature, 'overwrite'), false, 'Public asset signature contract stays unchanged');
  await uploadDirectlyToCloudinary(new Blob(['public logo']), publicSignature);
  assert.equal(Object.hasOwn(forms.at(-1), 'overwrite'), false);
  // The unmodified web presign route must also return the immutable contract.
  const web = load('src/app/api/candidate/documents/presign/route.ts', {
    '@/lib/candidate-auth': { getCandidateSession: async () => ({ candidateId: 'C1' }) },
    '@/lib/portal': { portalStore: { recordCandidateDocumentConsent: async () => {} } },
    '@/lib/privacy': { DOCUMENT_CONSENT_VERSION: 'v1' }, '@/lib/storage': storage,
  });
  const response = await web.POST(new Request('https://fixture.test/api/candidate/documents/presign', { method: 'POST', body: JSON.stringify({ type: 'RESUME', fileName: 'resume.pdf', contentType: 'application/pdf', fileSize: 10, consent: true }) }));
  assert.equal(response.status, 200);
  const signature = (await response.json()).data;
  assert.equal(signature.overwrite, false);
  await uploadDirectlyToCloudinary(new Blob(['web document']), signature);
  return storage;
}

async function main() {
  const signingStorage = await checkUploadIntegrity();
  const contracts = load('src/lib/mobile/contracts.ts');
  const calls = [], mutations = [];
  const privateFields = { _id: 'MONGO_SECRET', passwordHash: 'HASH_SECRET', adminNotes: 'NOTES_SECRET', blockReason: 'BLOCK_SECRET', internalNotes: 'INTERNAL_SECRET', resolvedBy: 'STAFF_SECRET', deliveryError: 'DELIVERY_SECRET' };
  let candidate = { ...privateFields, id: 'C1', fullName: 'Fixture Candidate', mobile: '9000000000', verificationStatus: 'PENDING', profileCompletion: 65,
    currentAddress: { city: 'Raipur', ...privateFields }, permanentAddress: { city: 'Durg', ...privateFields }, jobPreference: { role: 'Guard', ...privateFields },
    experienceType: 'EXPERIENCED', consents: { privacyPolicyVersion: 'v1', termsVersion: 'v1', documentProcessingVersion: 'v1', ...privateFields }, createdAt: '2026-01-01' };
  let document = null, latestRequest = null, head = { ContentLength: 10, Format: 'pdf' }, deletionWorks = true;
  const notifications = [{ ...privateFields, id: 'N1', title: 'Public candidate update', message: 'Fixture', read: false, createdAt: '2026-01-01' }];
  const education = { ...privateFields, qualification: 'Graduate', course: 'BA' }, experience = { ...privateFields, company: 'Fixture employer' };
  const scoped = (name, operation, write = false) => async (id, ...args) => {
    assert.equal(id, 'C1', `${name} must use the authenticated owner`);
    calls.push([name, id, ...args]); if (write) mutations.push([name, id, ...args]);
    return operation(...args);
  };
  const store = {
    getCandidateById: scoped('getCandidateById', () => candidate),
    getCandidateEducation: scoped('getCandidateEducation', () => education),
    getCandidateExperience: scoped('getCandidateExperience', () => experience),
    updateCandidateProfile: scoped('updateCandidateProfile', input => ({ ...candidate, ...input }), true),
    updateCandidateAddress: scoped('updateCandidateAddress', input => ({ ...candidate, ...input }), true),
    upsertCandidateEducation: scoped('upsertCandidateEducation', () => candidate, true),
    upsertCandidateExperience: scoped('upsertCandidateExperience', () => candidate, true),
    updateCandidateJobPreference: scoped('updateCandidateJobPreference', preference => ({ ...candidate, jobPreference: preference }), true),
    listCandidateApplications: scoped('listCandidateApplications', () => [{ ...privateFields, id: 'APP1', jobId: 'J1', status: 'APPLIED', appliedAt: '2026-01-01', statusHistory: [] }]),
    listCandidateInterviews: scoped('listCandidateInterviews', () => [
      { ...privateFields, id: 'PAST', status: 'SCHEDULED', scheduledAt: '2000-01-01' },
      { ...privateFields, id: 'LATER', status: 'SCHEDULED', scheduledAt: '2099-02-01' },
      { ...privateFields, id: 'NEXT', status: 'RESCHEDULED', scheduledAt: '2099-01-01' },
      { ...privateFields, id: 'CANCELLED', status: 'CANCELLED', scheduledAt: '2099-01-01' },
    ]),
    listSavedJobIds: scoped('listSavedJobIds', () => ['J1']),
    listCandidateNotifications: scoped('listCandidateNotifications', () => notifications),
    markNotificationRead: scoped('markNotificationRead', () => undefined, true),
    markAllNotificationsRead: scoped('markAllNotificationsRead', () => undefined, true),
    listCandidateDocuments: scoped('listCandidateDocuments', () => document ? [document] : []),
    getCandidateDocument: scoped('getCandidateDocument', () => document),
    recordCandidateDocumentConsent: scoped('recordCandidateDocumentConsent', () => undefined, true),
    confirmCandidateDocument: scoped('confirmCandidateDocument', (type, storageKey) => { const old = document?.storageKey; document = { ...privateFields, type, storageKey, status: 'PENDING', createdAt: '2026-01-01' }; return { candidate, replacedStorageKey: old }; }, true),
    deleteCandidateDocument: scoped('deleteCandidateDocument', () => { document = null; }, true),
    logCandidateDocumentAccess: scoped('logCandidateDocumentAccess', (role, id) => { assert.equal(role, 'CANDIDATE'); assert.equal(id, 'C1'); }, true),
    getCandidatePrivacySummary: scoped('getCandidatePrivacySummary', () => ({ consents: candidate.consents, latestRequest, accountCreatedAt: candidate.createdAt })),
    recordCandidatePolicyConsent: scoped('recordCandidatePolicyConsent', () => undefined, true),
    createCandidateDataDeletionRequest: scoped('createCandidateDataDeletionRequest', reason => {
      if (latestRequest && ['SUBMITTED', 'IN_REVIEW'].includes(latestRequest.status)) throw new Error('PRIVACY_REQUEST_EXISTS');
      latestRequest = { ...privateFields, id: 'P1', status: 'SUBMITTED', reason, createdAt: '2026-01-01' }; return latestRequest;
    }, true),
    cancelCandidateDataDeletionRequest: scoped('cancelCandidateDataDeletionRequest', () => {
      if (latestRequest?.status !== 'SUBMITTED') throw new Error('PRIVACY_REQUEST_NOT_FOUND'); latestRequest.status = 'CANCELLED'; return latestRequest;
    }, true),
    getCandidateDataExport: scoped('getCandidateDataExport', () => ({ exportedAt: '2026-01-01', candidate, education, experience, documents: document ? [document] : [],
      applications: [{ ...privateFields, id: 'A1', statusHistory: [{ ...privateFields, status: 'APPLIED', at: '2026-01-01' }] }], interviews: [{ ...privateFields, id: 'I1' }], savedJobs: [{ ...privateFields, jobId: 'J1' }], privacyRequests: latestRequest ? [latestRequest] : [] })),
  };
  const storageCalls = [];
  const storage = {
    DOCUMENT_UPLOAD_RULES: { RESUME: { mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], maxSizeBytes: 100 }, PHOTO: { mimeTypes: ['image/jpeg', 'image/png'], maxSizeBytes: 20 } },
    createCloudinaryStorageKey: a => `cloudinary:${a.resourceType}:${a.deliveryType}:${a.format || '-'}:${encodeURIComponent(a.publicId)}`,
    storageKeyBelongsTo: (key, prefix) => decodeURIComponent(key.split(':')[4]).startsWith(prefix),
    createUploadSignature: signingStorage.createUploadSignature,
    headObject: async key => { storageCalls.push(['head', key]); return head; },
    deleteObject: async key => { storageCalls.push(['delete', key]); return deletionWorks; },
    createDownloadUrl: async key => { storageCalls.push(['download', key]); return 'https://fixture.test/private-signed'; },
  };
  const { candidatePages } = load('src/lib/mobile/candidate-pages.ts', { '@/lib/portal': { portalStore: store }, '@/lib/privacy': { DOCUMENT_CONSENT_VERSION: 'v1', PRIVACY_POLICY_VERSION: 'v1', TERMS_VERSION: 'v1', retentionReviewDate: () => '2028-01-01' }, '@/lib/storage': storage, './contracts': contracts });
  const principal = { kind: 'candidate', user: { id: 'C1' }, tokenHash: 'fixture' };
  const send = (route, method = 'GET', body, session = principal) => candidatePages(new Request(`https://fixture.test/api/mobile/${route}?candidateId=C2`, { method, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }), route.split('/'), session);
  const safe = value => { const raw = JSON.stringify(value); for (const secret of Object.values(privateFields)) assert.ok(!raw.includes(secret), `Leaked ${secret}`); assert.ok(!raw.includes('cloudinary:'), 'Leaked storage key'); return value; };
  const data = async response => safe((await response.json()).data);
  async function rejects(route, method, body, status = 400) {
    const before = mutations.length;
    await assert.rejects(() => send(route, method, body), error => error.status === status);
    assert.equal(mutations.length, before, `Rejected ${route} mutated a store`);
  }

  assert.equal(await send('candidate/not-handled'), null);
  assert.equal(await send('admin/dashboard'), null);
  await assert.rejects(() => send('candidate/dashboard', 'GET', undefined, { kind: 'admin', user: { id: 'C2' } }), error => error.status === 403);
  assert.equal(calls.length, 0, 'Wrong role must not read candidate stores');
  assert.equal((await send('candidate/education', 'DELETE')).status, 405);
  const fullResponse = await send('candidate/profile-edit');
  assert.equal(fullResponse.headers.get('cache-control'), 'private, no-store');
  const full = await data(fullResponse); assert.equal(full.candidate.id, 'C1'); assert.equal(full.education.course, 'BA'); assert.equal(full.experience.company, 'Fixture employer');
  const dashboard = await data(await send('candidate/dashboard')); assert.equal(dashboard.nextInterview.id, 'NEXT'); assert.equal(dashboard.counts.interviews, 2); assert.equal(dashboard.counts.unread, 1);
  for (const route of ['education', 'experience', 'documents', 'notifications', 'privacy']) await data(await send(`candidate/${route}`));
  const oldCandidate = candidate; candidate = { ...candidate, verificationStatus: 'BLOCKED' }; await assert.rejects(() => send('candidate/dashboard'), error => error.status === 401); candidate = null; await assert.rejects(() => send('candidate/dashboard'), error => error.status === 401); candidate = oldCandidate;

  await rejects('candidate/profile-edit', 'PATCH', { email: 'x@y.test', candidateId: 'C2' });
  await rejects('candidate/profile-edit', 'PATCH', { email: { $ne: '' } });
  await rejects('candidate/profile-edit', 'PATCH', { email: 'invalid' });
  await rejects('candidate/profile-edit', 'PATCH', { passwordHash: 'new', adminNotes: 'x' });
  await data(await send('candidate/profile-edit', 'PATCH', { email: 'new@example.test' }));
  await rejects('candidate/education', 'POST', '{bad'); await rejects('candidate/education', 'POST', '[]');
  await rejects('candidate/education', 'POST', { qualification: 'Graduate', passingYear: '209X' });
  await rejects('candidate/education', 'POST', { qualification: 'Not a qualification' });
  await data(await send('candidate/education', 'POST', { qualification: 'Graduate', passingYear: '2020', percentage: 'A grade' }));
  await rejects('candidate/experience', 'POST', { experienceType: 'EXPERIENCED', totalExperienceYears: -1 });
  await rejects('candidate/experience', 'POST', { experienceType: 'EXPERIENCED', startDate: '2020-02-30' });
  await rejects('candidate/experience', 'POST', { experienceType: 'EXPERIENCED', startDate: '2020-02-20', endDate: '2020-02-19' });
  await data(await send('candidate/experience', 'POST', { experienceType: 'FRESHER' }));
  assert.equal(mutations.at(-1)[2].totalExperienceYears, 0);
  await rejects('candidate/address', 'POST', { currentAddress: { city: 'Raipur', pincode: 'bad' } });
  await rejects('candidate/address', 'POST', { currentAddress: { city: 'Raipur', adminNotes: 'x' } });
  await data(await send('candidate/address', 'POST', { currentAddress: { city: 'Raipur', pincode: '492001' }, permanentAddress: { sameAsCurrent: true } }));
  assert.equal(mutations.at(-1)[2].permanentAddress.city, 'Raipur');
  await rejects('candidate/job-preference', 'POST', { role: 'Guard', expectedSalaryMin: 200, expectedSalaryMax: 100 });
  await rejects('candidate/job-preference', 'POST', { role: 'Guard', jobType: 'UNSAFE' });
  await rejects('candidate/job-preference', 'POST', { role: 'Guard', immediateJoining: 'yes' });
  await data(await send('candidate/job-preference', 'POST', { role: 'Guard', expectedSalaryMin: 100, expectedSalaryMax: 200, jobType: 'FULL_TIME', shift: 'DAY', immediateJoining: true }));
  await rejects('candidate/notifications/read', 'POST', { notificationId: 'PRIVATE_C2' }, 404);
  await rejects('candidate/notifications/read', 'POST', { all: 'true' });
  await rejects('candidate/notifications/read', 'POST', { all: true, candidateId: 'C2' });
  await send('candidate/notifications/read', 'POST', { notificationId: 'N1' }); await send('candidate/notifications/read', 'POST', { all: true });

  const presign = { type: 'RESUME', fileName: 'resume.pdf', contentType: 'application/pdf', fileSize: 10, consent: true };
  for (const changed of [{ fileSize: -1 }, { fileSize: 101 }, { fileSize: 0 }, { fileSize: 1.5 }, { fileSize: '10' }, { contentType: 'text/html' }, { consent: false }, { type: '__proto__' }, { candidateId: 'C2' }]) await rejects('candidate/documents/presign', 'POST', { ...presign, ...changed });
  const signed = await data(await send('candidate/documents/presign', 'POST', presign));
  assert.ok(signed.publicId.startsWith('candidates/C1/RESUME/')); assert.equal(signed.deliveryType, 'authenticated');
  assert.equal(signed.overwrite, false, 'Mobile must receive the immutable upload contract');
  const confirm = { type: 'RESUME', publicId: signed.publicId, resourceType: 'image', deliveryType: 'authenticated' };
  const storageBefore = storageCalls.length;
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, publicId: 'candidates/C2/RESUME/file' }, 403);
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, publicId: 'candidates/C10/RESUME/file' }, 403);
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, publicId: 'candidates/C1/PHOTO/file' }, 403);
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, publicId: 'candidates/C1/RESUME/../../C2/file' });
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, publicId: 'candidates/C1/RESUME/%2e%2e%2fC2' });
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, deliveryType: 'upload' });
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, format: 'pdf' });
  assert.equal(storageCalls.length, storageBefore, 'Foreign uploads must not reach storage');
  candidate = { ...oldCandidate, consents: {} }; await rejects('candidate/documents/confirm', 'POST', confirm); candidate = oldCandidate;
  for (const invalid of [null, { ContentLength: 0, Format: 'pdf' }, { ContentLength: 101, Format: 'pdf' }, { ContentLength: 10, Format: 'html' }, { ContentLength: 10, Format: '' }]) { head = invalid; await rejects('candidate/documents/confirm', 'POST', confirm); }
  head = { ContentLength: 10, Format: 'pdf' };
  await data(await send('candidate/documents/confirm', 'POST', confirm));
  const confirmations = mutations.filter(m => m[0] === 'confirmCandidateDocument').length;
  document.status = 'VERIFIED';
  head = { ContentLength: 99, Format: 'pdf' };
  const deletesBeforeRetry = storageCalls.filter(call => call[0] === 'delete').length;
  await data(await send('candidate/documents/confirm', 'POST', confirm));
  assert.equal(mutations.filter(m => m[0] === 'confirmCandidateDocument').length, confirmations + 1, 'A matching key is not proof of unchanged legacy content');
  assert.equal(document.status, 'PENDING', 'Changed legacy bytes must not retain VERIFIED status');
  assert.equal(storageCalls.filter(call => call[0] === 'delete').length, deletesBeforeRetry, 'Reconfirmation must not delete the same stored object');
  head = { ContentLength: 10, Format: 'pdf' };
  await data(await send('candidate/documents')); await data(await send('candidate/documents/download', 'POST', { type: 'RESUME' }));
  const savedDocument = document; document = { ...document, storageKey: storage.createCloudinaryStorageKey({ resourceType: 'image', deliveryType: 'authenticated', format: 'pdf', publicId: 'candidates/C2/RESUME/file' }) };
  await rejects('candidate/documents/download', 'POST', { type: 'RESUME' }, 403); await rejects('candidate/documents', 'DELETE', { type: 'RESUME' }, 403); document = savedDocument;
  deletionWorks = false; await rejects('candidate/documents', 'DELETE', { type: 'RESUME' }, 503); assert.ok(document); deletionWorks = true;
  await data(await send('candidate/privacy/export'));
  await send('candidate/documents', 'DELETE', { type: 'RESUME' }); assert.equal(document, null);
  await rejects('candidate/documents/download', 'POST', { type: 'RESUME' }, 404);
  head = { ContentLength: 10, Format: '' };
  await data(await send('candidate/documents/confirm', 'POST', { ...confirm, resourceType: 'raw', publicId: `${signed.publicId}.docx` }));
  head = { ContentLength: 10, Format: 'png' };
  await rejects('candidate/documents/confirm', 'POST', { ...confirm, resourceType: 'raw', publicId: `${signed.publicId}.docx` });

  await rejects('candidate/privacy', 'PATCH', { privacyConsent: true, termsAccepted: false });
  await data(await send('candidate/privacy', 'PATCH', { privacyConsent: true, termsAccepted: true }));
  await rejects('candidate/privacy', 'POST', { confirmation: 'delete' });
  await rejects('candidate/privacy', 'POST', { confirmation: 'DELETE', reason: 'a'.repeat(501) });
  await rejects('candidate/privacy', 'POST', { confirmation: 'DELETE', candidateId: 'C2' });
  const requested = await send('candidate/privacy', 'POST', { confirmation: 'DELETE', reason: 'Fixture request' }); assert.equal(requested.status, 201); await data(requested);
  await assert.rejects(() => send('candidate/privacy', 'POST', { confirmation: 'DELETE' }), error => error.status === 409);
  await data(await send('candidate/privacy/export')); await data(await send('candidate/privacy'));
  await data(await send('candidate/privacy', 'DELETE')); assert.equal(latestRequest.status, 'CANCELLED');
  latestRequest.status = 'IN_REVIEW'; await assert.rejects(() => send('candidate/privacy', 'DELETE'), error => error.status === 409);
  console.log(`Candidate isolated checks passed (${calls.length} scoped store calls): full profile, DTO redaction, dashboard ordering, validation, role/ownership boundaries, notification access, private uploads, export and deletion. No live database or network accessed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
