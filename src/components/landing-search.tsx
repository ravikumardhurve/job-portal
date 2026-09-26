"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Search } from "lucide-react";

export function LandingSearch({ categories = [] }: { categories?: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Raipur");
  const [category, setCategory] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const params = new URLSearchParams(); if (query.trim()) params.set("q", query.trim()); if (city !== "All Chhattisgarh") params.set("city", city); if (category) params.set("category", category); router.push(`/jobs?${params.toString()}`); }
  return <form onSubmit={submit} className="landing-search mt-9 grid gap-2 rounded-lg border bg-white p-2 sm:grid-cols-[1.2fr_150px_160px_auto]"><label className="sr-only" htmlFor="keyword">Job role or skill</label><div className="flex items-center gap-2 px-3"><Search size={19} className="text-[#4B5568]" /><input id="keyword" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Job title or skill" className="h-12 min-w-0 flex-1 text-sm text-[#20283B] outline-none placeholder:text-[#6F7788]" /></div><label className="sr-only" htmlFor="location">Location</label><div className="flex items-center border-l border-[#DCE8E1] px-2"><MapPin size={18} className="shrink-0 text-[#2447E5]" /><select id="location" value={city} onChange={(event) => setCity(event.target.value)} className="h-12 w-full bg-white px-2 text-sm font-medium text-[#20283B] outline-none"><option>Raipur</option><option>Bhilai</option><option>Durg</option><option>Bilaspur</option><option>All Chhattisgarh</option></select></div><label className="sr-only" htmlFor="category">Category</label><div className="flex items-center border-l border-[#DCE8E1] px-2"><select id="category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 w-full bg-white px-2 text-sm font-medium text-[#20283B] outline-none"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div><button className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#2447E5] px-5 text-sm font-bold text-white">Search <ArrowRight size={17} /></button></form>;
}
