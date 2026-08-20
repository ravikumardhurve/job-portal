"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, MapPin, Search, SlidersHorizontal, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import type { Job } from "@/lib/portal";

const cities = ["All locations", "Raipur", "Bhilai", "Durg", "Bilaspur"];

export function JobExplorer() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All locations");
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city !== "All locations") params.set("city", city);
    fetch(`/api/jobs?${params.toString()}`).then((response) => response.json()).then((result: { data: Job[] }) => setJobs(result.data)).finally(() => setHasLoaded(true));
  }, [query, city]);

  return <div><div className="rounded-lg border border-[#efdcd1] bg-white p-3 shadow-[0_10px_30px_rgba(130,76,40,.06)]"><div className="grid gap-3 lg:grid-cols-[1fr_230px_auto]"><label className="flex h-12 items-center gap-2 border border-[#eeded4] px-3"><Search size={19} className="text-[#e95d2b]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search role, company or category" className="min-w-0 flex-1 text-sm outline-none placeholder:text-[#a28d82]" /></label><label className="flex h-12 items-center gap-2 border border-[#eeded4] px-3"><MapPin size={18} className="text-[#e95d2b]" /><select value={city} onChange={(event) => setCity(event.target.value)} className="w-full bg-white text-sm outline-none">{cities.map((option) => <option key={option}>{option}</option>)}</select></label><button type="button" className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#35231c] px-5 text-sm font-bold text-white"><SlidersHorizontal size={17} /> Filters</button></div></div><div className="mt-8 flex items-center justify-between"><p className="text-sm font-semibold text-[#765f53]">{hasLoaded ? `${jobs.length} open opportunities` : "Searching opportunities..."}</p><p className="hidden text-xs font-medium text-[#9d8275] sm:block">Verified local employers</p></div><div className="mt-4 grid gap-4">{hasLoaded && jobs.length === 0 ? <div className="rounded-lg border border-dashed border-[#ecd9cc] bg-white p-10 text-center"><h2 className="font-extrabold">No matching jobs found.</h2><p className="mt-2 text-sm text-[#765f53]">Try another role or location.</p></div> : jobs.map((job) => <article key={job.id} className="group grid gap-5 rounded-lg border border-[#eadfd8] bg-white p-5 shadow-[0_5px_15px_rgba(130,76,40,.04)] transition hover:border-[#f0a380] hover:shadow-lg md:grid-cols-[auto_1fr_auto] md:items-center"><span className="grid h-12 w-12 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><BriefcaseBusiness size={22} /></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-extrabold text-[#35231c]">{job.title}</h2>{job.urgent ? <span className="rounded-full bg-[#ffe6d8] px-2 py-0.5 text-[11px] font-bold text-[#c9471e]">Urgent hiring</span> : <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5b9d7d]"><BadgeCheck size={13} /> Verified</span>}</div><p className="mt-1 text-sm text-[#765f53]">{job.company}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[#81675a]"><span className="inline-flex items-center gap-1"><MapPin size={14} className="text-[#e95d2b]" />{job.city}</span><span className="inline-flex items-center gap-1"><WalletCards size={14} className="text-[#e95d2b]" />Rs. {job.salaryMin.toLocaleString("en-IN")} - {job.salaryMax.toLocaleString("en-IN")}</span><span>{job.employmentType.replaceAll("_", " ")}</span><span>{job.vacancies} vacancies</span></div></div><Link href={`/jobs/${job.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#f0b498] px-4 py-2.5 text-sm font-bold text-[#c9471e] transition group-hover:bg-[#e95d2b] group-hover:text-white">View job <ArrowRight size={16} /></Link></article>)}</div></div>;
}