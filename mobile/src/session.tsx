import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as SecureStore from './session-storage';
import { API_URL, ApiError, request, type RequestOptions, errorMessage } from './api';
import type { AuthResult, Identity } from './types';

const storageKey = 'cg-job-care.session.v1';
type SessionContext = {
  identity: Identity | null; booting: boolean; bootError: string; retry: () => void;
  signIn: (result: AuthResult) => Promise<void>; signOut: () => Promise<void>; refreshIdentity: () => Promise<void>;
  api: <T>(path: string, options?: RequestOptions) => Promise<T>;
};
const Context = createContext<SessionContext | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const token = useRef<string | undefined>(undefined);
  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(storageKey);
    token.current = undefined; setIdentity(null);
  }, []);
  useEffect(() => {
    let alive = true;
    setBooting(true); setBootError('');
    (async () => {
      const saved = await SecureStore.getItemAsync(storageKey);
      if (!saved) return;
      let stored: { token: string; url: string };
      try { stored = JSON.parse(saved); } catch { await clear(); return; }
      if (stored.url !== API_URL || typeof stored.token !== 'string') { await clear(); return; }
      try {
        const result = await request<{ data: Identity }>('auth/me', { token: stored.token });
        if (alive) { token.current = stored.token; setIdentity(result.data); }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) await clear(); else throw error;
      }
    })().catch(error => { if (alive) setBootError(errorMessage(error)); }).finally(() => { if (alive) setBooting(false); });
    return () => { alive = false; };
  }, [attempt, clear]);
  const api = useCallback(async <T,>(path: string, options: RequestOptions = {}): Promise<T> => {
    const current = token.current;
    try { return await request<T>(path, { ...options, token: current }); }
    catch (error) {
      if (current && current === token.current && error instanceof ApiError && error.status === 401) await clear();
      throw error;
    }
  }, [clear]);
  const signIn = useCallback(async (result: AuthResult) => {
    await SecureStore.setItemAsync(storageKey, JSON.stringify({ token: result.token, url: API_URL }));
    token.current = result.token; setIdentity(result.kind === 'candidate' ? { kind: 'candidate', user: result.user } : { kind: 'admin', user: result.user });
  }, []);
  const signOut = useCallback(async () => {
    // Keep the session if revocation fails, so the user can retry safely.
    await api('auth/logout', { method: 'POST' }); await clear();
  }, [api, clear]);
  const refreshIdentity = useCallback(async () => {
    const result = await api<{ data: Identity }>('auth/me'); setIdentity(result.data);
  }, [api]);
  return <Context.Provider value={{ identity, booting, bootError, retry: () => setAttempt(n => n + 1), signIn, signOut, refreshIdentity, api }}>{children}</Context.Provider>;
}

export function useSession() { const value = useContext(Context); if (!value) throw new Error('SessionProvider missing'); return value; }
