"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { BUSINESS_VERTICAL_LABELS, BUSINESS_VERTICALS } from "@/lib/admin-scope";
import type { AdminRole, SafeAdminUser } from "@/lib/admin-users";

export function AdminUserManager() {
  const [users, setUsers] = useState<SafeAdminUser[]>();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    const result = await response.json() as { data?: SafeAdminUser[]; error?: string };
    if (response.ok) setUsers(result.data ?? []);
    else setError(result.error ?? "Could not load admin accounts.");
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    setMessage(undefined);
    const form = event.currentTarget;
    const values = new FormData(form);
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: values.get("name"), email: values.get("email"), password: values.get("password"), businessVertical: values.get("businessVertical") }),
    });
    const result = await response.json() as { error?: string; message?: string };
    setSaving(false);
    if (!response.ok) { setError(result.error ?? "Could not create account."); return; }
    form.reset();
    setMessage(result.message ?? "Partner admin created.");
    await load();
  }

  async function setStatus(userId: string, status: "ACTIVE" | "SUSPENDED") {
    setError(undefined);
    const response = await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const result = await response.json() as { error?: string; message?: string };
    if (!response.ok) { setError(result.error ?? "Could not update account."); return; }
    setMessage(result.message ?? "Account updated.");
    await load();
  }

  return (
    <div>
      <div className="rounded-lg bg-[#35231c] p-6 text-white">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/10 text-[#ffcf68]"><ShieldCheck size={22} /></span>
          <div><p className="section-kicker text-[#ffcf68]">ACCESS CONTROL</p><h1 className="mt-1 text-2xl font-black">Partner admin accounts</h1></div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[#ecd9cf]">Create one login for each business partner. Every partner sees only the jobs, applications, interviews and service leads assigned to their business field.</p>
      </div>

      {message && <p className="mt-5 rounded-lg bg-[#e8f5ed] px-4 py-3 text-sm font-bold text-[#258653]">{message}</p>}
      {error && <p className="mt-5 rounded-lg bg-[#fff0e7] px-4 py-3 text-sm font-bold text-[#c9471e]">{error}</p>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-lg border border-[#e0e8e2] bg-white p-6">
          <div className="flex items-center gap-3"><UserPlus size={20} className="text-[#e95d2b]" /><div><p className="section-kicker text-[#e95d2b]">NEW LOGIN</p><h2 className="text-xl font-black">Add business partner</h2></div></div>
          <form onSubmit={create} className="mt-6 grid gap-4">
            <Field label="Partner name"><input name="name" required className="admin-input" placeholder="Partner or manager name" /></Field>
            <Field label="Login email"><input name="email" type="email" required className="admin-input" placeholder="partner@example.com" /></Field>
            <Field label="Temporary password"><input name="password" type="password" minLength={10} required className="admin-input" placeholder="Minimum 10 characters" /></Field>
            <Field label="Business field"><select name="businessVertical" required className="admin-input" defaultValue=""><option value="" disabled>Select field</option>{BUSINESS_VERTICALS.map((vertical) => <option key={vertical} value={vertical}>{BUSINESS_VERTICAL_LABELS[vertical]}</option>)}</select></Field>
            <button disabled={saving} className="mt-1 inline-flex w-fit items-center gap-2 rounded-lg bg-[#e95d2b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><UserPlus size={17} />{saving ? "Creating..." : "Create partner login"}</button>
          </form>
        </section>

        <section className="overflow-hidden rounded-lg border border-[#e0e8e2] bg-white">
          <div className="flex items-center gap-3 border-b border-[#e7eee9] px-6 py-5"><UsersRound size={20} className="text-[#e95d2b]" /><div><p className="section-kicker text-[#e95d2b]">ADMIN TEAM</p><h2 className="text-xl font-black">Active access</h2></div></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-[#f7faf8] text-xs font-bold text-[#71837a]"><tr><th className="px-5 py-3">ADMIN</th><th>FIELD</th><th>ACTIVITY</th><th>ROLE</th><th className="px-5">STATUS</th></tr></thead>
              <tbody>
                {users?.map((user) => <AdminRow key={user.id} user={user} onStatus={setStatus} />)}
                {users && !users.length && <tr><td colSpan={5} className="px-5 py-10 text-center text-[#71837a]">No admin accounts found.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminRow({ user, onStatus }: { user: SafeAdminUser; onStatus: (id: string, status: "ACTIVE" | "SUSPENDED") => void }) {
  const fields = user.role === "SUPER_ADMIN" || user.role === "ADMIN"
    ? "All business fields"
    : (user.businessVerticals ?? ["RECRUITMENT"]).map((vertical) => BUSINESS_VERTICAL_LABELS[vertical]).join(", ");
  const canChange = user.role !== "SUPER_ADMIN";
  return (
    <tr className="border-t border-[#edf1ee]">
      <td className="px-5 py-4"><p className="font-bold">{user.name}</p><p className="mt-1 text-xs text-[#71837a]">{user.email}</p></td>
      <td>{fields}</td>
      <td><p className="text-xs font-bold">Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("en-IN") : "Never"}</p><p className="mt-1 text-[10px] text-[#71837a]">Active: {user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString("en-IN") : "No activity"} · {user.loginCount ?? 0} logins</p>{user.passwordChangedAt && <p className="mt-1 text-[10px] text-[#71837a]">Password changed {new Date(user.passwordChangedAt).toLocaleDateString("en-IN")}</p>}</td>
      <td><span className="rounded-full bg-[#eaf1ff] px-2.5 py-1 text-[11px] font-bold text-[#3d69be]">{roleLabel(user.role)}</span></td>
      <td className="px-5">{canChange ? <button onClick={() => onStatus(user.id, user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")} className={`rounded-md px-3 py-2 text-xs font-bold ${user.status === "ACTIVE" ? "bg-[#fff0e7] text-[#c9471e]" : "bg-[#e8f5ed] text-[#258653]"}`}>{user.status === "ACTIVE" ? "Suspend" : "Activate"}</button> : <span className="text-xs font-bold text-[#258653]">Protected</span>}</td>
    </tr>
  );
}

function roleLabel(role: AdminRole) {
  if (role === "RECRUITER" || role === "PARTNER_ADMIN") return "PARTNER ADMIN";
  return role.replaceAll("_", " ");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-bold text-[#43564c]">{label}{children}</label>;
}
