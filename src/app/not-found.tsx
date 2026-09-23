import Link from "next/link";
import { SearchX } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return <main className="min-h-screen bg-[#F8FBF9]"><SiteHeader /><section className="grid min-h-[65vh] place-items-center px-5 py-16 text-center"><div><SearchX className="mx-auto text-[#157A4A]" size={48} /><p className="mt-5 text-xs font-black tracking-[.14em] text-[#157A4A]">404 · PAGE NOT FOUND</p><h1 className="mt-3 text-4xl font-black">Ye page available nahi hai.</h1><p className="mx-auto mt-4 max-w-lg leading-7 text-[#5C6B63]">Link change ho gaya ho sakta hai. Jobs ya services section se apni search continue karein.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/jobs" className="rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white">Browse jobs</Link><Link href="/services" className="rounded-lg border border-[#CFE0D8] px-5 py-3 text-sm font-black text-[#0F5C38]">Explore services</Link></div></div></section></main>;
}
