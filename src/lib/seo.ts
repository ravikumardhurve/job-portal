export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  const value = configured || (vercelHost ? `https://${vercelHost}` : "http://localhost:3000");
  return value.replace(/\/$/, "");
}

export function getGoogleSiteVerification() {
  const value = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  if (!value || value === "replace-with-google-search-console-token") return undefined;
  return value;
}
