// Small signed client for the Nexconn Platform Chat API (server side only).
// Signing rule, from docs.nexconn.ai/platform-chat-api/prepare-to-use-api/auth:
//   Signature = SHA1(AppSecret + Nonce + Timestamp)
// The App Secret never leaves this process.

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Config } from './config.js';

interface NexconnResponse {
  code: number;
  [key: string]: unknown;
}

export interface IssueTokenResult {
  userId: string;
  token: string;
}

export class NexconnClient {
  private domain: string;
  private readonly backup: string;
  private loggedFirstTokenResponse = false;

  constructor(private readonly cfg: Config['nexconn']) {
    this.domain = cfg.baseUrls.primary;
    this.backup = cfg.baseUrls.backup;
  }

  private signedHeaders(): Record<string, string> {
    const nonce = randomBytes(8).toString('hex'); // 16 chars, limit is 18
    const timestamp = String(Date.now());
    const signature = createHash('sha1')
      .update(this.cfg.appSecret + nonce + timestamp)
      .digest('hex');
    return {
      'App-Key': this.cfg.appKey,
      Nonce: nonce,
      Timestamp: timestamp,
      Signature: signature,
      'X-Request-ID': randomUUID().replace(/-/g, ''),
      'Content-Type': 'application/json',
      Connection: 'close', // docs advise against long-lived keep-alive connections
    };
  }

  // POST with one failover to the backup domain on network error or timeout.
  private async post(path: string, body: unknown): Promise<NexconnResponse> {
    const attempt = async (domain: string) => {
      const res = await fetch(`${domain}${path}`, {
        method: 'POST',
        headers: this.signedHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      const text = await res.text();
      let json: NexconnResponse;
      try {
        json = JSON.parse(text) as NexconnResponse;
      } catch {
        throw new Error(`Nexconn ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      if (res.status === 401) {
        throw new Error(`Nexconn ${path} rejected the signature (HTTP 401). Check NEXCONN_APP_KEY / NEXCONN_APP_SECRET.`);
      }
      return json;
    };

    try {
      return await attempt(this.domain);
    } catch (err) {
      const isNetwork = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'TypeError');
      if (!isNetwork) throw err;
      console.warn(`[nexconn] ${this.domain} failed (${(err as Error).message}); switching to ${this.backup}`);
      const prev = this.domain;
      this.domain = this.backup;
      try {
        return await attempt(this.domain);
      } catch (err2) {
        this.domain = prev;
        throw err2;
      }
    }
  }

  // docs: POST /v4/auth/access-token/issue  -> { code: 0, result: { userId, accessToken } }
  async issueToken(userId: string, name: string): Promise<IssueTokenResult> {
    const res = await this.post('/v4/auth/access-token/issue', { userId, name });

    if (!this.loggedFirstTokenResponse) {
      // Logged once so we can confirm which response shape the live API uses
      // (the quickstart shows {code:200, token}, the v4 API page shows {code:0, result.accessToken}).
      this.loggedFirstTokenResponse = true;
      console.log('[nexconn] first token response shape:', redactTokens(res));
    }

    if (res.code !== 0 && res.code !== 200) {
      throw new Error(`Nexconn token issue failed: code ${res.code} ${JSON.stringify(res)}`);
    }
    const result = (res.result ?? {}) as { userId?: string; accessToken?: string };
    const token = result.accessToken ?? (res.token as string | undefined);
    if (!token) {
      throw new Error(`Nexconn token issue returned no token: ${JSON.stringify(redactTokens(res))}`);
    }
    return { userId: result.userId ?? (res.userId as string) ?? userId, token };
  }

  // docs: POST /v4/group-channel/create  { channelId, name, owner, userIds? } -> { code: 0 }
  // The owner joins automatically. joinPerm=1 lets anyone join without approval.
  async createGroup(channelId: string, name: string, owner: string): Promise<number> {
    const res = await this.post('/v4/group-channel/create', {
      channelId,
      name,
      owner,
      permissions: { joinPerm: 1 },
    });
    return res.code;
  }

  // docs: POST /v4/group-channel/join  { channelId, userIds } -> { code: 0, result: {...} }
  async joinGroup(channelId: string, userIds: string[]): Promise<number> {
    const res = await this.post('/v4/group-channel/join', { channelId, userIds });
    return res.code;
  }
}

function redactTokens(obj: unknown): unknown {
  const s = JSON.stringify(obj, (key, value) =>
    typeof value === 'string' && /token/i.test(key) ? `${value.slice(0, 6)}…(${value.length} chars)` : value,
  );
  return JSON.parse(s);
}
