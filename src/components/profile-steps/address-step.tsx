"use client";

import { FormEvent, useState } from "react";
import { Field } from "./field";
import { CHHATTISGARH_DISTRICTS, type SafeCandidate } from "@/lib/constants";

export function AddressStep({ candidate, onSaved }: { candidate: SafeCandidate; onSaved: (candidate: SafeCandidate) => void }) {
  const [sameAsCurrent, setSameAsCurrent] = useState(candidate.permanentAddress?.sameAsCurrent ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    const values = new FormData(event.currentTarget);
    const currentAddress = {
      line1: String(values.get("currentLine1") ?? ""),
      state: String(values.get("currentState") ?? ""),
      district: String(values.get("currentDistrict") ?? ""),
      city: String(values.get("currentCity") ?? ""),
      pincode: String(values.get("currentPincode") ?? ""),
    };
    const permanentAddress = sameAsCurrent
      ? { ...currentAddress, sameAsCurrent: true }
      : {
          line1: String(values.get("permanentLine1") ?? ""),
          state: String(values.get("permanentState") ?? ""),
          district: String(values.get("permanentDistrict") ?? ""),
          city: String(values.get("permanentCity") ?? ""),
          pincode: String(values.get("permanentPincode") ?? ""),
          sameAsCurrent: false,
        };
    const response = await fetch("/api/candidate/address", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentAddress, permanentAddress }) });
    const result = await response.json() as { data?: SafeCandidate; error?: string };
    setSaving(false);
    if (!response.ok || !result.data) { setError(result.error ?? "Could not save your address."); return; }
    onSaved(result.data);
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <p className="text-sm font-black text-[#1E2B26]">Current address</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Address line"><input name="currentLine1" defaultValue={candidate.currentAddress?.line1 ?? ""} className="profile-input" placeholder="House no, street, area" /></Field>
        <Field label="Pincode"><input name="currentPincode" defaultValue={candidate.currentAddress?.pincode ?? ""} className="profile-input" placeholder="492001" /></Field>
        <Field label="State"><input name="currentState" defaultValue={candidate.currentAddress?.state ?? "Chhattisgarh"} className="profile-input" /></Field>
        <Field label="District">
          <select name="currentDistrict" defaultValue={candidate.currentAddress?.district ?? ""} className="profile-input">
            <option value="">Select district</option>
            {CHHATTISGARH_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
        </Field>
        <Field label="City / Town"><input name="currentCity" defaultValue={candidate.currentAddress?.city ?? candidate.city ?? ""} required className="profile-input" /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-[#33473F]">
        <input type="checkbox" checked={sameAsCurrent} onChange={(event) => setSameAsCurrent(event.target.checked)} className="h-4 w-4" />
        Permanent address same as current address
      </label>
      {!sameAsCurrent && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line"><input name="permanentLine1" defaultValue={candidate.permanentAddress?.line1 ?? ""} className="profile-input" /></Field>
          <Field label="Pincode"><input name="permanentPincode" defaultValue={candidate.permanentAddress?.pincode ?? ""} className="profile-input" /></Field>
          <Field label="State"><input name="permanentState" defaultValue={candidate.permanentAddress?.state ?? "Chhattisgarh"} className="profile-input" /></Field>
          <Field label="District">
            <select name="permanentDistrict" defaultValue={candidate.permanentAddress?.district ?? ""} className="profile-input">
              <option value="">Select district</option>
              {CHHATTISGARH_DISTRICTS.map((district) => <option key={district} value={district}>{district}</option>)}
            </select>
          </Field>
          <Field label="City / Town"><input name="permanentCity" defaultValue={candidate.permanentAddress?.city ?? ""} className="profile-input" /></Field>
        </div>
      )}
      {error && <p className="rounded-md bg-[#E9F3ED] px-3 py-2 text-sm font-bold text-[#0F5C38]">{error}</p>}
      <button disabled={saving} className="w-fit rounded-lg bg-[#157A4A] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Saving..." : "Save and continue"}</button>
    </form>
  );
}
