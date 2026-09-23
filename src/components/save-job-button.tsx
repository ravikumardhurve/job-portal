"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

export function SaveJobButton({ jobId, initialSaved = false, variant = "icon" }: { jobId: string; initialSaved?: boolean; variant?: "icon" | "full" }) {
  const [saved, setSaved] = useState(initialSaved);
  const [state, setState] = useState<"idle" | "loading" | "login">("idle");

  async function toggle() {
    setState("loading");
    const response = saved
      ? await fetch(`/api/candidate/saved-jobs/${jobId}`, { method: "DELETE" })
      : await fetch("/api/candidate/saved-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
    if (response.status === 401) { setState("login"); return; }
    if (response.ok) setSaved((value) => !value);
    setState("idle");
  }

  if (state === "login") return <Link href="/candidate/login" className="text-xs font-bold text-[#0F5C38] underline underline-offset-4">Login to save</Link>;

  if (variant === "full") {
    return (
      <button type="button" onClick={toggle} disabled={state === "loading"} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#5C6B63] px-4 py-3 text-sm font-bold disabled:opacity-60">
        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? "Saved" : "Save job"}
      </button>
    );
  }

  return (
    <button type="button" onClick={toggle} disabled={state === "loading"} aria-label={saved ? "Unsave job" : "Save job"} title={saved ? "Unsave job" : "Save job"} className="grid h-9 w-9 place-items-center rounded-lg border border-[#D5E3DB] text-[#157A4A] disabled:opacity-60">
      {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
    </button>
  );
}
