import { logServerEvent } from "./observability";

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface PushResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  invalidToken?: boolean;
}

export interface PushProvider {
  send(token: string, payload: PushPayload): Promise<PushResult>;
}

// ---------------------------------------------------------------------------
// Stub provider — logs only, used until FCM/APNs credentials are configured
// ---------------------------------------------------------------------------

class StubPushProvider implements PushProvider {
  async send(token: string, payload: PushPayload): Promise<PushResult> {
    logServerEvent("push.stub.send", { token: token.slice(0, 12) + "…", title: payload.title });
    return { ok: true, providerMessageId: `stub-${Date.now()}` };
  }
}

// ---------------------------------------------------------------------------
// Provider resolution — swap in real providers once credentials are set
// ---------------------------------------------------------------------------

let _provider: PushProvider | null = null;

export function getPushProvider(): PushProvider {
  if (_provider) return _provider;
  // TODO: detect FCM/APNs env vars and return the real provider
  _provider = new StubPushProvider();
  return _provider;
}
