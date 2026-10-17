/* eslint-disable @typescript-eslint/no-require-imports -- Isolated checks without network/database access. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}) {
  const compiledModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module: compiledModule, exports: compiledModule.exports, Response, Request, URL, ...globals });
  return compiledModule.exports;
}

async function main() {
  // Check the exact Expo Go failure: env missing but public manifest URL present.
  let fetchCalls = 0;
  const api = (envUrl, manifestUrl, dev = true) => load('mobile/src/api.ts', {
    process: { env: { EXPO_PUBLIC_API_URL: envUrl } }, __DEV__: dev,
    require: id => { assert.equal(id, 'expo-constants'); return { default: { expoConfig: { extra: { apiUrl: manifestUrl } } } }; },
    AbortController, setTimeout, clearTimeout,
    fetch: async url => { fetchCalls++; assert.equal(url, 'http://192.168.1.2:3000/api/mobile/jobs'); return Response.json({ data: [] }); },
  });
  const fallback = api(undefined, ' http://192.168.1.2:3000/ ');
  assert.equal(fallback.API_URL, 'http://192.168.1.2:3000');
  assert.equal((await fallback.request('jobs')).data.length, 0);
  assert.equal(fetchCalls, 1);
  assert.equal(api(' https://portal.example.com/ ', 'http://192.168.1.2:3000').API_URL, 'https://portal.example.com');
  assert.equal(api(' ', 'http://192.168.1.2:3000').API_URL, 'http://192.168.1.2:3000');
  await assert.rejects(() => api(undefined, undefined).request('jobs'), /Set EXPO_PUBLIC_API_URL/);
  await assert.rejects(() => api(undefined, 'http://192.168.1.2:3000', false).request('jobs'), /HTTPS/);
  assert.equal(fetchCalls, 1, 'Missing configuration and production HTTP must not send requests');

  const configWith = (env, file) => load('mobile/app.config.js', {
    process: { env }, __dirname: '/fixture/mobile',
    require: id => {
      if (id === 'node:fs') return { existsSync: () => file !== undefined, readFileSync: () => file };
      if (id === 'node:path') return path;
      if (id === 'node:util') return require('node:util');
      throw new Error(`Unexpected config import ${id}`);
    },
  })({ config: { name: 'Fixture', slug: 'fixture', extra: { retained: true } } });
  const config = configWith({}, 'EXPO_PUBLIC_API_URL=http://192.168.1.2:3000\nBACKEND_SECRET=not-for-mobile');
  assert.equal(config.extra.apiUrl, 'http://192.168.1.2:3000');
  assert.equal(config.extra.BACKEND_SECRET, undefined);
  assert.equal(config.extra.retained, true);
  assert.equal(configWith({ EXPO_PUBLIC_API_URL: 'https://portal.example.com' }, 'EXPO_PUBLIC_API_URL=http://other.test').extra.apiUrl, 'https://portal.example.com');
  assert.throws(() => configWith({}, undefined), /Set EXPO_PUBLIC_API_URL/);
  assert.throws(() => configWith({ EXPO_PUBLIC_API_URL: 'not-a-url' }), /valid http/);
  assert.throws(() => configWith({ EXPO_PUBLIC_API_URL: 'https://user:secret@example.com' }), /valid http/);

  const env = { NODE_ENV: 'development' };
  const { withMobileCors } = load('src/lib/mobile/cors.ts', { process: { env } });
  let calls = 0;
  const handle = async () => { calls++; return Response.json({ error: 'Unauthorized' }, { status: 401 }); };
  const send = (origin, method = 'GET', extra = {}) => withMobileCors(new Request('http://192.168.1.2:3000/api/mobile/auth/me', {
    method, headers: { ...(origin ? { Origin: origin } : {}), ...extra },
  }), handle);
  for (const origin of ['http://localhost:8081', 'http://127.0.0.1:8081', 'http://192.168.1.2:8081']) {
    const response = await send(origin, 'OPTIONS', { 'Access-Control-Request-Method': 'PATCH', 'Access-Control-Request-Headers': 'Authorization, Content-Type' });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  }
  assert.equal(calls, 0, 'Preflight must not touch authentication/database');
  assert.equal((await send('https://evil.test')).status, 403);
  assert.equal((await send('http://localhost:8081', 'OPTIONS', { 'Access-Control-Request-Method': 'PUT' })).status, 403);
  assert.equal((await send('http://localhost:8081', 'OPTIONS', { 'Access-Control-Request-Headers': 'X-Unknown' })).status, 403);
  assert.equal(calls, 0);
  const denied = await send('http://localhost:8081');
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  assert.match(denied.headers.get('vary'), /Origin/);
  assert.equal((await send()).status, 401, 'Native requests do not require Origin');
  env.NODE_ENV = 'production';
  assert.equal((await send('http://localhost:8081')).status, 403);
  env.MOBILE_WEB_ORIGINS = 'https://app.example.com, https://preview.example.com';
  assert.equal((await send('https://app.example.com')).status, 401);
  assert.equal((await send('https://app.example.com.evil.test')).status, 403);

  const storage = load('mobile/src/session-storage.web.ts');
  assert.equal(await storage.getItemAsync('session'), null);
  await storage.setItemAsync('session', 'fixture-token');
  assert.equal(await storage.getItemAsync('session'), 'fixture-token');
  assert.equal(await load('mobile/src/session-storage.web.ts').getItemAsync('session'), null, 'Reload does not retain bearer tokens');
  await storage.deleteItemAsync('session');
  assert.equal(await storage.getItemAsync('session'), null);

  let accepted = false; let actions = 0; let cancelled = 0; let notices = 0;
  const { Alert } = load('mobile/src/alert.web.ts', { window: { confirm: () => accepted, alert: () => notices++ } });
  const buttons = [{ text: 'Cancel', style: 'cancel', onPress: () => cancelled++ }, { text: 'Update', onPress: () => actions++ }];
  Alert.alert('Update?', 'Confirm action', buttons);
  assert.equal(actions, 0); assert.equal(cancelled, 1);
  accepted = true; Alert.alert('Update?', 'Confirm action', buttons);
  assert.equal(actions, 1);
  Alert.alert('Unable to open link'); assert.equal(notices, 1);
  console.log('Mobile checks passed: API env/manifest fallback, startup config validation, HTTPS guard, CORS, preflight, memory sessions and confirmations.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
