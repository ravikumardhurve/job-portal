"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareJobButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); setMessage("Job link copied"); }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Link copy nahi ho paaya. Browser address bar se URL copy karein.");
    }
  }

  return <><button type="button" onClick={share} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-[#5C6B63] px-4 py-3 text-sm font-bold"><Share2 size={16} /> Share job</button><span role="status" className="mt-2 block text-center text-xs text-[#D5E3DB]">{message}</span></>;
}
