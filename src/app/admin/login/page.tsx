"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(undefined); const formData = new FormData(event.currentTarget); const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }) }); const result = await response.json() as { error?: string }; setLoading(false); if (!response.ok) { setError(result.error ?? "Could not sign in."); return; } router.replace("/admin"); router.refresh(); }
  return <main className="grid min-h-screen place-items-center bg-[#fff7ef] p-5"><section className="w-full max-w-md rounded-lg border border-[#eeded4] bg-white p-7 shadow-[0_16px_45px_rgba(130,76,40,.10)]"><span className="grid h-12 w-12 place-items-center rounded-lg bg-[#fff0e7] text-[#e95d2b]"><LockKeyhole size={22} /></span><p className="section-kicker mt-7 text-[#c9471e]">CG JOB CARE</p><h1 className="mt-2 text-3xl font-black text-[#35231c]">Admin sign in</h1><p className="mt-3 text-sm leading-6 text-[#72564a]">Sign in with the Super Admin or staff account created in your secure database.</p><form onSubmit={submit} className="mt-7 grid gap-4"><label className="grid gap-2 text-sm font-bold text-[#4a3025]">Email<input name="email" type="email" required autoFocus className="h-12 rounded-md border border-[#ead9ce] px-3 outline-none focus:border-[#e95d2b] focus:ring-2 focus:ring-[#ffe1d1]" /></label><label className="grid gap-2 text-sm font-bold text-[#4a3025]">Password<input name="password" type="password" required className="h-12 rounded-md border border-[#ead9ce] px-3 outline-none focus:border-[#e95d2b] focus:ring-2 focus:ring-[#ffe1d1]" /></label><button disabled={loading} className="rounded-lg bg-[#e95d2b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{loading ? "Signing in..." : "Sign in to admin"}</button>{error && <p className="rounded-md bg-[#fff0e9] px-3 py-2 text-sm font-bold text-[#c9471e]">{error}</p>}</form></section></main>;
}