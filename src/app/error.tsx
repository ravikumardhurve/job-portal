"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="grid min-h-[70vh] place-items-center bg-[#F8FBF9] px-5 py-16"><div className="max-w-lg rounded-2xl border border-[#F0D1BF] bg-white p-8 text-center shadow-sm" role="alert"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#FFF0E7] text-[#C9471E]"><AlertTriangle size={25} /></span><h1 className="mt-5 text-2xl font-black">Page load nahi ho paayi.</h1><p className="mt-3 text-sm leading-6 text-[#5C6B63]">Temporary connection ya server issue ho sakta hai. Dobara try karein.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-lg bg-[#157A4A] px-4 py-3 text-sm font-black text-white"><RotateCcw size={16} /> Try again</button><Link href="/" className="rounded-lg border border-[#CFE0D8] px-4 py-3 text-sm font-black text-[#0F5C38]">Go to homepage</Link></div></div></main>;
}
