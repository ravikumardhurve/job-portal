/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TS harness with an in-memory database; no network or secrets. */
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
  vm.runInNewContext(code, {
    module: compiledModule, exports: compiledModule.exports, Response, Request, Headers, URL, Date, Error,
    require(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      throw new Error(`Unmocked import blocked: ${id}`);
    },
  }, { filename: file });
  return compiledModule.exports;
}

async function main() {
  const writes = [];
  const counters = new Map();
  const settings = {
    companyName: 'Fixture Care', email: 'team@example.test', phone: '+918888888888',
    address: 'Fixture office', googleBusinessProfileUrl: 'javascript:alert(1)',
    logoKey: 'PRIVATE_LOGO_KEY', serviceAssets: { 'baby-care': { heroKey: 'PRIVATE_HERO_KEY' } },
    databaseUrl: 'PRIVATE_DATABASE_URL', apiKey: 'PRIVATE_API_KEY', updatedBy: 'PRIVATE_ADMIN_ID',
  };
  const tables = {
    employerRequirements: [],
    serviceReviews: [
      { id: 'REV-EXISTING', serviceSlug: 'baby-care', customerName: 'Published Customer', city: 'Raipur', rating: 4, comment: 'Helpful service coordination.', status: 'APPROVED', createdAt: '2026-09-21T10:00:00.000Z', internalNotes: 'PRIVATE_REVIEW_NOTE', mobile: 'PRIVATE_CUSTOMER_PHONE' },
      { id: 'REV-HIDDEN', serviceSlug: 'baby-care', customerName: 'PRIVATE_PENDING_CUSTOMER', rating: 1, comment: 'PRIVATE_PENDING_COMMENT', status: 'PENDING', createdAt: '2026-09-22T10:00:00.000Z' },
    ],
  };
  const matches = (row, filter) => Object.entries(filter).every(([key, value]) => row[key] === value);
  const db = {
    collection(name) {
      if (name === 'settings') return { findOne: async filter => { assert.equal(filter.key, 'site'); return { value: settings, updatedBy: 'PRIVATE_ADMIN_ID' }; } };
      if (name === 'counters') return {
        findOneAndUpdate: async (filter, update) => {
          assert.equal(update.$inc.sequence, 1);
          writes.push({ collection: name });
          const sequence = (counters.get(filter._id) || 0) + 1;
          counters.set(filter._id, sequence); return { sequence };
        },
      };
      assert.ok(Object.hasOwn(tables, name), `Unexpected collection: ${name}`);
      return {
        findOne: async filter => tables[name].find(row => matches(row, filter)) || null,
        insertOne: async row => { tables[name].push(row); writes.push({ collection: name, row }); },
        find(filter) {
          assert.equal(name, 'serviceReviews'); assert.equal(filter.status, 'APPROVED');
          let rows = tables[name].filter(row => matches(row, filter));
          const cursor = {
            sort: () => { rows = rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); return cursor; },
            limit: count => { rows = rows.slice(0, count); return cursor; },
            toArray: async () => rows,
          };
          return cursor;
        },
      };
    },
  };
  const contracts = load('src/lib/mobile/contracts.ts');
  const constants = load('src/lib/constants.ts');
  const services = load('src/lib/service-pages.ts', { '@/lib/constants': constants });
  const scope = load('src/lib/admin-scope.ts');
  // Exercise the actual portal store and actual website POST validation against
  // an isolated DB. Even ID allocation and NEW/PENDING status assignment are real.
  const { portalStore } = load('src/lib/portal.ts', {
    '@/lib/admin-scope': scope, mongodb: { MongoServerError: class extends Error {} },
    '@/lib/mongodb': { ensureMongoSetup: async () => {}, getDatabase: async () => db },
  });
  const images = load('src/lib/site-images.ts', {
    '@/lib/service-pages': services,
    '@/lib/storage': { createPublicDisplayUrl: async () => 'https://media.example.test/public-service.webp' },
  });
  const employerRoute = load('src/app/api/employer-requirements/route.ts', { '@/lib/portal': { portalStore } });
  const reviewRoute = load('src/app/api/service-reviews/route.ts', { '@/lib/portal': { portalStore }, '@/lib/service-pages': services });
  // Only the landing read is stubbed; public pages should project its full records.
  portalStore.getPublicLanding = async () => ({
    jobs: [{ id: 'JOB-FIXTURE', title: 'Fixture Guard', city: 'Raipur', salaryMin: 10000, salaryMax: 12000, internalNotes: 'PRIVATE_JOB_NOTE', contactMobile: 'PRIVATE_EMPLOYER_PHONE' }],
    stats: { activeJobs: 1, candidateCount: 0, employerCount: 0, serviceClientCount: 0, internal: 'PRIVATE_STATS' },
    announcement: { internal: 'PRIVATE_ANNOUNCEMENT' }, posts: [{ internal: 'PRIVATE_POST' }],
  });
  portalStore.listJobCategoryCounts = async () => [{ category: 'Security', count: 1, private: 'PRIVATE_CATEGORY' }];
  const { publicPages } = load('src/lib/mobile/public.ts', {
    '@/app/api/employer-requirements/route': employerRoute, '@/app/api/service-reviews/route': reviewRoute,
    '@/lib/portal': { portalStore }, '@/lib/service-pages': services, '@/lib/site-images': images, './contracts': contracts,
  });
  const send = (route, method = 'GET', body) => publicPages(new Request(`https://fixture.test/api/mobile/${route}`, {
    method, ...(body !== undefined ? { headers: { 'Content-Type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
  }), route.split('/'));

  assert.equal(await send('candidate/profile'), null);
  assert.equal((await send('public/unknown')).status, 404);
  assert.equal((await send('public/services/not-a-service')).status, 404);
  assert.equal((await send('public/services/baby-care/extra')).status, 404);
  for (const [route, method, allowed] of [['public/content', 'POST', 'GET'], ['public/employer', 'GET', 'POST'], ['public/reviews', 'DELETE', 'POST']]) {
    const response = await send(route, method); assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), allowed);
  }
  for (const route of ['public/content', 'public/home', 'public/services', ...services.SERVICE_PAGE_SLUGS.map(slug => `public/services/${slug}`)]) {
    const response = await send(route); assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const text = await response.text(); assert.doesNotMatch(text, /PRIVATE_/); assert.ok(JSON.parse(text).data);
  }
  const content = (await (await send('public/content')).json()).data;
  assert.equal(content.settings.companyName, 'Fixture Care');
  assert.equal(content.settings.googleBusinessProfileUrl, undefined);
  assert.equal(content.documents['privacy-policy'].sections.length, 10);
  assert.equal(content.documents.terms.sections.length, 8);
  assert.equal(content.documents.terms.updatedAt, '21 September 2026');
  assert.equal(content.cities.length, services.CHHATTISGARH_SERVICE_CITIES.length);
  const detail = (await (await send('public/services/baby-care')).json()).data;
  assert.equal(detail.reviews.length, 1); assert.equal(detail.reviews[0].id, 'REV-EXISTING');
  assert.equal(detail.gallery.length, 0); assert.equal(detail.heroImage, 'https://media.example.test/public-service.webp');
  assert.deepEqual(detail.faqs, JSON.parse(JSON.stringify(services.SERVICE_PAGES['baby-care'].faqs)));
  assert.equal(writes.length, 0, 'Content and rejected routes must not write');

  const employer = { company: ' Fixture Company ', contactName: ' Employer Person ', mobile: '8888888888', contactEmail: ' Updates@Example.Test ', jobTitle: 'Security Guard', category: 'Security', candidatesRequired: 2, city: 'Raipur' };
  const review = { serviceSlug: 'baby-care', customerName: ' Happy Customer ', city: ' Raipur ', rating: 4, comment: ' The team coordinated everything clearly. ' };
  const invalidEmployer = [
    {}, null, [], '{bad', 'x'.repeat(16001),
    { ...employer, company: ' ' }, { ...employer, contactName: { $ne: '' } }, { ...employer, mobile: 8888888888 },
    { ...employer, contactEmail: 'bad-email' }, { ...employer, contactEmail: [] },
    { ...employer, candidatesRequired: 0 }, { ...employer, candidatesRequired: -2 },
    { ...employer, candidatesRequired: 1.5 }, { ...employer, candidatesRequired: '2' },
    { ...employer, candidatesRequired: Number.MAX_SAFE_INTEGER + 1 }, { ...employer, city: 'X'.repeat(101) },
  ];
  const invalidReviews = [
    {}, null, [], '{bad',
    { ...review, serviceSlug: 'unknown' }, { ...review, customerName: 'x' }, { ...review, customerName: {} },
    { ...review, rating: 0 }, { ...review, rating: 6 }, { ...review, rating: 1.5 }, { ...review, rating: '5' },
    { ...review, comment: 'short' }, { ...review, comment: 'X'.repeat(1001) },
    { ...review, city: 'X'.repeat(81) }, { ...review, city: [] },
  ];
  for (const [route, cases] of [['public/employer', invalidEmployer], ['public/reviews', invalidReviews]]) {
    for (const input of cases) {
      const response = await send(route, 'POST', input);
      assert.ok([400, 413].includes(response.status), `${route}: ${response.status}`);
      assert.equal(typeof (await response.json()).error, 'string');
      assert.equal(writes.length, 0, `${route}: invalid form must never allocate an ID or write`);
    }
  }

  const employerResponse = await send('public/employer', 'POST', { ...employer, status: 'PUBLISHED', internalNotes: 'PRIVATE_INJECTED_NOTE', businessVertical: 'PEST_CONTROL', assignedTo: 'PRIVATE_ADMIN_ID' });
  assert.equal(employerResponse.status, 201);
  const employerResult = await employerResponse.json();
  assert.deepEqual(Object.keys(employerResult.data), ['id']);
  assert.match(employerResult.message, /recruitment team/);
  const savedEmployer = tables.employerRequirements[0];
  assert.equal(savedEmployer.id, employerResult.data.id); assert.equal(savedEmployer.status, 'NEW');
  assert.equal(savedEmployer.company, 'Fixture Company'); assert.equal(savedEmployer.contactEmail, 'updates@example.test');
  assert.equal(savedEmployer.businessVertical, scope.inferBusinessVertical('Security'));
  assert.equal(savedEmployer.internalNotes, undefined); assert.equal(savedEmployer.assignedTo, undefined);
  assert.equal(tables.employerRequirements.length, 1);

  const reviewResponse = await send('public/reviews', 'POST', { ...review, status: 'APPROVED', internalNotes: 'PRIVATE_INJECTED_NOTE' });
  assert.equal(reviewResponse.status, 201);
  const reviewResult = await reviewResponse.json();
  assert.deepEqual(Object.keys(reviewResult.data), ['id']); assert.match(reviewResult.message, /after verification/);
  const savedReview = tables.serviceReviews.find(row => row.id === reviewResult.data.id);
  assert.equal(savedReview.status, 'PENDING'); assert.equal(savedReview.customerName, 'Happy Customer');
  assert.equal(savedReview.city, 'Raipur'); assert.equal(savedReview.internalNotes, undefined);
  assert.equal((await (await send('public/services/baby-care')).json()).data.reviews.length, 1, 'Pending submission must not be published');
  assert.equal(writes.length, 4, 'Two valid submissions each allocate one ID and insert one row');
  console.log('Public mobile checks passed: safe content DTOs, route boundaries, 31 invalid submissions with zero writes, real web validation/store, NEW employer and PENDING review creation against mock DB. No network or live data touched.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
