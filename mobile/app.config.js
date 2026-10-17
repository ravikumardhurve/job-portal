const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { parseEnv } = require('node:util');

module.exports = ({ config }) => {
  // Expo normally loads dotenv first. Also handle a dev server started before .env existed.
  // Read only this app's file, never the parent portal's .env.local or its secrets.
  const localFile = join(__dirname, '.env');
  const configured = process.env.EXPO_PUBLIC_API_URL
    ?? (existsSync(localFile) ? parseEnv(readFileSync(localFile, 'utf8')).EXPO_PUBLIC_API_URL : undefined);
  const apiUrl = configured?.trim().replace(/\/+$/, '') ?? '';
  let valid = false;
  try {
    const url = new URL(apiUrl);
    valid = ['http:', 'https:'].includes(url.protocol) && !!url.hostname
      && !url.username && !url.password && !url.search && !url.hash;
  } catch { /* Report the configuration problem before serving an unusable app. */ }
  if (!valid) throw new Error('Set EXPO_PUBLIC_API_URL in mobile/.env to a valid http(s) backend URL (without /api), then restart Expo.');
  return { ...config, name: config.name ?? 'CG Job Care', slug: config.slug ?? 'cg-job-care',
    extra: { ...config.extra, apiUrl },
  };
};
