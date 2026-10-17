"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(undefined);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not sign in.");
      router.replace("/admin");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in. Please try again.");
    } finally { setLoading(false); }
  }
  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="login-title">
      <div className={styles.brand}><span>CG</span><div><strong>CG Job Care</strong><small>ADMIN WORKSPACE</small></div></div>
      <div className={styles.content}>
        <h1 id="login-title">Welcome back.</h1>
        <p>Sign in to manage your jobs, people and services.</p>
        <form onSubmit={submit} aria-busy={loading}>
          <label>Email address<input name="email" type="email" autoComplete="username" required placeholder="Your work email" /></label>
          <label htmlFor="admin-password">Password
            <div className={styles.password}>
              <input id="admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="Enter your password" />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </label>
          {error && <p role="alert" className={styles.error}>{error}</p>}
          <button disabled={loading} className={styles.submit}>{loading ? "Signing in…" : "Sign in to admin"}<ArrowRight size={16} aria-hidden="true" /></button>
        </form>
        <Link href="/" className={styles.back}>← Back to website</Link>
      </div>
    </section>
  </main>;
}
