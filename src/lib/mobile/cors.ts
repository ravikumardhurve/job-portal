const methods = ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'];
const headers = ['authorization', 'content-type', 'accept'];

function allowedOrigin(request: Request, origin: string): boolean {
  const configured = (process.env.MOBILE_WEB_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  const target = new URL(request.url);
  if (origin === target.origin || configured.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'development') return false;
  try {
    const source = new URL(origin);
    // Expo's default development port only. Production requires an explicit allowlist.
    return source.origin === origin && source.protocol === 'http:' && source.port === '8081'
      && ['localhost', '127.0.0.1', target.hostname].includes(source.hostname);
  } catch { return false; }
}

export async function withMobileCors(request: Request, handle: () => Promise<Response>): Promise<Response> {
  const origin = request.headers.get('origin');
  const permitted = !origin || allowedOrigin(request, origin);
  let response: Response;
  if (!permitted) {
    response = Response.json({ error: 'Browser origin is not allowed.' }, { status: 403 });
  } else if (request.method === 'OPTIONS') {
    const method = request.headers.get('access-control-request-method');
    const requestedHeaders = (request.headers.get('access-control-request-headers') ?? '')
      .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    const valid = (!method || methods.includes(method)) && requestedHeaders.every(value => headers.includes(value));
    response = valid ? new Response(null, { status: 204 })
      : Response.json({ error: 'Unsupported preflight request.' }, { status: 403 });
    if (valid && origin) {
      response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', headers.join(', '));
    }
  } else {
    response = await handle();
  }
  response.headers.append('Vary', 'Origin');
  response.headers.set('Cache-Control', 'private, no-store');
  if (origin && permitted) response.headers.set('Access-Control-Allow-Origin', origin);
  return response;
}
