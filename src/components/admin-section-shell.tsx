"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  FileSpreadsheet,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  ShieldCheck,
  ShieldAlert,
  ScrollText,
  UserCog,
  UsersRound,
} from "lucide-react";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import type { AdminRole } from "@/lib/admin-users";
import { BUSINESS_VERTICAL_LABELS, type BusinessVertical } from "@/lib/admin-scope";

type AdminSectionShellProps = {
  children: React.ReactNode;
  role?: AdminRole;
  name?: string;
  businessVerticals?: BusinessVertical[];
};

const baseItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidate pool", icon: UsersRound },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/interviews", label: "Interviews", icon: CalendarCheck },
  { href: "/admin/jobs", label: "Job management", icon: BriefcaseBusiness },
  { href: "/admin/employer-requirements", label: "Employer requirements", icon: Building2 },
  { href: "/admin/service-requests", label: "Service requests", icon: ClipboardList },
  { href: "/admin/reports", label: "Reports", icon: FileSpreadsheet },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminSectionShell({ children, role, name, businessVerticals = [] }: AdminSectionShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !role) router.replace("/admin/login");
  }, [isLoginPage, role, router]);

  if (isLoginPage || !role) return children;

  const canManageSite = role === "SUPER_ADMIN" || role === "ADMIN";
  const coreItems = canManageSite
    ? [...baseItems, { href: "/admin/reviews", label: "Customer reviews", icon: MessageSquareText }, { href: "/admin/privacy-requests", label: "Privacy requests", icon: ShieldAlert }, { href: "/admin/settings", label: "Website manager", icon: Settings }]
    : baseItems;
  const items = role === "SUPER_ADMIN" ? [...coreItems, { href: "/admin/team", label: "Partner admins", icon: ShieldCheck }, { href: "/admin/audit-logs", label: "Audit history", icon: ScrollText }, { href: "/admin/account", label: "My account", icon: UserCog }] : [...coreItems, { href: "/admin/account", label: "My account", icon: UserCog }];
  const current = items.find((item) => isActive(pathname, item.href));
  const workspaceLabel = canManageSite ? "All business fields" : businessVerticals.map((vertical) => BUSINESS_VERTICAL_LABELS[vertical]).join(", ") || "Recruitment";

  return (
    <div className="min-h-screen bg-[#f5f7f5] text-[#25372e]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#dfe8e1] bg-white p-5 lg:block">
        <Link href="/admin" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e95d2b] text-sm font-black text-white">CG</span>
          <span>
            <strong className="block">CG Job Care</strong>
            <small className="text-xs text-[#7a8d82]">{workspaceLabel}</small>
          </span>
        </Link>
        <nav className="mt-8 grid max-h-[calc(100vh-150px)] gap-1 overflow-y-auto pb-28">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold ${active ? "bg-[#fff0e7] text-[#c9471e]" : "text-[#65786d] hover:bg-[#f3f7f4]"}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-5 right-5 rounded-lg bg-[#35231c] p-4 text-white">
          <BriefcaseBusiness size={18} className="text-[#ffcf68]" />
          <p className="mt-3 text-sm font-bold">{name ?? "Admin controls"}</p>
          <p className="mt-1 text-xs leading-5 text-[#dfcfc6]">{workspaceLabel}</p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-[78px] items-center justify-between border-b border-[#dfe8e1] bg-white px-5 lg:px-9">
          <div>
            <p className="text-xs font-bold tracking-[0.1em] text-[#e95d2b]">ADMIN PORTAL</p>
            <h1 className="mt-1 text-xl font-black">{current?.label ?? "Admin workspace"}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg border border-[#e0e8e2] text-[#63766b]" aria-label="Notifications"><Bell size={18} /></span>
            <AdminLogoutButton />
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e8f5ed] text-sm font-black text-[#258653]">{name?.charAt(0).toUpperCase() ?? "A"}</span>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto border-b border-[#dfe8e1] bg-white px-5 py-3 lg:hidden">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-md px-3 py-2 text-xs font-bold ${isActive(pathname, item.href) ? "bg-[#fff0e7] text-[#c9471e]" : "bg-[#f3f7f4] text-[#65786d]"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-5 py-7 lg:px-9 [&>div]:min-h-0 [&>div]:bg-transparent [&>div>aside]:hidden [&>div>main]:!pl-0 [&>div>main>div]:!p-0 [&>div>main>header]:hidden [&>div>main>nav]:hidden [&>main]:min-h-0 [&>main]:bg-transparent [&>main>div]:mx-0 [&>main>div]:max-w-none [&>main>div]:p-0 [&>main>form]:mx-0 [&>main>form]:max-w-none [&>main>form]:p-0 [&>main>header]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
