"use client";

import { FormEvent, useState } from "react";

type Field = { name: string; label: string; type?: "text" | "tel" | "email" | "number" | "select"; options?: string[]; required?: boolean };

export function SubmissionForm({ action, fields, buttonText }: { action: string; fields: Field[]; buttonText: string }) {
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
    setMessage(result.message ?? "Submitted successfully.");
    event.currentTarget.reset();
  }

  return <form onSubmit={submit} className="grid gap-5 rounded-lg border border-[#eeded4] bg-white p-6 shadow-[0_14px_35px_rgba(130,76,40,.08)] sm:grid-cols-2">
    {fields.map((field) => <label key={field.name} className="grid gap-2 text-sm font-bold text-[#4a3025]">{field.label}{field.type === "select" ? <select name={field.name} required={field.required} className="h-12 rounded-md border border-[#ead9ce] bg-white px-3 font-normal outline-none transition focus:border-[#e95d2b] focus:ring-2 focus:ring-[#ffe1d1]"><option value="">Select</option>{field.options?.map((option) => <option key={option} value={option.toUpperCase().replaceAll(" ", "_")}>{option}</option>)}</select> : <input name={field.name} type={field.type ?? "text"} required={field.required} className="h-12 rounded-md border border-[#ead9ce] px-3 font-normal outline-none transition focus:border-[#e95d2b] focus:ring-2 focus:ring-[#ffe1d1]" />}</label>)}
    <div className="sm:col-span-2"><button disabled={submitting} className="rounded-lg bg-[#e95d2b] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#d64b1d] disabled:opacity-60">{submitting ? "Submitting..." : buttonText}</button>{message && <p className="mt-4 rounded-md bg-[#ecf8ef] px-3 py-2 text-sm font-bold text-[#28744d]">{message}</p>}{error && <p className="mt-4 rounded-md bg-[#fff0e9] px-3 py-2 text-sm font-bold text-[#c9471e]">{error}</p>}</div>
  </form>;
}