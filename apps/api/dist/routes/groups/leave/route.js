import { z } from "zod";
import { jsonResponse } from "#http";
import { leaveGroup } from "@fulbito/server-core/m3-repo";
import { getSessionPocketBaseTokenFromRequest, getSessionUserIdFromRequest } from "@fulbito/server-core/request-auth";
import { parseJsonBody, RequestBodyValidationError } from "../../../validation";
const leaveGroupPayloadSchema = z.object({
    groupId: z.string().optional()
});
function extractRouteError(error) {
    if (!(error instanceof Error)) {
        return { status: 500, message: "No se pudo abandonar el grupo." };
    }
    const raw = error.message;
    const match = raw.match(/^PocketBase (\d{3}):\s*([\s\S]*)$/);
    if (!match) {
        return { status: 500, message: raw || "No se pudo abandonar el grupo." };
    }
    const status = Number(match[1]) || 500;
    const body = match[2] || "";
    try {
        const parsed = JSON.parse(body);
        const dataMessages = parsed.data
            ? Object.entries(parsed.data)
                .map(([field, value]) => {
                const message = value?.message?.trim();
                return message ? `${field}: ${message}` : null;
            })
                .filter((value) => Boolean(value))
            : [];
        const firstDataMessage = dataMessages[0] || null;
        const normalizedMessage = (parsed.message || "").trim().toLowerCase();
        const isGenericPbMessage = normalizedMessage === "something went wrong while processing your request." ||
            normalizedMessage === "something went wrong while processing your request";
        return {
            status,
            message: firstDataMessage ||
                (isGenericPbMessage
                    ? "PocketBase rechazó la operación. Revisá reglas API y validaciones de groups/group_members/group_invites."
                    : parsed.message || raw)
        };
    }
    catch {
        return { status, message: body || raw };
    }
}
export async function POST(request) {
    const userId = getSessionUserIdFromRequest(request);
    const pbToken = getSessionPocketBaseTokenFromRequest(request);
    if (!userId || !pbToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    try {
        const body = await parseJsonBody(request, leaveGroupPayloadSchema);
        const groupId = body.groupId?.trim() || "";
        if (!groupId) {
            return jsonResponse({ error: "groupId is required" }, { status: 400 });
        }
        const result = await leaveGroup({ userId, groupId }, pbToken);
        if (!result.ok) {
            return jsonResponse({ error: result.error }, { status: 400 });
        }
        return jsonResponse({ ok: true, deletedGroup: result.deletedGroup ?? false }, { status: 200 });
    }
    catch (error) {
        if (error instanceof RequestBodyValidationError) {
            return jsonResponse({ error: error.message }, { status: error.status });
        }
        const parsed = extractRouteError(error);
        return jsonResponse({ error: parsed.message }, { status: parsed.status });
    }
}
