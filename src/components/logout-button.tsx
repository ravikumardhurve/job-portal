"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ className, showLabel = false }: { className?: string; showLabel?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/candidate-logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} aria-label="Logout" title="Logout" className={className ?? "grid h-10 w-10 place-items-center rounded-lg border border-[#DCE8E1] text-[#4B5A52]"}>
      <LogOut size={18} />
      {showLabel && <span className="ml-2 text-sm font-bold">Logout</span>}
    </button>
  );
}
