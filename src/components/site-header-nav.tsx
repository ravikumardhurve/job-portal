"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BriefcaseBusiness, LayoutDashboard, Menu, Phone, X } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { LogoutButton } from "@/components/logout-button";

const navLinks = [
  { href: "/jobs", label: "Find jobs" },
  { href: "/services", label: "Services" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeaderNav({ candidate, phone }: { candidate: { fullName: string } | null; phone?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {phone && <a href={`tel:${phone}`} className="hidden h-10 w-10 place-items-center rounded-lg border border-[#D5E3DB] text-[#157A4A] md:grid" aria-label="Call us"><Phone size={18} /></a>}
      {candidate ? (
        <div className="hidden items-center gap-2 sm:flex">
          <NotificationBell />
          <Link href="/candidate/dashboard" className="flex items-center gap-2 rounded-lg border border-[#D5E3DB] px-3 py-2 text-sm font-bold text-[#1E2B26] hover:border-[#157A4A]">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#E9F3ED] text-xs font-black text-[#0F5C38]">{candidate.fullName.charAt(0).toUpperCase()}</span>
            {candidate.fullName.split(" ")[0]}
          </Link>
          <LogoutButton />
        </div>
      ) : (
        <Link href="/candidate/register" className="hidden rounded-lg bg-[#157A4A] px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0F5C38] sm:block">Candidate login</Link>
      )}
      <div className="lg:hidden">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} className="grid h-10 w-10 place-items-center rounded-lg border border-[#D5E3DB] text-[#1E2B26]">
          {open ? <X size={19} /> : <Menu size={19} />}
        </button>
        {open && (
          <div className="fixed inset-x-0 top-[68px] z-40 border-b border-[#DCE8E1] bg-white px-5 py-4 shadow-lg">
            <nav aria-label="Mobile navigation" className="grid gap-1 text-sm font-semibold text-[#4B5A52]">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 hover:bg-[#EEF5F0] hover:text-[#157A4A]">{link.label}</Link>
              ))}
              {candidate ? (
                <>
                  <Link href="/candidate/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 hover:bg-[#EEF5F0] hover:text-[#157A4A]"><LayoutDashboard size={16} /> Dashboard</Link>
                  <Link href="/candidate/saved-jobs" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 hover:bg-[#EEF5F0] hover:text-[#157A4A]"><Bookmark size={16} /> Saved jobs</Link>
                  <Link href="/candidate/applications" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2.5 hover:bg-[#EEF5F0] hover:text-[#157A4A]"><BriefcaseBusiness size={16} /> My applications</Link>
                  <LogoutButton showLabel className="mt-2 flex items-center rounded-lg border border-[#D5E3DB] px-3 py-2.5 text-left font-bold text-[#0F5C38]" />
                </>
              ) : (
                <Link href="/candidate/register" onClick={() => setOpen(false)} className="mt-2 rounded-lg bg-[#157A4A] px-3 py-2.5 text-center font-bold text-white">Candidate login</Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
