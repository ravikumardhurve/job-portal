"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CalendarRange } from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, type BusinessVertical } from "@/lib/admin-scope";

type Analytics = {
  totals: { jobs: number; applications: number; requirements: number; services: number };
  comparison: Array<{ vertical: BusinessVertical; jobs: number; applications: number; requirements: number; services: number }>;
  timeline: Array<{ date: string; applications: number; requirements: number; services: number }>;
};

export function AdminDashboardAnalytics() {
  const [from, setFrom] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 29); return date.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Analytics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(`/api/admin/analytics?${new URLSearchParams({ from, to })}`, { signal });
      const result = await response.json() as { data?: Analytics; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error ?? "Analytics load nahi ho paaya.");
      setData(result.data);
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error ? cause.message : "Analytics load nahi ho paaya.");
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  const maxComparison = Math.max(1, ...(data?.comparison.map((item) => item.jobs + item.applications + item.requirements + item.services) ?? [1]));
  const maxDay = Math.max(1, ...(data?.timeline.map((item) => item.applications + item.requirements + item.services) ?? [1]));
  const noActivity = data && Object.values(data.totals).every((count) => count === 0);

  return <section className="mt-7 rounded-xl border border-[#E0E8E2] bg-white p-6" aria-busy={loading}>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="section-kicker text-[#E95D2B]">PERFORMANCE</p><h2 className="mt-1 text-xl font-black">Business comparison and trends</h2></div><div className="flex gap-2"><label className="grid gap-1 text-[10px] font-black text-[#71837A]">FROM<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="admin-input" /></label><label className="grid gap-1 text-[10px] font-black text-[#71837A]">TO<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="admin-input" /></label></div></div>
    {loading && <p className="mt-6 rounded-lg bg-[#F7FAF8] p-5 text-sm text-[#71837A]" role="status">Business data loading...</p>}
    {error && <p className="mt-6 rounded-lg bg-[#FFF0E7] p-4 text-sm font-bold text-[#C9471E]" role="alert">{error} <button type="button" className="ml-2 underline" onClick={() => void load(new AbortController().signal)}>Retry</button></p>}
    {!loading && !error && noActivity && <p className="mt-6 rounded-lg border border-dashed border-[#DCE8E1] p-5 text-sm text-[#71837A]">Selected date range mein abhi koi business activity nahi hai. Dates badalkar dekhein.</p>}
    {!loading && !error && data && !noActivity && <>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-[#F7FAF8] p-5"><div className="flex items-center gap-2 font-black"><BarChart3 size={18} className="text-[#E95D2B]" />Category comparison</div><div className="mt-5 grid gap-4">{data.comparison.map((item) => { const total = item.jobs + item.applications + item.requirements + item.services; return <div key={item.vertical}><div className="flex justify-between text-xs font-bold"><span>{BUSINESS_VERTICAL_LABELS[item.vertical]}</span><span>{total}</span></div><div className="mt-2 flex h-3 overflow-hidden rounded-full bg-[#E4EAE6]" aria-hidden="true"><span className="bg-[#3D69BE]" style={{ width: `${item.jobs / maxComparison * 100}%` }} /><span className="bg-[#157A4A]" style={{ width: `${item.applications / maxComparison * 100}%` }} /><span className="bg-[#E95D2B]" style={{ width: `${item.requirements / maxComparison * 100}%` }} /><span className="bg-[#7F4BB0]" style={{ width: `${item.services / maxComparison * 100}%` }} /></div><p className="mt-1 text-[10px] text-[#71837A]">Jobs {item.jobs} · Applications {item.applications} · Hiring {item.requirements} · Services {item.services}</p></div>; })}</div></div>
        <div className="rounded-xl bg-[#35231C] p-5 text-white"><div className="flex items-center gap-2 font-black"><CalendarRange size={18} className="text-[#FFCF68]" />Daily activity</div><div className="mt-6 flex h-52 items-end gap-1 overflow-x-auto">{data.timeline.map((item) => { const total = item.applications + item.requirements + item.services; return <div key={item.date} title={`${item.date}: ${total} activities`} className="flex min-w-5 flex-1 flex-col items-center justify-end"><span className="w-full rounded-t bg-[#FFCF68]" style={{ height: `${Math.max(5, total / maxDay * 170)}px` }} /><span className="mt-2 text-[8px] text-[#DFCFC6]">{item.date.slice(8)}</span></div>; })}{!data.timeline.length && <p className="self-center text-sm text-[#DFCFC6]">Selected range mein activity nahi hai.</p>}</div></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-[#52665C]"><span>Jobs {data.totals.jobs}</span><span>Applications {data.totals.applications}</span><span>Employer requirements {data.totals.requirements}</span><span>Service requests {data.totals.services}</span></div>
    </>}
  </section>;
}
