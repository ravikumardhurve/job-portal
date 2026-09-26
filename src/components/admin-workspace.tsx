"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Bell, BriefcaseBusiness, Building2, CalendarCheck, CheckCircle2, ClipboardList, FileText, LayoutDashboard, Megaphone, Plus, RefreshCw, Send, UsersRound, X } from "lucide-react";
import type { AdminRole } from "@/lib/admin-users";
import type { Job, JobStatus, LeadStatus, ServiceRequest } from "@/lib/portal";
import { AdminDashboardAnalytics } from "@/components/admin-dashboard-analytics";
import { EMPLOYER_REQUIREMENT_STATUSES, SERVICE_REQUEST_STATUSES } from "@/lib/statuses";
import { BUSINESS_VERTICAL_LABELS, BUSINESS_VERTICALS, businessVerticalForServiceType, inferBusinessVertical, type BusinessVertical } from "@/lib/admin-scope";
import styles from "./admin-dashboard.module.css";

type DashboardData = { metrics: { activeJobs: number; candidates: number; applications: number; newRequirements: number; serviceRequests: number }; jobs: Job[]; announcements: Array<{ id: string; title: string; active: boolean }>; websitePosts: Array<{ id: string; title: string; category: string; published: boolean }>; notifications: Array<{ id: string; title: string; audience: string; channel: string }>; employerRequirements: Array<{ id: string; company: string; jobTitle: string; category: string; businessVertical?: BusinessVertical; candidatesRequired: number; city: string; status: LeadStatus }>; serviceRequests: Array<{ id: string; customerName: string; serviceType: string; city: string; status: ServiceRequest["status"] }> };

type Tab = "overview" | "jobs" | "content" | "notifications" | "leads";
const statuses: JobStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "PAUSED", "CLOSED", "FILLED", "EXPIRED", "ARCHIVED"];

export function AdminWorkspace({ role, name }: { role: AdminRole; name?: string }) {
  const [data, setData] = useState<DashboardData>();
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const mutationLock = useRef(false);

  function refresh() { setLoading(true); setError(undefined); setRevision((value) => value + 1); }

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/admin/dashboard", { signal: controller.signal });
        const result = await response.json() as { data?: DashboardData; error?: string };
        if (!response.ok || !result.data) throw new Error(response.status === 401 ? "Your session has expired. Please sign in again." : result.error || "Could not load the dashboard.");
        if (!controller.signal.aborted) setData(result.data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not connect. Please try again.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [revision]);

  async function save(endpoint: string, method: string, values: Record<string, unknown>, success: string, form?: HTMLFormElement) {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSaving(true);
    setMessage(undefined);
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Could not save your changes.");
      setMessage({ text: success, error: false });
      form?.reset();
      refresh();
    } catch (cause) {
      setMessage({ text: cause instanceof Error ? cause.message : "Could not save your changes. Please try again.", error: true });
    } finally {
      mutationLock.current = false;
      setSaving(false);
    }
  }

  async function submitContent(form: HTMLFormElement) {
    await save("/api/admin/content", "POST", Object.fromEntries(new FormData(form).entries()), "Saved successfully.", form);
  }
  async function updateStatus(jobId: string, status: JobStatus) {
    await save(`/api/admin/jobs/${encodeURIComponent(jobId)}`, "PATCH", { status }, "Job status updated.");
  }
  async function updateLeadStatus(kind: "requirement" | "service", id: string, status: string) {
    const endpoint = kind === "requirement" ? "/api/admin/employer-requirements/" : "/api/admin/service-requests/";
    await save(endpoint + encodeURIComponent(id), "PATCH", { status }, "Request status updated.");
  }

  const canManageSite = role === "SUPER_ADMIN" || role === "ADMIN";
  const nav = [
    { id: "overview" as Tab, label: "Overview", icon: LayoutDashboard },
    { id: "jobs" as Tab, label: "Job controls", icon: BriefcaseBusiness },
    { id: "leads" as Tab, label: "Leads & requests", icon: ClipboardList },
    ...(canManageSite ? [{ id: "content" as Tab, label: "Website content", icon: FileText }, { id: "notifications" as Tab, label: "Notifications", icon: Bell }] : []),
  ];

  return <main className={styles.dashboard}>
    <div className={styles.welcome}><div><p className={styles.eyebrow}>YOUR DAILY WORKSPACE</p><h1>Welcome back{name?.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ""}<span>.</span></h1><p>Here&apos;s what&apos;s happening across your business. Let&apos;s keep things moving.</p></div><div className={styles.welcomeActions}><button type="button" className={styles.secondaryButton} onClick={refresh} disabled={loading || saving}><RefreshCw size={15} className={loading ? styles.spinning : undefined} />{loading ? "Refreshing" : "Refresh overview"}</button><Link href="/admin/jobs/new" className={styles.primaryButton}><Plus size={17} />Create Job</Link></div></div>
    <nav className={styles.tabs} aria-label="Dashboard views">{nav.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}><Icon size={16} />{label}</button>)}</nav>
    {message && <div className={message.error ? styles.error : styles.success} role={message.error ? "alert" : "status"}><span>{message.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setMessage(undefined)}><X size={17} /></button></div>}
    {error && <div className={styles.error} role="alert"><div><strong>Dashboard could not be refreshed.</strong><p>{error}{data && " Previously loaded data is shown below."}</p></div><button type="button" onClick={refresh} disabled={loading}>Try again</button><Link href="/admin/login">Sign in</Link></div>}
    {loading && !data && <div className={styles.loading} role="status"><span>Loading your workspace...</span><div>{[1, 2, 3, 4, 5].map((item) => <div key={item} />)}</div></div>}
    {data && <><div aria-busy={loading}>{tab === "overview" && <Overview data={data} setTab={setTab} canManageSite={canManageSite} />}
    {tab !== "overview" && <fieldset className={styles.managementPanel} disabled={saving || loading} aria-busy={saving}><legend className={styles.srOnly}>{nav.find((item) => item.id === tab)?.label}</legend>{saving && <p className={styles.saving} role="status">Saving changes...</p>}{tab === "jobs" && <JobsTab jobs={data.jobs} updateStatus={updateStatus} />}{tab === "content" && canManageSite && <ContentTab submitContent={submitContent} data={data} />}{tab === "notifications" && canManageSite && <NotificationsTab submitContent={submitContent} data={data} />}{tab === "leads" && <LeadsTab data={data} updateStatus={updateLeadStatus} />}</fieldset>}</div></>}
  </main>;
}

function Overview({ data, setTab, canManageSite }: { data: DashboardData; setTab: (tab: Tab) => void; canManageSite: boolean }) {
  const metrics = [
    { label: "Active jobs", value: data.metrics.activeJobs, note: "Published & accepting applications", href: "/admin/jobs", tone: "blue", icon: BriefcaseBusiness },
    { label: "Candidates", value: data.metrics.candidates, note: "In your accessible candidate pool", href: "/admin/candidates", tone: "purple", icon: UsersRound },
    { label: "Applications", value: data.metrics.applications, note: "Total applications in your scope", href: "/admin/applications", tone: "green", icon: FileText },
    { label: "New hiring leads", value: data.metrics.newRequirements, note: "Employer requirements to review", href: "/admin/employer-requirements", tone: "orange", icon: Building2 },
    { label: "New service leads", value: data.metrics.serviceRequests, note: "Customer requests to follow up", href: "/admin/service-requests", tone: "pink", icon: ClipboardList },
  ];
  const pending = data.metrics.newRequirements + data.metrics.serviceRequests;
  const businessSummary = BUSINESS_VERTICALS.map((vertical) => ({
    vertical,
    jobs: data.jobs.filter((job) => (job.businessVertical ?? inferBusinessVertical(job.category)) === vertical).length,
    requirements: data.employerRequirements.filter((lead) => (lead.businessVertical ?? inferBusinessVertical(lead.category)) === vertical).length,
    services: data.serviceRequests.filter((lead) => businessVerticalForServiceType(lead.serviceType) === vertical).length,
  }));

  return <>
    <div className={styles.metricGrid}>{metrics.map(({ label, value, note, href, tone, icon: Icon }) => <Link href={href} key={label} className={`${styles.metric} ${styles[tone]}`}><div><span className={styles.metricIcon}><Icon size={19} /></span><ArrowUpRight size={15} /></div><p>{label}</p><strong>{value.toLocaleString("en-IN")}</strong><small>{note}</small></Link>)}</div>
    <div className={styles.priorityGrid}>
      <section className={styles.panel}><div className={styles.panelHeading}><div><p className={styles.eyebrow}>NEXT IN LINE</p><h2>Needs your attention</h2></div><span className={styles.countBadge}>{pending} new</span></div><div className={styles.queue}>
        <Link href="/admin/employer-requirements"><span className={`${styles.queueIcon} ${styles.orange}`}><Building2 size={19} /></span><div><strong>Hiring requirements</strong><p>{data.metrics.newRequirements ? "Review new employer requests and plan the next step." : "No new employer requirements to review."}</p></div><b>{data.metrics.newRequirements}</b><ArrowRight size={16} /></Link>
        <Link href="/admin/service-requests"><span className={`${styles.queueIcon} ${styles.purple}`}><ClipboardList size={19} /></span><div><strong>Service enquiries</strong><p>{data.metrics.serviceRequests ? "Check requirements and coordinate customer follow-ups." : "No new service requests awaiting follow-up."}</p></div><b>{data.metrics.serviceRequests}</b><ArrowRight size={16} /></Link>
      </div><div className={styles.panelFoot}><span><CheckCircle2 size={14} />Counts reflect requests marked New.</span><button type="button" onClick={() => setTab("leads")}>Open request controls <ArrowRight size={14} /></button></div></section>
      <section className={styles.quickActions}><p className={styles.eyebrow}>MAKE THE NEXT MOVE</p><h2>A shortcut to your day.</h2><div><Link href="/admin/jobs/new"><Plus size={18} /><span>Create a job</span><ArrowUpRight size={15} /></Link><Link href="/admin/interviews"><CalendarCheck size={18} /><span>Manage interviews</span><ArrowUpRight size={15} /></Link>{canManageSite ? <button type="button" onClick={() => setTab("content")}><Megaphone size={18} /><span>Publish an update</span><ArrowUpRight size={15} /></button> : <Link href="/admin/applications"><FileText size={18} /><span>Review applications</span><ArrowUpRight size={15} /></Link>}</div></section>
    </div>
    <AdminDashboardAnalytics />
    <section className={styles.panel}><div className={styles.panelHeading}><div><p className={styles.eyebrow}>RECRUITMENT DESK</p><h2>Latest jobs</h2><p>Your six most recently posted jobs, across all statuses.</p></div><Link href="/admin/jobs" className={styles.textLink}>View all jobs <ArrowRight size={15} /></Link></div>
      {data.jobs.length ? <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Latest jobs table"><table className={styles.jobsTable}><thead><tr><th scope="col">Job & company</th><th scope="col">Location</th><th scope="col">Vacancies</th><th scope="col">Status</th></tr></thead><tbody>{data.jobs.slice(0, 6).map((job) => <tr key={job.id}><td><div className={styles.jobCell}><span><BriefcaseBusiness size={17} /></span><div><strong>{job.title}</strong><small>{job.company}</small></div></div></td><td>{job.city}</td><td>{job.vacancies}</td><td><span className={`${styles.status} ${job.status === "PUBLISHED" ? styles.green : job.status === "DRAFT" ? styles.orange : styles.neutral}`}>{job.status.toLowerCase()}</span></td></tr>)}</tbody></table></div> : <div className={styles.empty}><BriefcaseBusiness size={25} /><h3>No jobs in your workspace yet.</h3><p>Create your first job to start building your recruitment pipeline.</p><Link href="/admin/jobs/new" className={styles.textLink}>Create a job <ArrowRight size={15} /></Link></div>}
    </section>
    {canManageSite && <section className={styles.panel}><div className={styles.panelHeading}><div><p className={styles.eyebrow}>BUSINESS SNAPSHOT</p><h2>Every service, in perspective.</h2><p>All-time records by business field. Jobs include every publication status.</p></div><Link href="/admin/reports" className={styles.textLink}>Open reports <ArrowRight size={15} /></Link></div><div className={styles.businessGrid}>{businessSummary.map((item, index) => <article key={item.vertical}><span className={styles.businessNumber}>0{index + 1}</span><h3>{BUSINESS_VERTICAL_LABELS[item.vertical]}</h3><dl><div><dt>Jobs</dt><dd>{item.jobs}</dd></div><div><dt>Hiring</dt><dd>{item.requirements}</dd></div><div><dt>Services</dt><dd>{item.services}</dd></div></dl></article>)}</div></section>}
  </>;
}

function JobsTab({ jobs, updateStatus }: { jobs: Job[]; updateStatus: (jobId: string, status: JobStatus) => void }) {
  const [vertical, setVertical] = useState<"ALL" | BusinessVertical>("ALL");
  const filteredJobs = vertical === "ALL" ? jobs : jobs.filter((job) => (job.businessVertical ?? inferBusinessVertical(job.category)) === vertical);
  return <section className="rounded-lg border border-[#e5e8f0] bg-white">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9ecf3] px-6 py-5"><div><p className="text-xs font-bold tracking-[.1em] text-[#2447e5]">RECRUITMENT</p><h2 className="mt-1 text-lg font-black">Job publication control</h2></div><a href="/admin/jobs" className="inline-flex items-center gap-2 rounded-lg bg-[#2447e5] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Open job management</a></div>
    <div className="flex gap-2 overflow-x-auto border-b border-[#e9ecf3] px-6 py-4"><FilterButton active={vertical === "ALL"} onClick={() => setVertical("ALL")}>All jobs ({jobs.length})</FilterButton>{BUSINESS_VERTICALS.map((item) => <FilterButton key={item} active={vertical === item} onClick={() => setVertical(item)}>{BUSINESS_VERTICAL_LABELS[item]} ({jobs.filter((job) => (job.businessVertical ?? inferBusinessVertical(job.category)) === item).length})</FilterButton>)}</div>
    <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f7f8fc] text-xs font-bold text-[#778198]"><tr><th className="px-6 py-3">JOB</th><th>BUSINESS FIELD</th><th>LOCATION</th><th>VACANCIES</th><th>STATUS</th><th className="px-6">ACTION</th></tr></thead><tbody>{filteredJobs.map((job) => { const jobVertical = job.businessVertical ?? inferBusinessVertical(job.category); return <tr key={job.id} className="border-t border-[#edf1ee]"><td className="px-6 py-4"><p className="font-bold">{job.title}</p><p className="mt-1 text-xs text-[#778198]">{job.company} | {job.id}</p></td><td><BusinessFieldBadge vertical={jobVertical} /><p className="mt-1 text-xs text-[#778198]">{job.category}</p></td><td>{job.city}</td><td>{job.vacancies}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${job.status === "PUBLISHED" ? "bg-[#e8f5ed] text-[#258653]" : "bg-[#fff0e7] text-[#c9471e]"}`}>{job.status}</span></td><td className="px-6"><label className="sr-only" htmlFor={job.id}>Change status</label><select id={job.id} value={job.status} onChange={(event) => updateStatus(job.id, event.target.value as JobStatus)} className="rounded-md border border-[#dfe4ef] bg-white px-2 py-1.5 text-xs font-bold text-[#58657d]">{statuses.map((status) => <option key={status} disabled={status === "ARCHIVED"}>{status}</option>)}</select></td></tr>; })}{!filteredJobs.length && <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-[#778198]">No jobs found in this business field.</td></tr>}</tbody></table></div>
  </section>;
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold ${active ? "bg-[#11182b] text-white" : "bg-[#f0f3fa] text-[#66718a] hover:bg-[#e7ecf9]"}`}>{children}</button>;
}

function BusinessFieldBadge({ vertical }: { vertical: BusinessVertical }) {
  const styles: Record<BusinessVertical, string> = { RECRUITMENT: "bg-[#eaf1ff] text-[#3d69be]", SECURITY: "bg-[#fff0e7] text-[#c9471e]", BABY_CARE: "bg-[#f6ecff] text-[#7f4bb0]", HOUSEKEEPING: "bg-[#e8f5ed] text-[#258653]", PEST_CONTROL: "bg-[#fff7d9] text-[#8a6810]" };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[vertical]}`}>{BUSINESS_VERTICAL_LABELS[vertical]}</span>;
}
function ContentTab({ submitContent, data }: { submitContent: (form: HTMLFormElement) => void; data: DashboardData }) { return <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><section className="rounded-lg border border-[#e5e8f0] bg-white p-6"><p className="text-xs font-bold tracking-[.1em] text-[#2447e5]">WEBSITE NOTICE</p><h2 className="mt-1 text-lg font-black">Add announcement</h2><form onSubmit={(event) => { event.preventDefault(); submitContent(event.currentTarget); }} className="mt-5 grid gap-4"><input type="hidden" name="type" value="announcement" /><label className="grid gap-2 text-sm font-bold">Announcement title<input name="title" required className="admin-input" placeholder="Urgent Hiring: 25 Office Assistants" /></label><label className="grid gap-2 text-sm font-bold">Optional link<input name="link" className="admin-input" placeholder="/jobs/JOB-10001" /></label><button className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#2447e5] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} /> Publish notice</button></form></section><section className="rounded-lg border border-[#e5e8f0] bg-white p-6"><p className="text-xs font-bold tracking-[.1em] text-[#2447e5]">CONTENT POSTS</p><h2 className="mt-1 text-lg font-black">Publish website update</h2><form onSubmit={(event) => { event.preventDefault(); submitContent(event.currentTarget); }} className="mt-5 grid gap-4"><input type="hidden" name="type" value="post" /><label className="grid gap-2 text-sm font-bold">Post title<input name="title" required className="admin-input" placeholder="New hiring drive in Raipur" /></label><label className="grid gap-2 text-sm font-bold">Short summary<textarea name="excerpt" required className="admin-input min-h-24 py-3" placeholder="Write a short update for your website." /></label><label className="grid gap-2 text-sm font-bold">Category<select name="category" required className="admin-input"><option value="JOB_TIP">Job tip</option><option value="COMPANY_NEWS">Company news</option><option value="SERVICE_UPDATE">Service update</option></select></label><button className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#11182b] px-4 py-2.5 text-sm font-bold text-white"><FileText size={16} /> Publish post</button></form></section><section className="xl:col-span-2 rounded-lg border border-[#e5e8f0] bg-white p-6"><h2 className="text-lg font-black">Current website content</h2><div className="mt-5 grid gap-3 md:grid-cols-2">{[...data.announcements.map((item) => ({ title: item.title, type: "Announcement" })), ...data.websitePosts.map((item) => ({ title: item.title, type: item.category.replaceAll("_", " ") }))].map((item, index) => <div key={`${item.title}-${index}`} className="rounded-lg bg-[#f7f8fc] p-4"><p className="text-xs font-bold text-[#2447e5]">{item.type}</p><p className="mt-1 text-sm font-bold">{item.title}</p></div>)}</div></section></div>; }
function NotificationsTab({ submitContent, data }: { submitContent: (form: HTMLFormElement) => void; data: DashboardData }) { return <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><section className="rounded-lg border border-[#e5e8f0] bg-white p-6"><p className="text-xs font-bold tracking-[.1em] text-[#2447e5]">CANDIDATE & EMPLOYER MESSAGES</p><h2 className="mt-1 text-lg font-black">Create notification</h2><form onSubmit={(event) => { event.preventDefault(); submitContent(event.currentTarget); }} className="mt-5 grid gap-4"><input type="hidden" name="type" value="notification" /><label className="grid gap-2 text-sm font-bold">Title<input name="title" required className="admin-input" placeholder="New jobs available in Raipur" /></label><label className="grid gap-2 text-sm font-bold">Message<textarea name="message" required className="admin-input min-h-24 py-3" placeholder="Write the message to send." /></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm font-bold">Audience<select name="audience" className="admin-input"><option value="CANDIDATES">Candidates</option><option value="EMPLOYERS">Employers</option><option value="ALL_USERS">All users</option></select></label><label className="grid gap-2 text-sm font-bold">Channel<select name="channel" className="admin-input"><option value="WEBSITE">Website</option><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option></select></label></div><button className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#2447e5] px-4 py-2.5 text-sm font-bold text-white"><Send size={16} /> Create notification</button></form></section><section className="rounded-lg border border-[#e5e8f0] bg-white p-6"><h2 className="text-lg font-black">Recent notifications</h2><p className="mt-1 text-sm text-[#778198]">Email uses the configured Resend provider. SMS and WhatsApp require separate paid provider credentials.</p><div className="mt-5 grid gap-3">{data.notifications.length ? data.notifications.map((notification) => <div key={notification.id} className="rounded-lg bg-[#f7f8fc] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">{notification.title}</p><span className="rounded-full bg-[#e8f5ed] px-2 py-1 text-[10px] font-bold text-[#258653]">{notification.channel}</span></div><p className="mt-2 text-xs text-[#778198]">{notification.audience.replaceAll("_", " ")}</p></div>) : <p className="rounded-lg border border-dashed border-[#dfe4ef] p-6 text-sm text-[#778198]">No notifications created yet.</p>}</div></section></div>; }
function LeadsTab({ data, updateStatus }: { data: DashboardData; updateStatus: (kind: "requirement" | "service", id: string, status: string) => void }) {
  const [vertical, setVertical] = useState<"ALL" | BusinessVertical>("ALL");
  const requirements = vertical === "ALL" ? data.employerRequirements : data.employerRequirements.filter((lead) => (lead.businessVertical ?? inferBusinessVertical(lead.category)) === vertical);
  const serviceRequests = vertical === "ALL" ? data.serviceRequests : data.serviceRequests.filter((lead) => businessVerticalForServiceType(lead.serviceType) === vertical);
  return (
    <div>
      <section className="mb-6 rounded-lg border border-[#e5e8f0] bg-white p-5">
        <div><p className="section-kicker text-[#2447e5]">BUSINESS FILTER</p><h2 className="mt-1 text-lg font-black">Requirements and service requests</h2><p className="mt-2 text-sm text-[#778198]">Choose a field to separate job manpower requirements from Security, Baby Care, Housekeeping and Pest Control services.</p></div>
        <div className="mt-4 flex gap-2 overflow-x-auto"><FilterButton active={vertical === "ALL"} onClick={() => setVertical("ALL")}>All fields</FilterButton>{BUSINESS_VERTICALS.map((item) => <FilterButton key={item} active={vertical === item} onClick={() => setVertical(item)}>{BUSINESS_VERTICAL_LABELS[item]}</FilterButton>)}</div>
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-lg border border-[#e5e8f0] bg-white p-6">
        <div><p className="section-kicker text-[#2447e5]">JOB / MANPOWER</p><h2 className="mt-1 text-lg font-black">Employer requirements</h2></div>
        <div className="mt-5 grid gap-3">
          {requirements.length ? requirements.map((lead) => (
            <div key={lead.id} className="rounded-lg bg-[#f7f8fc] p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div><BusinessFieldBadge vertical={lead.businessVertical ?? inferBusinessVertical(lead.category)} /><p className="mt-3 font-bold">{lead.jobTitle}</p><p className="mt-1 text-sm text-[#778198]">{lead.company} | {lead.city}</p><p className="mt-1 text-xs font-semibold text-[#778198]">Category: {lead.category}</p></div>
                <select value={lead.status} onChange={(event) => updateStatus("requirement", lead.id, event.target.value)} className="h-9 rounded-md border border-[#dfe4ef] bg-white px-2 text-xs font-bold text-[#58657d]" aria-label={`Update ${lead.company} requirement status`}>
                  {EMPLOYER_REQUIREMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
              <p className="mt-3 text-xs font-bold text-[#58657d]">{lead.candidatesRequired} candidates required</p>
            </div>
          )) : <p className="rounded-lg border border-dashed border-[#dfe4ef] p-6 text-sm text-[#778198]">No employer requirements yet.</p>}
        </div>
      </section>
      <section className="rounded-lg border border-[#e5e8f0] bg-white p-6">
        <div><p className="section-kicker text-[#2447e5]">CUSTOMER SERVICES</p><h2 className="mt-1 text-lg font-black">Facility service requests</h2></div>
        <div className="mt-5 grid gap-3">
          {serviceRequests.length ? serviceRequests.map((lead) => (
            <div key={lead.id} className="rounded-lg bg-[#f7f8fc] p-4">
              <div className="flex flex-wrap justify-between gap-3">
                <div><BusinessFieldBadge vertical={businessVerticalForServiceType(lead.serviceType)} /><p className="mt-3 font-bold">{serviceTypeLabel(lead.serviceType)}</p><p className="mt-1 text-sm text-[#778198]">{lead.customerName} | {lead.city}</p><p className="mt-1 text-xs font-semibold text-[#778198]">Type: Service request</p></div>
                <select value={lead.status} onChange={(event) => updateStatus("service", lead.id, event.target.value)} className="h-9 rounded-md border border-[#dfe4ef] bg-white px-2 text-xs font-bold text-[#58657d]" aria-label={`Update ${lead.customerName} service request status`}>
                  {SERVICE_REQUEST_STATUSES.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </select>
              </div>
            </div>
          )) : <p className="rounded-lg border border-dashed border-[#dfe4ef] p-6 text-sm text-[#778198]">No service requests yet.</p>}
        </div>
      </section>
      </div>
    </div>
  );
}

function serviceTypeLabel(serviceType: string) {
  const labels: Record<string, string> = { SECURITY: "Security Service", BABY_CARE: "Baby Care Service", CARETAKER: "Caretaker Service", HOUSEKEEPING: "Housekeeping Service", PEST_CONTROL: "Pest Control Service", MANPOWER: "Manpower Service", OTHER: "Other Service" };
  return labels[serviceType] ?? serviceType.replaceAll("_", " ");
}
