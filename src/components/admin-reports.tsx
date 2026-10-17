"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, CalendarDays } from "lucide-react";
import styles from "@/components/admin-management.module.css";

const reports = [
  { type: "candidates", label: "Candidates", text: "Profiles, verification, availability and contact details." },
  { type: "applications", label: "Applications", text: "Application stages and recruitment history." },
  { type: "jobs", label: "Jobs", text: "Vacancies, salaries and publication status." },
  { type: "service-requests", label: "Service requests", text: "Requests, assignments, schedules and progress." },
];

export function AdminReports() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const invalidRange = Boolean(from && to && from > to);
  function url(type: string) {
    const params = new URLSearchParams({ type });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return `/api/admin/reports?${params}`;
  }
  return <main className={styles.page}>
    <div>
      <p className="section-kicker text-[#2447e5]">INSIGHTS & EXPORTS</p>
      <h1 className="mt-2 font-black">Reports</h1>
      <p className="mt-2 text-sm text-[#657189]">Download spreadsheet-ready records within your admin access.</p>
    </div>
    <section className="mt-4 rounded-xl border border-[#e5e8f0] bg-white p-4 sm:mt-6 sm:p-5" aria-label="Report date range">
      <h2 className="flex items-center gap-2 text-sm font-bold"><CalendarDays size={17} className="text-[#2447e5]" />Choose a date range</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1.5 text-xs font-bold">From<input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-1.5 text-xs font-bold">To<input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="admin-input" /></label>
        <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="min-h-11 self-end rounded-lg border border-[#dfe4ed] px-4 text-xs font-bold text-[#4e5c73]">Clear dates</button>
      </div>
      {invalidRange ? <p role="alert" className="mt-3 text-xs font-bold text-red-700">End date must be on or after the start date.</p> : <p className="mt-3 text-xs text-[#657189]">Leave dates empty to export all accessible records.</p>}
    </section>
    <section className={styles.reportGrid} aria-label="Available reports">
      {reports.map((report) => <article key={report.type} className={styles.report}>
        <FileSpreadsheet aria-hidden="true" />
        <div><h2>{report.label}</h2><p>{report.text}</p>
          <a href={invalidRange ? undefined : url(report.type)} aria-disabled={invalidRange || undefined} download onClick={(event) => { if (invalidRange) event.preventDefault(); }} className={invalidRange ? "opacity-40" : undefined}>
            <Download size={16} aria-hidden="true" />Download CSV<span className="sr-only">: {report.label}</span>
          </a>
        </div>
      </article>)}
    </section>
  </main>;
}
