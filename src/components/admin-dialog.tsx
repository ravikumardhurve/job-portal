"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "@/components/admin-management.module.css";

/** Native modal: focus containment, Escape, scroll lock and focus restoration. */
export function AdminDialog({ children, title, busy = false, onClose }: {
  children: ReactNode;
  title: string;
  busy?: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previousFocus?.focus();
    };
  }, []);
  return <dialog ref={ref} className={styles.dialog} aria-label={title} aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    {children}
  </dialog>;
}
