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
// Expo Push API provider — works for all ExponentPushToken[...] tokens
// Expo's servers route to FCM (Android) or APNs (iOS) automatically
// ---------------------------------------------------------------------------

interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

class ExpoPushProvider implements PushProvider {
  async send(token: string, payload: PushPayload): Promise<PushResult> {
    // Only handle Expo push tokens — skip native FCM/APNs tokens
    if (!token.startsWith("ExponentPushToken")) {
      logServerEvent("push.expo.skipped", { reason: "not an Expo token" });
      return { ok: true, providerMessageId: "skipped-non-expo-token" };
    }

    try {
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: "default"
        })
      });

      const json = (await response.json()) as { data: ExpoPushTicket };
      const ticket = json.data;

      if (ticket.status === "ok") {
        logServerEvent("push.expo.sent", { ticketId: ticket.id });
        return { ok: true, providerMessageId: ticket.id };
      }

      const errorCode = ticket.details?.error;
      const isInvalidToken = errorCode === "DeviceNotRegistered";

      logServerEvent("push.expo.error", { error: ticket.message, errorCode });
      return { ok: false, error: ticket.message, invalidToken: isInvalidToken };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logServerEvent("push.expo.exception", { error: message });
      return { ok: false, error: message };
    }
  }
}

// ---------------------------------------------------------------------------
// Provider resolution
// ---------------------------------------------------------------------------

let _provider: PushProvider | null = null;

export function getPushProvider(): PushProvider {
  if (_provider) return _provider;
  _provider = new ExpoPushProvider();
  return _provider;
}
