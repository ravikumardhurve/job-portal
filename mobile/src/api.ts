import Constants from 'expo-constants';

// Keep Expo's static env access for exports; Expo Go can also read the public manifest.
const manifestUrl = Constants.expoConfig?.extra?.apiUrl;
export const API_URL = (process.env.EXPO_PUBLIC_API_URL?.trim()
  || (typeof manifestUrl === 'string' ? manifestUrl.trim() : '')).replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

export type RequestOptions = { method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'; body?: unknown; token?: string; signal?: AbortSignal };

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_URL || !/^https?:\/\//.test(API_URL)) throw new ApiError('Set EXPO_PUBLIC_API_URL in mobile/.env to your portal server URL, then restart Expo.');
  if (!__DEV__ && !API_URL.startsWith('https://')) throw new ApiError('Release builds require an HTTPS API URL.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort);
  const timeout = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${API_URL}/api/mobile/${path}`, {
      method: options.method ?? 'GET', signal: controller.signal, credentials: 'omit',
      headers: { Accept: 'application/json', ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const result = await response.json().catch(() => { throw new ApiError('The server returned an invalid response. Please try again.', response.status); });
    if (!response.ok) throw new ApiError(result.error ?? 'Request failed. Please try again.', response.status);
    return result as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(controller.signal.aborted ? 'Request timed out or was cancelled. Please retry.' : `Cannot reach the portal at ${API_URL}. Keep the backend running and connect your phone and computer to the same Wi-Fi.`);
  } finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', abort); }
}

export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
