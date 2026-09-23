"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";

export function AdminAccountManager({ name, email, role }: { name: string; email: string; role: string }) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(undefined); setError(undefined);
    const form = event.currentTarget; const values = new FormData(form);
    const newPassword = String(values.get("newPassword") ?? "");
    if (newPassword !== values.get("confirmPassword")) { setError("New password aur confirmation match nahi karte."); setSaving(false); return; }
    const response = await fetch("/api/admin/account/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword: values.get("currentPassword"), newPassword }) });
    const result = await response.json() as { message?: string; error?: string }; setSaving(false);
    if (!response.ok) { setError(result.error ?? "Password update nahi hua."); return; }
    form.reset(); setMessage(result.message);
  }
  return <main><div className="rounded-xl bg-[#35231C] p-6 text-white"><ShieldCheck size={24} className="text-[#FFCF68]" /><h1 className="mt-4 text-3xl font-black">My admin account</h1><p className="mt-2 text-sm text-[#ECD9CF]">{name} · {email} · {role.replaceAll("_", " ")}</p></div>{message && <p className="mt-5 rounded-lg bg-[#E8F5ED] px-4 py-3 text-sm font-bold text-[#258653]">{message}</p>}{error && <p className="mt-5 rounded-lg bg-[#FFF0E7] px-4 py-3 text-sm font-bold text-[#C9471E]">{error}</p>}<section className="mt-6 max-w-xl rounded-xl border border-[#E0E8E2] bg-white p-6"><div className="flex items-center gap-3"><KeyRound className="text-[#E95D2B]" /><div><h2 className="text-xl font-black">Change password</h2><p className="text-xs text-[#71837A]">Strong, unique password use karein.</p></div></div><form onSubmit={submit} className="mt-6 grid gap-4"><Field label="Current password" name="currentPassword" /><Field label="New password" name="newPassword" /><Field label="Confirm new password" name="confirmPassword" /><button disabled={saving} className="w-fit rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-black text-white disabled:opacity-50">{saving ? "Updating..." : "Change password"}</button></form></section></main>;
}

function Field({ label, name }: { label: string; name: string }) { return <label className="grid gap-2 text-sm font-bold">{label}<input type="password" name={name} minLength={10} required className="admin-input" /></label>; }
