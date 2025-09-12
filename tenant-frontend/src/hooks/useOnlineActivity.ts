import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sendActivityUpdate, sendOffline, sendOfflineBeacon } from '@/services/onlineActivityService';

function getOrCreateSessionId(): string {
  const key = 'tenant_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

function getUserAgent(): string | undefined {
  try {
    return navigator.userAgent;
  } catch {
    return undefined;
  }
}

// Best-effort IP discovery is out-of-scope for the SPA without an extra API; leave undefined so backend uses request client IP.

export interface OnlineActivityOptions {
  intervalMs?: number; // default 60000 (1 minute)
  immediate?: boolean; // send immediately on mount
}

/**
 * Sends periodic presence heartbeats to backend while authenticated.
 * Cleans up timer on unmount or logout.
 */
export function useOnlineActivity(options: OnlineActivityOptions = {}) {
  const { isAuthenticated, token } = useAuth();
  const intervalRef = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  const intervalMs = options.intervalMs ?? 60_000;
  const immediate = options.immediate ?? true;

  useEffect(() => {
    // Stop when not authenticated
    if (!isAuthenticated || !token) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const sessionId = getOrCreateSessionId();
    const userAgent = getUserAgent();

    const send = async () => {
      const now = Date.now();
      // Basic throttle guard (avoid spamming due to fast remounts)
      if (now - lastSentRef.current < 5_000) return;
      lastSentRef.current = now;
      try {
        await sendActivityUpdate({ session_id: sessionId, user_agent: userAgent });
      } catch (e) {
        // Swallow errors to avoid UI noise; backend may be temporarily unavailable
        // console.debug('Activity update failed', e);
      }
    };

    if (immediate) {
      // Fire and forget
      void send();
    }

    intervalRef.current = window.setInterval(() => {
      void send();
    }, intervalMs);

    const handlePageHide = () => {
      if (!token) return;
      // Best-effort: try beacon; if it fails, try fetch quickly
      const ok = sendOfflineBeacon(token);
      if (!ok) {
        // Fire-and-forget; no await to not block unload
        void sendOffline().catch(() => {});
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [isAuthenticated, token]);
}
