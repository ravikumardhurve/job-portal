/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness for isolated TSX module rendering. */
// Read-only server-render smoke checks. No login, database or API calls.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

const root = path.resolve(__dirname, "..");
const cache = new Map();
let pathname = "/admin";
let stateOverrides = {};
let stateIndex = 0;
const css = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };

function load(relative) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const local = { exports: {} };
  cache.set(filename, local);
  function resolve(id) {
    if (id === "react") return { ...React, useState(initial) {
      const index = stateIndex++;
      return React.useState(Object.hasOwn(stateOverrides, index) ? stateOverrides[index] : initial);
    } };
    if (id.endsWith(".module.css")) return css;
    if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (id === "next/navigation") return { usePathname: () => pathname, useRouter: () => ({ replace() {}, refresh() {} }) };
    if (id.startsWith("@/")) {
      const base = path.resolve(root, "src", id.slice(2));
      const target = [base + ".tsx", base + ".ts"].find(fs.existsSync);
      assert.ok(target, "Known local module: " + id);
      // Guard against accidentally importing a data store in this UI-only test.
      assert.ok(!/[/\\](portal|mongodb|admin-auth|admin-users)\.ts$/.test(target), "Do not load database/auth modules");
      return load(path.relative(root, target));
    }
    return require(id);
  }
  // Expose the pure view functions for fixture rendering without modifying app exports.
  const testExports = relative.endsWith("admin-workspace.tsx")
    ? "\nexports.views = { Overview, JobsTab, LeadsTab };"
    : relative.endsWith("admin-job-manager.tsx")
      ? "\nexports.views = { JobRow, filterJobs, paginateJobs, emptyForm, formFromJob };"
      : "";
  vm.runInNewContext(compiled + testExports, { require: resolve, module: local, exports: local.exports, console, URLSearchParams }, { filename });
  return local.exports;
}

const { AdminSectionShell } = load("src/components/admin-section-shell.tsx");
const { AdminWorkspace, views } = load("src/components/admin-workspace.tsx");
const render = (component, props, states = {}) => {
  stateOverrides = states;
  stateIndex = 0;
  try { return renderToStaticMarkup(React.createElement(component, props)); }
  finally { stateOverrides = {}; }
};
const fixture = {
  metrics: { activeJobs: 2, candidates: 17, applications: 24, newRequirements: 3, serviceRequests: 4 },
  jobs: [{ id: "JOB-TEST", title: "Security Supervisor", company: "Fixture Company", category: "Security", city: "Raipur", vacancies: 2, status: "EXPIRED", businessVertical: "SECURITY" }],
  employerRequirements: [],
  serviceRequests: [{ id: "SR-TEST", customerName: "Fixture Customer", serviceType: "SECURITY", city: "Raipur", status: "IN_PROGRESS" }],
  announcements: [], websitePosts: [], notifications: [],
};
const overview = render(views.Overview, { data: fixture, setTab() {}, canManageSite: true });
for (const text of ["Active jobs", "Candidates", "Applications", "New hiring leads", "New service leads", "7 new", "Security Supervisor", "expired", "Business snapshot".toUpperCase()]) assert.ok(overview.includes(text), text);
for (const href of ["/admin/jobs", "/admin/applications", "/admin/candidates", "/admin/service-requests", "/admin/jobs/new"]) assert.ok(overview.includes('href="' + href + '"'), href);
const empty = render(views.Overview, { data: { ...fixture, metrics: { activeJobs: 0, candidates: 0, applications: 0, newRequirements: 0, serviceRequests: 0 }, jobs: [] }, setTab() {}, canManageSite: false });
assert.ok(empty.includes("No jobs in your workspace yet."));
assert.ok(empty.includes("No new service requests"));
assert.ok(!empty.includes("BUSINESS SNAPSHOT"));

const leads = render(views.LeadsTab, { data: fixture, updateStatus() {} });
assert.match(leads, /<option value="IN_PROGRESS" selected="">IN PROGRESS<\/option>/);
const jobs = render(views.JobsTab, { jobs: fixture.jobs, updateStatus() {} });
assert.match(jobs, /<option selected="">EXPIRED<\/option>/);
assert.match(jobs, /<option disabled="">ARCHIVED<\/option>/);

for (const role of ["SUPER_ADMIN", "ADMIN", "RECRUITER", "PARTNER_ADMIN"]) {
  const canManageSite = role === "SUPER_ADMIN" || role === "ADMIN";
  const shell = render(AdminSectionShell, { role, name: "Test Admin", companyName: "Fixture Business", businessVerticals: ["SECURITY"], children: React.createElement("p", null, "Protected child") });
  assert.ok(shell.includes('aria-current="page"'));
  assert.ok(shell.includes("Fixture Business"));
  assert.equal(shell.includes('href="/admin/settings"'), canManageSite);
  assert.equal(shell.includes('href="/admin/team"'), role === "SUPER_ADMIN");
  const dashboard = render(AdminWorkspace, { role, name: "Test Admin" });
  assert.ok(dashboard.includes("Welcome back"));
  assert.ok(dashboard.includes("Loading your workspace"));
  assert.equal(dashboard.includes("Website content"), canManageSite);
  assert.equal(dashboard.includes("Notifications"), canManageSite);
}
pathname = "/admin/login";
const login = render(AdminSectionShell, { children: React.createElement("p", null, "Login content") });
assert.equal(login, "<p>Login content</p>");

const { AdminJobManager, views: jobViews } = load("src/components/admin-job-manager.tsx");
const sampleJob = { ...fixture.jobs[0], district: "Raipur", salaryMin: 14000, salaryMax: 18000, employmentType: "FULL_TIME", postedAt: "2026-09-20T12:00:00Z", urgent: true };
const statusValues = ["DRAFT", "PENDING", "PUBLISHED", "PAUSED", "CLOSED", "FILLED", "EXPIRED", "ARCHIVED"];
for (const status of statusValues) {
  const card = render(jobViews.JobRow, { job: { ...sampleJob, status }, disabled: false, updating: false, onEdit() {}, onStatus() {}, onDuplicate() {} });
  assert.ok(card.startsWith("<tr"), "Job is a native table row at every viewport");
  assert.equal((card.match(/<td>/g) || []).length, 4);
  assert.ok(card.includes("14,000"));
  assert.ok(card.includes("18,000"));
  assert.ok(card.includes("Duplicate as draft"));
  assert.ok(card.includes("More actions for"));
  assert.equal(card.includes("View public listing"), status === "PUBLISHED");
  assert.equal(card.includes(">Pause</button>"), status === "PUBLISHED");
  assert.match(card, new RegExp('value="' + status + '" selected=""'));
}
const lockedCard = render(jobViews.JobRow, { job: sampleJob, disabled: true, updating: true, onEdit() {}, onStatus() {}, onDuplicate() {} });
assert.ok(lockedCard.includes('aria-busy="true"'));
assert.equal((lockedCard.match(/<button[^>]*disabled=""/g) || []).length, 4);
const sampleJobs = [sampleJob, { ...sampleJob, id: "JOB-OTHER", title: "Office Assistant", category: "Office Staff", city: "Bhilai", district: "Durg", businessVertical: "RECRUITMENT", status: "DRAFT" }];
assert.equal(jobViews.filterJobs(sampleJobs, "  BHILAI  ", "DRAFT", "RECRUITMENT").length, 1);
assert.equal(jobViews.filterJobs(sampleJobs, "", "ALL", "SECURITY").length, 1);
assert.equal(jobViews.filterJobs(sampleJobs, "no match", "ALL", "ALL").length, 0);
assert.equal(jobViews.filterJobs(sampleJobs, "JOB-TEST", "ALL", "ALL").length, 1);
const paged = Array.from({ length: 23 }, (_, index) => ({ ...sampleJob, id: String(index) }));
assert.equal(jobViews.paginateJobs(paged, 1).visibleJobs.length, 10);
assert.equal(jobViews.paginateJobs(paged, 3).visibleJobs.length, 3);
assert.equal(jobViews.paginateJobs(paged, 99).currentPage, 3);
assert.equal(jobViews.paginateJobs([], 5).currentPage, 1);
assert.equal(jobViews.emptyForm("SECURITY").businessVertical, "SECURITY");
assert.equal(jobViews.formFromJob(sampleJob).salaryMin, "14000");
for (const canChooseVertical of [true, false]) {
  const form = render(AdminJobManager, { allowedVerticals: ["SECURITY"], canChooseVertical, initialCreate: true });
  assert.ok(form.includes("<dialog"));
  assert.ok(form.includes("Save draft"));
  assert.ok(form.includes("Create &amp; publish"));
  assert.ok(form.includes("Loading job listings"));
  assert.equal(form.includes(">Business field"), canChooseVertical);
}
pathname = "/admin/jobs";
const jobsShell = render(AdminSectionShell, { role: "ADMIN", children: React.createElement("main", null, React.createElement("header", null, "Job management")) });
assert.ok(!jobsShell.includes("[&amp;&gt;main&gt;header]:hidden"));

const candidate = { id: "CAN-UI", fullName: "Fixture Candidate", mobile: "0000000000", email: "fixture@example.test", city: "Raipur", verificationStatus: "PENDING", availability: "AVAILABLE", createdAt: "2026-09-20T12:00:00Z", profileCompletion: 65 };
const application = { id: "APP-UI", candidateId: candidate.id, jobId: sampleJob.id, candidate, job: sampleJob, status: "APPLIED", appliedAt: candidate.createdAt, statusHistory: [] };
const cases = [
  ["candidate-manager", "CandidateManager", {0: [candidate], 4: false}, "Fixture Candidate", 8],
  ["admin-application-manager", "AdminApplicationManager", {0: [application], 1: false}, "Fixture Candidate", 7],
  ["admin-service-request-manager", "AdminServiceRequestManager", {0: [{ id: "SR-UI", customerName: "Fixture Customer", mobile: candidate.mobile, serviceType: "SECURITY", city: "Raipur", address: "Test location", status: "NEW", createdAt: candidate.createdAt }], 1: false}, "Fixture Customer", 6],
  ["admin-interview-manager", "AdminInterviewManager", {1: [{id: "INT-UI", candidate, job: sampleJob, candidateId: candidate.id, jobId: sampleJob.id, status: "SCHEDULED", mode: "PHONE", scheduledAt: candidate.createdAt, createdAt: candidate.createdAt}]}, "Fixture Candidate", 6],
  ["admin-employer-requirement-manager", "AdminEmployerRequirementManager", {0: [{id: "EMP-UI", company: "Fixture Employer", contactName: "Test contact", mobile: candidate.mobile, jobTitle: "Security Guard", category: "Security", candidatesRequired: 2, city: "Raipur", status: "NEW"}]}, "Fixture Employer", 6],
  ["admin-privacy-request-manager", "AdminPrivacyRequestManager", {0: [{id: "PR-UI", candidate, candidateId: candidate.id, status: "SUBMITTED", reason: "Fixture only", createdAt: candidate.createdAt}], 3: false}, "Fixture Candidate", 6],
  ["admin-audit-log-manager", "AdminAuditLogManager", {0: [{actor: {name: "Fixture Admin"}, targetType: "JOB", targetId: sampleJob.id, action: "JOB_UPDATED", createdAt: candidate.createdAt}], 4: false}, "Fixture Admin", 5],
  ["admin-user-manager", "AdminUserManager", {0: [{id: "ADMIN-UI", name: "Fixture Admin", email: "fixture@example.test", role: "SUPER_ADMIN", status: "ACTIVE"}]}, "Fixture Admin", 5],
];
for (const [file, exported, states, name, columns] of cases) {
  const component = load(`src/components/${file}.tsx`)[exported];
  const html = render(component, {}, states);
  assert.ok(html.includes(name), `${file}: fixture row renders`);
  assert.ok(html.includes('role="region"'), `${file}: keyboard-accessible horizontal scroll region`);
  assert.equal((html.match(/data-label="/g) || []).length, columns, `${file}: mobile labels for every column`);
  assert.equal((html.match(/data-primary="true"/g) || []).length, 1, `${file}: primary mobile heading`);
  assert.equal((html.match(/scope="col"/g) || []).length, columns, `${file}: accessible table headers`);
  if (file !== "admin-user-manager") {
    assert.ok(html.includes('aria-label="Search and filters"'), `${file}: shared filters`);
    assert.ok(html.includes('aria-expanded="false"'), `${file}: initially compact filters`);
  } else {
    assert.ok(html.includes("Protected"));
    assert.ok(!html.includes(">Suspend</button>"));
  }
}
const review = render(load("src/components/admin-review-manager.tsx").AdminReviewManager, {}, {1: [{id: "REVIEW-UI", serviceSlug: "security-guard", customerName: "Fixture reviewer", city: "Raipur", rating: 4, comment: "Fixture feedback", status: "PENDING", createdAt: candidate.createdAt}], 2: false});
assert.ok(review.includes("Fixture feedback"));
assert.ok(review.includes('aria-pressed="true"'));
assert.ok(review.includes("Approve") && review.includes("Reject"));
const account = render(load("src/components/admin-account-manager.tsx").AdminAccountManager, {name: "Test Admin", email: "fixture@example.test", role: "ADMIN"});
assert.equal((account.match(/type="password"/g) || []).length, 3);
const Reports = load("src/components/admin-reports.tsx").AdminReports;
assert.equal((render(Reports).match(/download=""/g) || []).length, 4);
const invalidReports = render(Reports, {}, {0: "2026-09-20", 1: "2026-09-01"});
assert.ok(invalidReports.includes('role="alert"'));
assert.ok(!invalidReports.includes('href="/api/admin/reports'));
const filters = render(load("src/components/admin-filters.tsx").AdminFilters, {activeCount: 2, search: React.createElement("input", {"aria-label": "Search"}), children: React.createElement("select", {"aria-label": "Status"})});
assert.ok(filters.includes('aria-controls="'));
assert.ok(filters.includes(">2</span>"));
assert.ok(filters.includes('aria-label="Search"'));
const dialog = render(load("src/components/admin-dialog.tsx").AdminDialog, {title: "Test dialog", busy: true, onClose() {}, children: React.createElement("button", null, "Save")});
assert.ok(dialog.includes('<dialog'));
assert.ok(dialog.includes('aria-busy="true"'));

// Collapsed settings retain their controls in the form, and invalid fields open their section.
const settingsSource = fs.readFileSync(path.join(root, "src/components/site-settings-manager.tsx"), "utf8");
assert.ok(settingsSource.includes("onInvalidCapture"));
assert.ok(settingsSource.includes("styles.saveBar"));
assert.equal((settingsSource.match(/<details className=\{styles.fold\}/g) || []).length, 7);
const managementCss = fs.readFileSync(path.join(root, "src/components/admin-management.module.css"), "utf8");
assert.ok(!/\.table\s+(?:thead|tbody|tr|td)\s*\{[^}]*display:\s*(?:grid|block)/.test(managementCss), "Mobile records must retain native table layout");
assert.ok(!managementCss.includes("clip-path: inset(50%)"), "Column headers stay visible on mobile");
assert.ok(!managementCss.includes("content: attr(data-label)"), "No mobile card labels");
const jobsCss = fs.readFileSync(path.join(root, "src/components/admin-job-manager.module.css"), "utf8");
assert.ok(jobsCss.includes("overflow-x: auto"));
assert.ok(!jobsCss.includes(".jobCard"), "Jobs use table rows, not card layout");
for (const file of ["admin-interview-manager", "admin-employer-requirement-manager"]) {
  const source = fs.readFileSync(path.join(root, `src/components/${file}.tsx`), "utf8");
  assert.ok(source.includes("<AdminDialog"));
  assert.ok(source.includes("feedback={error || message}"), `${file}: feedback remains visible in modal`);
}

for (const [component, stylesheet] of [
  ["admin-section-shell.tsx", "admin-shell.module.css"],
  ["admin-workspace.tsx", "admin-dashboard.module.css"],
  ["admin-dashboard-analytics.tsx", "admin-dashboard.module.css"],
  ["admin-job-manager.tsx", "admin-job-manager.module.css"],
  ...[...cases.map(([file]) => file), "admin-review-manager", "admin-account-manager", "admin-reports", "admin-filters", "admin-dialog", "site-settings-manager", "service-asset-manager"].map(file => [file + ".tsx", "admin-management.module.css"]),
]) {
  const code = fs.readFileSync(path.join(root, "src/components", component), "utf8");
  const styles = fs.readFileSync(path.join(root, "src/components", stylesheet), "utf8");
  for (const [, name] of code.matchAll(/styles\.([A-Za-z0-9_]+)/g)) assert.ok(styles.includes("." + name), "CSS class " + name);
}
console.log("Admin UI smoke checks passed: dashboard, roles, jobs, 8 responsive record tables, filters, reviews, reports, account, dialogs, settings and CSS references.");
