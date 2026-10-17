"use client";

import { useId, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import styles from "@/components/admin-management.module.css";

/** Search stays visible; secondary filters collapse only on small screens. */
export function AdminFilters({ search, activeCount = 0, children }: {
  search: ReactNode;
  activeCount?: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className={styles.filters} aria-label="Search and filters">
      <div className={styles.filterTop}>
        {search}
        <button type="button" className={styles.filterToggle} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <SlidersHorizontal size={16} aria-hidden="true" />Filters{activeCount > 0 && <span>{activeCount}</span>}
        </button>
      </div>
      <div id={id} className={`${styles.filterOptions} ${open ? styles.isOpen : ""}`}>{children}</div>
    </section>
  );
}
