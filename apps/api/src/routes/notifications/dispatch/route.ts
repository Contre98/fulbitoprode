import { z } from "zod";
import { jsonResponse } from "#http";
import { getApiSession, unauthorizedJson } from "@fulbito/server-core/api-session";
import { addNotification } from "@fulbito/server-core/notifications-store";
import { logServerEvent } from "@fulbito/server-core/observability";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";

const dispatchNotificationPayloadSchema = z.object({
  event: z.enum(["prediction_lock", "results_published", "weekly_winner", "social"]).optional(),
  title: z.string().optional(),
  body: z.string().optional()
});

export async function POST(request: Request) {
  const session = getApiSession(request);
  if (!session) {
    return unauthorizedJson();
  }

  try {
    const body = await parseJsonBody(request, dispatchNotificationPayloadSchema);
    if (!body.event) {
      return jsonResponse({ error: "event is required" }, { status: 400 });
    }

    const defaults: Record<string, { title: string; body: string }> = {
      prediction_lock: {
        title: "Cierre de pronósticos",
        body: "Queda poco para que cierre la fecha. Revisá tus pronósticos."
      },
      results_published: {
        title: "Resultados publicados",
        body: "Ya se publicaron los resultados de la fecha."
      },
      weekly_winner: {
        title: "Ganador semanal",
        body: "Ya está definido el ganador de la última fecha."
      },
      social: {
        title: "Nueva actividad en tu grupo",
        body: "Un usuario se unió al grupo."
      }
    };

    const fallback = defaults[body.event];
    addNotification(session.userId, {
      type: body.event,
      title: body.title?.trim() || fallback.title,
      body: body.body?.trim() || fallback.body
    });
    logServerEvent("notifications.dispatch", {
      userId: session.userId,
      event: body.event
    });

    return jsonResponse({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyValidationError) {
      return jsonResponse({ error: error.message }, { status: error.status });
    }
    return jsonResponse({ error: "Invalid payload" }, { status: 400 });
  }
}
