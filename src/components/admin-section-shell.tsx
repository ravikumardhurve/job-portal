"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ArrowUpRight, BriefcaseBusiness, Building2, CalendarCheck, ChevronDown, ClipboardList, FileText, FileSpreadsheet, LayoutDashboard, Menu, MessageSquareText, Settings, ShieldCheck, ShieldAlert, ScrollText, UserCog, UsersRound } from "lucide-react";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import type { AdminRole } from "@/lib/admin-users";
import { BUSINESS_VERTICAL_LABELS, type BusinessVertical } from "@/lib/admin-scope";
import styles from "./admin-shell.module.css";

type AdminSectionShellProps = {
  children: React.ReactNode;
  role?: AdminRole;
  name?: string;
  companyName?: string;
  businessVerticals?: BusinessVertical[];
};

const operations = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/admin/candidates", label: "Candidates", icon: UsersRound },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/interviews", label: "Interviews", icon: CalendarCheck },
  { href: "/admin/employer-requirements", label: "Hiring requirements", icon: Building2 },
  { href: "/admin/service-requests", label: "Service requests", icon: ClipboardList },
  { href: "/admin/reports", label: "Reports & insights", icon: FileSpreadsheet },
];
function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}

export function AdminSectionShell({ children, role, name, companyName = "CG Job Care", businessVerticals = [] }: AdminSectionShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (!isLoginPage && !role) router.replace("/admin/login");
  }, [isLoginPage, role, router]);

  useEffect(() => { mobileMenu.current?.removeAttribute("open"); }, [pathname]);

  if (isLoginPage || !role) return children;

  const canManageSite = role === "SUPER_ADMIN" || role === "ADMIN";
  const groups = [
    { label: "WORKSPACE", items: operations },
    ...(canManageSite ? [{ label: "WEBSITE", items: [
      { href: "/admin/reviews", label: "Customer reviews", icon: MessageSquareText },
      { href: "/admin/privacy-requests", label: "Privacy requests", icon: ShieldAlert },
      { href: "/admin/settings", label: "Website manager", icon: Settings },
    ] }] : []),
    { label: "ADMINISTRATION", items: [
      ...(role === "SUPER_ADMIN" ? [
        { href: "/admin/team", label: "Partner admins", icon: ShieldCheck },
        { href: "/admin/audit-logs", label: "Audit history", icon: ScrollText },
      ] : []),
      { href: "/admin/account", label: "My account", icon: UserCog },
    ] },
  ];
  const current = groups.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));
  const workspaceLabel = canManageSite ? "All business fields" : businessVerticals.map((vertical) => BUSINESS_VERTICAL_LABELS[vertical]).join(", ") || "Recruitment";
  const roleLabel = role.replaceAll("_", " ").toLowerCase();
  const initials = name?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
  const navGroups = groups.map((group) => <div className={styles.navGroup} key={group.label}><p>{group.label}</p>{group.items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined} className={isActive(pathname, href) ? styles.active : undefined} onClick={() => mobileMenu.current?.removeAttribute("open")}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>)}</div>);

  return (
    <div className={styles.shell}>
      <a href="#admin-content" className={styles.skipLink}>Skip to content</a>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}><span>CG</span><div><strong>{companyName}</strong><small>ADMIN WORKSPACE</small></div></Link>
        <nav className={styles.navigation} aria-label="Admin navigation">{navGroups}</nav>
        <div className={styles.sidebarFooter}><div><ShieldCheck size={17} /><span>YOUR ACCESS</span></div><p>{workspaceLabel}</p><Link href="/">Open public website <ArrowUpRight size={15} /></Link></div>
      </aside>
      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.pageLabel}><span>Workspace <span aria-hidden="true">/</span></span><strong>{current?.label ?? "Administration"}</strong></div>
          <div className={styles.topActions}><Link href="/" className={styles.websiteLink}>View Website <ArrowUpRight size={15} /></Link><Link href="/admin/account" className={styles.profile}><span className={styles.avatar}>{initials}</span><div><strong>{name || "Administrator"}</strong><small>{roleLabel}</small></div></Link><AdminLogoutButton /></div>
        </header>
        <details className={styles.mobileMenu} ref={mobileMenu} onKeyDown={(event) => { if (event.key === "Escape") { mobileMenu.current?.removeAttribute("open"); mobileMenu.current?.querySelector("summary")?.focus(); } }}>
          <summary><Menu size={19} />Admin navigation<ChevronDown size={16} /></summary>
          <nav aria-label="Mobile admin navigation">{navGroups}</nav>
        </details>
        <div id="admin-content" tabIndex={-1} className={`${styles.content} ${pathname === "/admin" ? "" : "[&>div]:min-h-0 [&>div]:bg-transparent [&>div>aside]:hidden [&>div>main]:!pl-0 [&>div>main>div]:!p-0 [&>div>main>header]:hidden [&>div>main>nav]:hidden [&>main]:min-h-0 [&>main]:bg-transparent [&>main>div]:mx-0 [&>main>div]:max-w-none [&>main>div]:p-0 [&>main>form]:mx-0 [&>main>form]:max-w-none [&>main>form]:p-0 [&>main>header]:hidden"}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
