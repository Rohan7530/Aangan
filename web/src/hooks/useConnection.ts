import { useEffect, useState } from 'react';
import * as nexconn from '../nexconn/client';
import type { ConnectionState } from '../nexconn/types';
import type { Session } from '../session';

// Nexconn status code: token is incorrect or expired. Nothing to do but log in again.
const CODE_BAD_TOKEN = 31004;
// The first connect can time out on a slow network (code 35008). Try again by
// ourselves before telling the reader anything: 2 s, 4 s, 8 s, 15 s, 15 s...
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000, 15_000, 15_000, 15_000];

// One Nexconn connection per page: initialise, listen, connect (with retries).
export function useConnection(session: Session, onBadToken: () => void) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    nexconn.initEngine({ appKey: session.appKey, areaCode: session.areaCode });
    // Listener first (docs: register before connect), then connect.
    const off = nexconn.onConnectionState((s) => {
      setState(s);
      if (s === 'connected') setFatal(null);
    });
    setState(nexconn.getConnectionState());

    const attempt = (n: number) => {
      nexconn.connect(session.token).then((r) => {
        if (cancelled || r.ok) return;
        if (r.code === CODE_BAD_TOKEN) {
          onBadToken();
          return;
        }
        const delay = RETRY_DELAYS_MS[n];
        if (delay === undefined) {
          setFatal(`Could not connect (code ${r.code}). Please check your internet, then reload the page.`);
          return;
        }
        console.warn(`[nexconn] connect failed (code ${r.code}); retrying in ${delay / 1000}s`);
        setState('connecting');
        timer = window.setTimeout(() => attempt(n + 1), delay);
      });
    };
    attempt(0);

    // Coming back online or to the tab: try at once instead of waiting.
    const kick = () => {
      if (cancelled || nexconn.getConnectionState() === 'connected') return;
      window.clearTimeout(timer);
      setFatal(null);
      attempt(0);
    };
    window.addEventListener('online', kick);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener('online', kick);
      off();
    };
  }, [session.appKey, session.areaCode, session.token, onBadToken]);

  return { state, fatal };
}
