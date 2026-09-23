"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";

type Notification = { id: string; title: string; message: string; createdAt: string; read: boolean };

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/candidate/notifications", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Notifications load nahi ho sake.");
      const result = await response.json() as { data: Notification[] };
      setNotifications(result.data);
    }).catch(() => { if (!controller.signal.aborted) setError("Notifications load nahi ho sake."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  async function markRead(notificationId: string) {
    setNotifications((current) => current.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)));
    try {
      const response = await fetch("/api/candidate/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notificationId }) });
      if (!response.ok) throw new Error();
    } catch { setError("Read status save nahi hua. Page refresh karke dobara try karein."); }
  }

  async function markAllRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    try {
      const response = await fetch("/api/candidate/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
      if (!response.ok) throw new Error();
    } catch { setError("Read status save nahi hua. Page refresh karke dobara try karein."); }
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-label="Notifications" aria-expanded={open} className="relative grid h-10 w-10 place-items-center rounded-lg border border-[#DCE8E1] text-[#4B5A52]">
        <Bell size={18} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#157A4A] px-1 text-[10px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div aria-label="Notifications" className="absolute right-0 top-12 z-40 w-80 rounded-lg border border-[#DCE8E1] bg-white p-3 shadow-xl">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-black text-[#1F332C]">Notifications</p>
            {unreadCount > 0 && <button type="button" onClick={markAllRead} className="text-xs font-bold text-[#0F5C38]">Mark all read</button>}
          </div>
          <div className="mt-2 grid max-h-80 gap-1 overflow-y-auto">
            {loading && <p role="status" className="px-1 py-4 text-center text-sm text-[#5C6B63]">Loading notifications...</p>}
            {error && <p role="alert" className="px-1 py-4 text-center text-sm text-[#C9471E]">{error}</p>}
            {!loading && !error && notifications.length === 0 && <p className="px-1 py-4 text-center text-sm text-[#5C6B63]">No notifications yet.</p>}
            {notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => markRead(notification.id)} className={`rounded-md p-2 text-left text-sm ${notification.read ? "text-[#5C6B63]" : "bg-[#E9F3ED] font-semibold text-[#1E2B26]"}`}>
                <p>{notification.title}</p>
                <p className="mt-1 text-xs text-[#6B7A72]">{notification.message}</p>
                <p className="mt-1 text-[10px] text-[#8A9A91]">{new Date(notification.createdAt).toLocaleString("en-IN")}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
