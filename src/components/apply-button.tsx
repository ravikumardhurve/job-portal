"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function ApplyButton({ jobId }: { jobId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "login" | "error">("idle"); const [message, setMessage] = useState("");
  async function apply() { setState("loading"); const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) }); const result = await response.json() as { error?: string }; if (response.status === 401) { setState("login"); setMessage(result.error ?? "Please login first."); return; } if (!response.ok) { setState("error"); setMessage(result.error ?? "Could not submit application."); return; } setState("success"); setMessage("Application submitted successfully."); }
  if (state === "login") return <div><Link href="/candidate/login" className="flex items-center justify-center rounded-lg bg-[#157A4A] px-4 py-3 text-sm font-bold text-white">Login to apply</Link><p className="mt-3 text-center text-xs text-[#D5E3DB]">{message}</p></div>;
  if (state === "success") return <div className="rounded-lg bg-[#E3F3EA] p-4 text-center text-sm font-bold text-[#1F7A4D]"><CheckCircle2 size={19} className="mx-auto mb-2" />{message}<Link href="/candidate/dashboard" className="mt-3 block text-[#0F5C38]">View dashboard</Link></div>;
  return <div><button onClick={apply} disabled={state === "loading"} className="flex w-full items-center justify-center rounded-lg bg-[#157A4A] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{state === "loading" ? "Applying..." : "Apply for this job"}</button>{state === "error" && <p className="mt-3 text-center text-xs font-bold text-[#D4B04A]">{message}</p>}</div>;
}