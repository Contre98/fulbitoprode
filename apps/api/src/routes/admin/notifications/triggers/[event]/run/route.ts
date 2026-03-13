import { jsonResponse } from "#http";
import { requireAdminToken } from "../../../../auth";
import { dispatch } from "@fulbito/server-core/notification-dispatcher";
import { resolveRecipientUserIds } from "../../../resolve-recipients";
import type { NotificationEventType } from "@fulbito/domain";

const SUPPORTED_EVENTS: NotificationEventType[] = [
  "prediction_lock",
  "results_published",
  "weekly_winner",
  "social"
];

const EVENT_DEFAULTS: Record<NotificationEventType, { title: string; body: string }> = {
  prediction_lock: {
    title: "Cierre de pronósticos",
    body: "Queda poco para que cierre la fecha. ¡Revisá tus pronósticos!"
  },
  results_published: {
    title: "Resultados publicados",
    body: "Ya se publicaron los resultados de la última fecha."
  },
  weekly_winner: {
    title: "Ganador semanal",
    body: "Ya está definido el ganador de la última fecha."
  },
  social: {
    title: "Nueva actividad en tu grupo",
    body: "Hay novedades en tu grupo de Fulbito."
  }
};

export async function POST(request: Request, context?: { params: Promise<{ event: string }> }) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  const { event } = await (context?.params ?? Promise.resolve({ event: "" }));

  if (!SUPPORTED_EVENTS.includes(event as NotificationEventType)) {
    return jsonResponse(
      { error: `Unknown event type. Supported: ${SUPPORTED_EVENTS.join(", ")}` },
      { status: 400 }
    );
  }

  const eventType = event as NotificationEventType;
  const defaults = EVENT_DEFAULTS[eventType];

  // Scheduled triggers always go global
  const recipientUserIds = await resolveRecipientUserIds({ scope: "global" });

  const now = new Date();
  const windowKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
  const idempotencyKey = `trigger:${eventType}:${windowKey}`;

  const result = await dispatch({
    eventType,
    title: defaults.title,
    body: defaults.body,
    target: { scope: "global" },
    idempotencyKey,
    recipientUserIds
  });

  return jsonResponse(result, { status: 200 });
}
