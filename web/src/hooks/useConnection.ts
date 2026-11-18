import { useEffect, useState } from 'react';
import * as nexconn from '../nexconn/client';
import type { ConnectionState } from '../nexconn/types';
import type { Session } from '../session';

// Nexconn status code: token is incorrect or expired. Nothing to do but log in again.
const CODE_BAD_TOKEN = 31004;

// One Nexconn connection per page: initialise, listen, connect.
export function useConnection(session: Session, onBadToken: () => void) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    nexconn.initEngine({ appKey: session.appKey, areaCode: session.areaCode });
    // Listener first (docs: register before connect), then connect.
    const off = nexconn.onConnectionState((s) => setState(s));
    setState(nexconn.getConnectionState());
    nexconn.connect(session.token).then((r) => {
      if (cancelled || r.ok) return;
      if (r.code === CODE_BAD_TOKEN) onBadToken();
      else setFatal(`Could not connect (code ${r.code}). Please check your internet and try again.`);
    });
    return () => {
      cancelled = true;
      off();
    };
  }, [session.appKey, session.areaCode, session.token, onBadToken]);

  return { state, fatal };
}
