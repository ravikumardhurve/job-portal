"use client";

import { FormEvent, useState } from "react";

type Field = { name: string; label: string; type?: "text" | "tel" | "email" | "password" | "number" | "select"; options?: string[]; required?: boolean };

export function SubmissionForm({ action, fields, buttonText, redirectTo, defaultValues }: { action: string; fields: Field[]; buttonText: string; redirectTo?: string; defaultValues?: Record<string, string> }) {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(undefined);
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string | number> = {};
    formData.forEach((value, key) => {
      if (typeof value === "string") payload[key] = value;
    });
    if (payload.candidatesRequired) payload.candidatesRequired = Number(payload.candidatesRequired);
    if (payload.staffRequired) payload.staffRequired = Number(payload.staffRequired);
    const response = await fetch(action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json() as { message?: string; error?: string };
    setSubmitting(false);
    if (!response.ok) { setError(result.error ?? "Something went wrong. Please try again."); return; }
    if (redirectTo) { window.location.assign(redirectTo); return; }
    setMessage(result.message ?? "Submitted successfully.");
    event.currentTarget.reset();
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-[#D5E3DB] bg-white p-6 shadow-[0_14px_35px_rgba(130,76,40,.08)] sm:grid-cols-2">
    {fields.map((field) => <label key={field.name} className="grid gap-2 text-sm font-bold text-[#2A3B34]">{field.label}{field.type === "select" ? <select name={field.name} required={field.required} defaultValue={defaultValues?.[field.name] ?? ""} className="h-12 rounded-md border border-[#D5E3DB] bg-white px-3 font-normal outline-none transition focus:border-[#157A4A] focus:ring-2 focus:ring-[#CDE5D8]"><option value="">Select</option>{field.options?.map((option) => <option key={option} value={option.toUpperCase().replaceAll(" ", "_")}>{option}</option>)}</select> : <input name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={defaultValues?.[field.name] ?? ""} className="h-12 rounded-md border border-[#D5E3DB] px-3 font-normal outline-none transition focus:border-[#157A4A] focus:ring-2 focus:ring-[#CDE5D8]" />}</label>)}
    <div className="sm:col-span-2"><button disabled={submitting} className="rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#0F5C38] disabled:opacity-60">{submitting ? "Submitting..." : buttonText}</button>{message && <p className="mt-4 rounded-md bg-[#E3F3EA] px-3 py-2 text-sm font-bold text-[#1F7A4D]">{message}</p>}{error && <p className="mt-4 rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}</div>
  </form>;
}
