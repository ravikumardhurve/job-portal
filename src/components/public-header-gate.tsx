"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

function isPrivatePath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/candidate" || pathname.startsWith("/candidate/");
}

export function PublicHeaderGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return isPrivatePath(pathname) ? null : children;
}
