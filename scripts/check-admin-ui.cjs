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
  const testExports = relative.endsWith("admin-workspace.tsx") ? "\nexports.views = { Overview, JobsTab, LeadsTab };" : "";
  vm.runInNewContext(compiled + testExports, { require: resolve, module: local, exports: local.exports, console }, { filename });
  return local.exports;
}

const { AdminSectionShell } = load("src/components/admin-section-shell.tsx");
const { AdminWorkspace, views } = load("src/components/admin-workspace.tsx");
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
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

for (const [component, stylesheet] of [
  ["admin-section-shell.tsx", "admin-shell.module.css"],
  ["admin-workspace.tsx", "admin-dashboard.module.css"],
  ["admin-dashboard-analytics.tsx", "admin-dashboard.module.css"],
]) {
  const code = fs.readFileSync(path.join(root, "src/components", component), "utf8");
  const styles = fs.readFileSync(path.join(root, "src/components", stylesheet), "utf8");
  for (const [, name] of code.matchAll(/styles\.([A-Za-z0-9_]+)/g)) assert.ok(styles.includes("." + name), "CSS class " + name);
}
console.log("Admin UI smoke checks passed: role navigation, overview metrics, empty states, status values, login isolation and CSS references.");
