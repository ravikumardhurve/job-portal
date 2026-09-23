export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const value = configured || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
  return value.replace(/\/$/, "");
}
