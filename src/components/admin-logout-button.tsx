"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} disabled={loading} className="grid h-10 w-10 place-items-center rounded-lg border border-[#e0e8e2] text-[#63766b] disabled:opacity-50" aria-label="Sign out">
      <LogOut size={18} />
    </button>
  );
}
