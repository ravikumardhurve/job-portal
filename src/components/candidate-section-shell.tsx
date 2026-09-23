"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  CircleUserRound,
  LayoutDashboard,
  Search,
  ShieldCheck,
} from "lucide-react";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/notification-bell";

type CandidateSectionShellProps = {
  children: React.ReactNode;
  candidate?: { fullName: string };
};

const items = [
  { href: "/candidate/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidate/profile", label: "My profile", icon: CircleUserRound },
  { href: "/candidate/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/candidate/interviews", label: "Interviews", icon: CalendarDays },
  { href: "/candidate/saved-jobs", label: "Saved jobs", icon: Bookmark },
  { href: "/candidate/privacy", label: "Privacy & data", icon: ShieldCheck },
  { href: "/jobs", label: "Find jobs", icon: Search },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/jobs" && pathname.startsWith(`${href}/`));
}

export function CandidateSectionShell({ children, candidate }: CandidateSectionShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/candidate/login" || pathname === "/candidate/register";

  useEffect(() => {
    if (!isAuthPage && pathname.startsWith("/candidate/") && !candidate) router.replace("/candidate/login");
  }, [candidate, isAuthPage, pathname, router]);

  if (isAuthPage || !candidate) return children;

  const current = items.find((item) => isActive(pathname, item.href));

  return (
    <div className="min-h-screen bg-[#EEF5F0] text-[#1F332C]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#DCE8E1] bg-white p-5 lg:block">
        <Link href="/candidate/dashboard" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#157A4A] text-sm font-black text-white">CG</span>
          <span>
            <strong className="block">CG Job Care</strong>
            <small className="text-xs text-[#5C6B63]">Candidate workspace</small>
          </span>
        </Link>
        <nav className="mt-10 grid gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold ${active ? "bg-[#E9F3ED] text-[#0F5C38]" : "text-[#4B5A52] hover:bg-[#EEF5F0]"}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-[78px] items-center justify-between border-b border-[#DCE8E1] bg-white px-5 lg:px-9">
          <div>
            <p className="text-xs font-bold tracking-[0.1em] text-[#157A4A]">CANDIDATE PORTAL</p>
            <h1 className="mt-1 text-xl font-black">{current?.label ?? "Candidate workspace"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E9F3ED] text-sm font-black text-[#0F5C38]">{candidate.fullName.charAt(0).toUpperCase()}</span>
            <LogoutButton />
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-[#DCE8E1] bg-white px-5 py-3 lg:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold ${isActive(pathname, item.href) ? "bg-[#E9F3ED] text-[#0F5C38]" : "bg-[#F5FAF7] text-[#4B5A52]"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-7 lg:px-9 [&>main]:min-h-0 [&>main]:bg-transparent [&>main]:p-0 [&>main>div]:mx-0 [&>main>div]:max-w-none [&>main>div]:!block [&>main>div]:p-0 [&>main>div>aside]:hidden [&>main>header]:hidden [&>main>section]:mx-0 [&>main>section]:max-w-none [&>main>section]:p-0">
          {children}
        </div>
      </div>
    </div>
  );
}
