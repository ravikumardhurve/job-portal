"use client";

import { useEffect, useState } from "react";
import { BarChart3, CalendarRange } from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, type BusinessVertical } from "@/lib/admin-scope";
import styles from "./admin-dashboard.module.css";

type Analytics = {
  totals: { jobs: number; applications: number; requirements: number; services: number };
  comparison: Array<{ vertical: BusinessVertical; jobs: number; applications: number; requirements: number; services: number }>;
  timeline: Array<{ date: string; applications: number; requirements: number; services: number }>;
};
const series = [
  { key: "jobs", label: "Jobs", color: "#2447e5" },
  { key: "applications", label: "Applications", color: "#23a077" },
  { key: "requirements", label: "Hiring", color: "#ed8152" },
  { key: "services", label: "Services", color: "#9061cf" },
] as const;

export function AdminDashboardAnalytics() {
  const [from, setFrom] = useState(() => { const date = new Date(); date.setUTCDate(date.getUTCDate() - 29); return date.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Analytics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const validRange = Boolean(from && to && from <= to);

  useEffect(() => {
    if (!validRange) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(undefined);
      try {
        const response = await fetch(`/api/admin/analytics?${new URLSearchParams({ from, to })}`, { signal: controller.signal });
        const result = await response.json() as { data?: Analytics; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error || "Could not load analytics. Please try again.");
        if (!controller.signal.aborted) setData(result.data);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load analytics.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [from, to, validRange, revision]);

  function changeDate(kind: "from" | "to", value: string) {
    setLoading(true);
    setData(undefined);
    setError(undefined);
    if (kind === "from") setFrom(value); else setTo(value);
  }

  const maxComparison = Math.max(1, ...(data?.comparison.map((item) => item.jobs + item.applications + item.requirements + item.services) ?? []));
  const maxDay = Math.max(1, ...(data?.timeline.map((item) => item.applications + item.requirements + item.services) ?? []));
  const noActivity = data && Object.values(data.totals).every((count) => count === 0);

  return <section className={styles.panel} aria-busy={validRange && loading} aria-labelledby="analytics-heading">
    <div className={styles.panelHeading}><div><p className={styles.eyebrow}>PERFORMANCE AT A GLANCE</p><h2 id="analytics-heading">Activity & business insights</h2><p>New records in the selected date range (UTC).</p></div><div className={styles.dateFilters}><label htmlFor="analytics-from">From<input id="analytics-from" type="date" value={from} max={to || undefined} onChange={(event) => changeDate("from", event.target.value)} aria-describedby={!validRange ? "date-error" : undefined} /></label><span aria-hidden="true">—</span><label htmlFor="analytics-to">To<input id="analytics-to" type="date" value={to} min={from || undefined} onChange={(event) => changeDate("to", event.target.value)} aria-describedby={!validRange ? "date-error" : undefined} /></label></div></div>
    {!validRange ? <p id="date-error" className={styles.analyticsNotice} role="alert">Choose both dates, with the end date on or after the start date.</p> : <>
      {loading && <p className={styles.analyticsNotice} role="status">Loading business activity...</p>}
      {error && <div className={styles.error} role="alert"><span>{error}</span><button type="button" onClick={() => { setLoading(true); setError(undefined); setRevision((value) => value + 1); }}>Retry</button></div>}
      {!loading && !error && noActivity && <div className={styles.empty}><BarChart3 size={26} /><h3>No activity in this date range.</h3><p>Try a different range. New jobs, applications and requests will appear here as they are recorded.</p></div>}
      {!loading && !error && data && !noActivity && <>
        <div className={styles.analyticsTotals}>{series.map(({ key, label, color }) => <div key={key}><span><i style={{ backgroundColor: color }} />{label}</span><strong>{data.totals[key].toLocaleString("en-IN")}</strong></div>)}</div>
        <div className={styles.chartGrid}>
          <div className={styles.comparison}><h3><BarChart3 size={17} />Business comparison</h3><div className={styles.barList}>{data.comparison.map((item) => { const total = item.jobs + item.applications + item.requirements + item.services; return <div key={item.vertical}><div className={styles.barLabel}><span>{BUSINESS_VERTICAL_LABELS[item.vertical]}</span><strong>{total}</strong></div><div className={styles.barTrack} aria-hidden="true">{series.map(({ key, color }) => <span key={key} style={{ width: `${item[key] / maxComparison * 100}%`, backgroundColor: color }} />)}</div><p>Jobs {item.jobs} · Applications {item.applications} · Hiring {item.requirements} · Services {item.services}</p></div>; })}</div></div>
          <div className={styles.timeline}><h3><CalendarRange size={17} />Daily enquiries & applications</h3><p>Applications, hiring and service requests. Only days with activity are shown.</p>{data.timeline.length ? <><div className={styles.timelineBars} role="img" aria-label="Daily activity bar chart. Exact dates and counts are available in the table below.">{data.timeline.map((item) => { const total = item.applications + item.requirements + item.services; return <div key={item.date} title={`${item.date}: ${total} records`}><span style={{ height: `${total / maxDay * 150}px` }} /><small>{item.date.slice(5)}</small></div>; })}</div><details className={styles.chartDetails}><summary>View daily numbers</summary><div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Daily activity data"><table><thead><tr><th scope="col">Date</th><th scope="col">Applications</th><th scope="col">Hiring</th><th scope="col">Services</th></tr></thead><tbody>{data.timeline.map((item) => <tr key={item.date}><th scope="row">{item.date}</th><td>{item.applications}</td><td>{item.requirements}</td><td>{item.services}</td></tr>)}</tbody></table></div></details></> : <p className={styles.timelineEmpty}>No enquiries or applications in this range.</p>}</div>
        </div>
      </>}
    </>}
  </section>;
}
