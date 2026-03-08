import { randomBytes } from "node:crypto";
import { getPocketBaseConfig } from "./pocketbase";
export function generateInviteValues() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const code = [...randomBytes(8)]
        .map((byte) => alphabet[byte % alphabet.length])
        .join("")
        .slice(0, 8);
    return {
        code,
        token: randomBytes(32).toString("base64url"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
}
function requirePbUrl() {
    const config = getPocketBaseConfig();
    if (!config.configured) {
        throw new Error("PocketBase is not configured. Set POCKETBASE_URL");
    }
    return config.url;
}
async function pbRequest(path, init = {}, authToken) {
    const url = `${requirePbUrl()}${path}`;
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.body) {
        headers.set("Content-Type", "application/json");
    }
    if (authToken) {
        headers.set("Authorization", `Bearer ${authToken}`);
    }
    const response = await fetch(url, {
        ...init,
        headers,
        cache: "no-store"
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PocketBase ${response.status}: ${errorText}`);
    }
    if (response.status === 204) {
        return null;
    }
    return (await response.json());
}
function extractPocketBaseErrorMessage(error) {
    if (!(error instanceof Error)) {
        return "PocketBase request failed";
    }
    const raw = error.message;
    const marker = ": ";
    const index = raw.indexOf(marker);
    const body = index >= 0 ? raw.slice(index + marker.length) : raw;
    try {
        const parsed = JSON.parse(body);
        if (parsed.message) {
            return parsed.message;
        }
        const firstDataMessage = parsed.data ? Object.values(parsed.data).find((value) => value?.message)?.message : null;
        return firstDataMessage || raw;
    }
    catch {
        return raw;
    }
}
function q(value) {
    return `'${value.replace(/'/g, "\\'")}'`;
}
function toSlug(input) {
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
}
function uniqNonEmpty(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
function firstDefinedEnv(keys) {
    for (const key of keys) {
        const value = process.env[key]?.trim();
        if (value) {
            return value;
        }
    }
    return null;
}
async function ensureGlobalGroupEnrollment(input) {
    const groupId = firstDefinedEnv(["FULBITO_GLOBAL_GROUP_ID", "GLOBAL_GROUP_ID"]);
    const inviteCodeOrToken = firstDefinedEnv(["FULBITO_GLOBAL_GROUP_INVITE", "GLOBAL_GROUP_INVITE"]);
    if (!groupId && !inviteCodeOrToken) {
        return;
    }
    if (inviteCodeOrToken) {
        const result = await joinGroupByCodeOrToken({
            userId: input.userId,
            codeOrToken: inviteCodeOrToken
        }, input.authToken);
        if (!result.ok) {
            throw new Error(`Global group auto-enrollment failed: ${result.error}`);
        }
        return;
    }
    const targetGroupId = groupId;
    if (!targetGroupId) {
        return;
    }
    const existingFilter = encodeURIComponent(`user_id=${q(input.userId)} && group_id=${q(targetGroupId)}`);
    const existing = await pbRequest(`/api/collections/group_members/records?perPage=1&filter=${existingFilter}`, { method: "GET" }, input.authToken);
    const membership = existing.items[0];
    if (!membership) {
        await pbRequest("/api/collections/group_members/records", {
            method: "POST",
            body: JSON.stringify({
                group_id: targetGroupId,
                user_id: input.userId,
                role: "member",
                status: "active",
                joined_at: new Date().toISOString()
            })
        }, input.authToken);
        return;
    }
    if (membership.status !== "active") {
        await pbRequest(`/api/collections/group_members/records/${membership.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                status: "active",
                joined_at: new Date().toISOString(),
                role: membership.role === "owner" || membership.role === "admin" ? membership.role : "member"
            })
        }, input.authToken);
    }
}
async function getActiveMembership(userId, groupId, authToken) {
    const membershipFilter = encodeURIComponent(`user_id=${q(userId)} && group_id=${q(groupId)} && status='active'`);
    const membership = await pbRequest(`/api/collections/group_members/records?perPage=1&filter=${membershipFilter}`, { method: "GET" }, authToken);
    return membership.items[0] || null;
}
async function getGroupMembershipRecord(input, authToken) {
    const membershipFilter = encodeURIComponent(`user_id=${q(input.userId)} && group_id=${q(input.groupId)} && status='active'`);
    const membership = await pbRequest(`/api/collections/group_members/records?perPage=1&filter=${membershipFilter}`, { method: "GET" }, authToken);
    return membership.items[0] || null;
}
function normalizeCompetitionName(stage) {
    if (stage === "apertura")
        return "Apertura";
    if (stage === "clausura")
        return "Clausura";
    return "General";
}
function encodeSeasonWithStage(input) {
    if (!input.stage || input.stage === "general") {
        return input.season;
    }
    return `${input.season}|${input.stage}`;
}
function decodeSeasonWithStage(raw, leagueId) {
    const [seasonRaw, stageRaw] = raw.split("|");
    const stage = stageRaw === "apertura" || stageRaw === "clausura" ? stageRaw : leagueId === 128 ? "apertura" : "general";
    return {
        season: seasonRaw || String(new Date().getFullYear()),
        competitionStage: stage,
        competitionName: normalizeCompetitionName(stage),
        competitionKey: `${leagueId}-${seasonRaw || String(new Date().getFullYear())}-${stage}`
    };
}
function mapUserFromRecord(record) {
    const fallbackUsername = record.email.split("@")[0] || "jugador";
    return {
        id: record.id,
        email: record.email,
        name: record.name || record.email.split("@")[0] || "Jugador",
        username: record.username || fallbackUsername,
        favoriteTeam: record.favorite_team ?? null
    };
}
export async function loginWithPassword(email, password) {
    const attempts = [
        { identity: email, password },
        { email, password }
    ];
    let lastError = null;
    let result = null;
    for (const payload of attempts) {
        try {
            result = await pbRequest("/api/collections/users/auth-with-password", {
                method: "POST",
                body: JSON.stringify(payload)
            });
            break;
        }
        catch (error) {
            lastError = error;
        }
    }
    if (!result) {
        throw new Error(extractPocketBaseErrorMessage(lastError));
    }
    return {
        token: result.token,
        user: mapUserFromRecord(result.record)
    };
}
export async function registerWithPassword(input) {
    await pbRequest("/api/collections/users/records", {
        method: "POST",
        body: JSON.stringify({
            email: input.email,
            password: input.password,
            passwordConfirm: input.password,
            name: input.name?.trim() || undefined
        })
    });
    const session = await loginWithPassword(input.email, input.password);
    await ensureGlobalGroupEnrollment({
        userId: session.user.id,
        authToken: session.token
    });
    return session;
}
export async function requestPasswordReset(email) {
    try {
        await pbRequest("/api/collections/users/request-password-reset", {
            method: "POST",
            body: JSON.stringify({ email })
        });
    }
    catch (error) {
        throw new Error(extractPocketBaseErrorMessage(error));
    }
}
export async function getUserById(userId, authToken) {
    const record = await pbRequest(`/api/collections/users/records/${userId}`, { method: "GET" }, authToken);
    return mapUserFromRecord(record);
}
export async function updateUserProfile(userId, input, authToken) {
    const payload = {};
    if (input.name !== undefined) {
        const trimmed = input.name?.trim() || "";
        payload.name = trimmed || null;
    }
    if (input.favoriteTeam !== undefined) {
        const trimmed = input.favoriteTeam?.trim() || "";
        payload.favorite_team = trimmed || null;
    }
    if (input.username !== undefined) {
        const trimmed = input.username?.trim() || "";
        payload.username = trimmed || null;
    }
    if (input.email !== undefined) {
        const trimmed = input.email?.trim() || "";
        payload.email = trimmed || null;
    }
    if (Object.keys(payload).length === 0) {
        return getUserById(userId, authToken);
    }
    const record = await pbRequest(`/api/collections/users/records/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    }, authToken);
    return mapUserFromRecord(record);
}
export async function listGroupsForUser(userId, authToken) {
    const filter = encodeURIComponent(`user_id=${q(userId)} && status='active'`);
    const response = await pbRequest(`/api/collections/group_members/records?perPage=200&filter=${filter}&expand=group_id`, { method: "GET" }, authToken);
    return response.items
        .map((item) => {
        const group = item.expand?.group_id;
        if (!group)
            return null;
        const decoded = decodeSeasonWithStage(group.season || process.env.API_FOOTBALL_DEFAULT_SEASON || String(new Date().getFullYear()), group.league_id ?? 128);
        return {
            group: {
                id: group.id,
                name: group.name,
                slug: group.slug,
                season: decoded.season,
                leagueId: group.league_id ?? 128,
                competitionStage: decoded.competitionStage,
                competitionName: decoded.competitionName,
                competitionKey: decoded.competitionKey
            },
            membership: {
                role: item.role,
                joinedAt: item.joined_at || new Date().toISOString()
            }
        };
    })
        .filter((row) => row !== null);
}
export async function isActiveGroupMember(userId, groupId, authToken) {
    const filter = encodeURIComponent(`user_id=${q(userId)} && group_id=${q(groupId)} && status='active'`);
    const response = await pbRequest(`/api/collections/group_members/records?perPage=1&filter=${filter}`, { method: "GET" }, authToken);
    return response.items.length > 0;
}
export async function listGroupMembers(groupId, authToken) {
    const filter = encodeURIComponent(`group_id=${q(groupId)} && status='active'`);
    const response = await pbRequest(`/api/collections/group_members/records?perPage=200&filter=${filter}&expand=user_id`, { method: "GET" }, authToken);
    return response.items
        .map((item) => {
        const expandedUser = Array.isArray(item.expand?.user_id) ? item.expand?.user_id[0] : item.expand?.user_id;
        const fallbackName = item.user_id ? `Usuario ${item.user_id.slice(0, 6)}` : "Usuario";
        return {
            userId: item.user_id,
            role: item.role,
            joinedAt: item.joined_at || new Date().toISOString(),
            name: expandedUser?.name || expandedUser?.email?.split("@")[0] || fallbackName
        };
    })
        .filter((row) => Boolean(row.userId));
}
export async function updateGroupMemberRole(input, authToken) {
    const actorMembership = await getActiveMembership(input.actorUserId, input.groupId, authToken);
    if (!actorMembership || (actorMembership.role !== "owner" && actorMembership.role !== "admin")) {
        return { ok: false, error: "No tenés permisos para gestionar miembros." };
    }
    const targetMembership = await getGroupMembershipRecord({ userId: input.targetUserId, groupId: input.groupId }, authToken);
    if (!targetMembership) {
        return { ok: false, error: "El miembro seleccionado no está activo en este grupo." };
    }
    if (targetMembership.user_id === input.actorUserId && input.role !== "admin") {
        return { ok: false, error: "No podés quitarte permisos desde esta pantalla." };
    }
    if (targetMembership.role === "owner") {
        return { ok: false, error: "No se puede modificar el rol del owner." };
    }
    if (actorMembership.role === "admin" && targetMembership.role === "admin" && targetMembership.user_id !== input.actorUserId) {
        return { ok: false, error: "Solo un owner puede modificar a otro admin." };
    }
    if (targetMembership.role === input.role) {
        return {
            ok: true,
            changed: false,
            member: {
                userId: targetMembership.user_id,
                role: targetMembership.role
            }
        };
    }
    await pbRequest(`/api/collections/group_members/records/${targetMembership.id}`, {
        method: "PATCH",
        body: JSON.stringify({
            group_id: targetMembership.group_id,
            user_id: targetMembership.user_id,
            role: input.role,
            status: targetMembership.status || "active",
            joined_at: targetMembership.joined_at || new Date().toISOString()
        })
    }, authToken);
    return {
        ok: true,
        changed: true,
        member: {
            userId: targetMembership.user_id,
            role: input.role
        }
    };
}
export async function removeGroupMember(input, authToken) {
    const actorMembership = await getActiveMembership(input.actorUserId, input.groupId, authToken);
    if (!actorMembership || (actorMembership.role !== "owner" && actorMembership.role !== "admin")) {
        return { ok: false, error: "No tenés permisos para expulsar miembros." };
    }
    if (input.actorUserId === input.targetUserId) {
        return { ok: false, error: "Usá la opción salir del grupo para abandonar tu membresía." };
    }
    const targetMembership = await getGroupMembershipRecord({ userId: input.targetUserId, groupId: input.groupId }, authToken);
    if (!targetMembership) {
        return { ok: false, error: "El miembro seleccionado no está activo en este grupo." };
    }
    if (targetMembership.role === "owner") {
        return { ok: false, error: "No se puede expulsar al owner del grupo." };
    }
    if (actorMembership.role === "admin" && targetMembership.role === "admin") {
        return { ok: false, error: "Solo un owner puede expulsar a otro admin." };
    }
    await pbRequest(`/api/collections/group_members/records/${targetMembership.id}`, {
        method: "PATCH",
        body: JSON.stringify({
            group_id: targetMembership.group_id,
            user_id: targetMembership.user_id,
            role: targetMembership.role,
            status: "removed",
            joined_at: targetMembership.joined_at || new Date().toISOString()
        })
    }, authToken);
    return { ok: true };
}
export async function listGroupMembersForGroups(groupIds, authToken) {
    const ids = uniqNonEmpty(groupIds);
    if (ids.length === 0) {
        return {};
    }
    const byGroupId = Object.fromEntries(ids.map((id) => [id, []]));
    const groupFilter = ids.map((id) => `group_id=${q(id)}`).join(" || ");
    const filter = encodeURIComponent(`status='active' && (${groupFilter})`);
    const response = await pbRequest(`/api/collections/group_members/records?perPage=2000&filter=${filter}&expand=user_id`, { method: "GET" }, authToken);
    response.items.forEach((item) => {
        if (!item.group_id || !byGroupId[item.group_id]) {
            return;
        }
        const expandedUser = Array.isArray(item.expand?.user_id) ? item.expand?.user_id[0] : item.expand?.user_id;
        const fallbackName = item.user_id ? `Usuario ${item.user_id.slice(0, 6)}` : "Usuario";
        byGroupId[item.group_id].push({
            userId: item.user_id,
            role: item.role,
            joinedAt: item.joined_at || new Date().toISOString(),
            name: expandedUser?.name || expandedUser?.email?.split("@")[0] || fallbackName
        });
    });
    return byGroupId;
}
export async function listGroupPredictions(input, authToken) {
    const clauses = [`group_id=${q(input.groupId)}`];
    if (input.period) {
        clauses.push(`period=${q(input.period)}`);
    }
    const filter = encodeURIComponent(clauses.join(" && "));
    const response = await pbRequest(`/api/collections/predictions/records?perPage=1000&filter=${filter}`, { method: "GET" }, authToken);
    return response.items.map((item) => ({
        userId: item.user_id,
        fixtureId: item.fixture_id,
        period: item.period,
        home: item.home_pred ?? null,
        away: item.away_pred ?? null,
        submittedAt: item.submitted_at || new Date().toISOString()
    }));
}
export async function listGroupPredictionsForGroups(input, authToken) {
    const ids = uniqNonEmpty(input.groupIds);
    if (ids.length === 0) {
        return {};
    }
    const byGroupId = Object.fromEntries(ids.map((id) => [id, []]));
    const groupFilter = ids.map((id) => `group_id=${q(id)}`).join(" || ");
    const clauses = [`(${groupFilter})`];
    if (input.period) {
        clauses.push(`period=${q(input.period)}`);
    }
    const filter = encodeURIComponent(clauses.join(" && "));
    const response = await pbRequest(`/api/collections/predictions/records?perPage=5000&filter=${filter}`, { method: "GET" }, authToken);
    response.items.forEach((item) => {
        if (!item.group_id || !byGroupId[item.group_id]) {
            return;
        }
        byGroupId[item.group_id].push({
            userId: item.user_id,
            fixtureId: item.fixture_id,
            period: item.period,
            home: item.home_pred ?? null,
            away: item.away_pred ?? null,
            submittedAt: item.submitted_at || new Date().toISOString()
        });
    });
    return byGroupId;
}
export async function createGroup(input, authToken) {
    const season = input.season || process.env.API_FOOTBALL_DEFAULT_SEASON || String(new Date().getFullYear());
    const competitionStage = input.competitionStage || ((input.leagueId ?? 128) === 128 ? "apertura" : "general");
    const encodedSeason = encodeSeasonWithStage({
        season,
        stage: competitionStage
    });
    const group = await pbRequest("/api/collections/groups/records", {
        method: "POST",
        body: JSON.stringify({
            name: input.name,
            slug: toSlug(input.name),
            owner_user_id: input.userId,
            is_active: true,
            season: encodedSeason,
            league_id: input.leagueId ?? 128
        })
    }, authToken);
    await pbRequest("/api/collections/group_members/records", {
        method: "POST",
        body: JSON.stringify({
            group_id: group.id,
            user_id: input.userId,
            role: "owner",
            status: "active",
            joined_at: new Date().toISOString()
        })
    }, authToken);
    const inviteValues = generateInviteValues();
    const invite = await pbRequest("/api/collections/group_invites/records", {
        method: "POST",
        body: JSON.stringify({
            group_id: group.id,
            code: inviteValues.code,
            token: inviteValues.token,
            created_by: input.userId,
            expires_at: inviteValues.expiresAt,
            max_uses: 200,
            uses: 0
        })
    }, authToken);
    const decoded = decodeSeasonWithStage(group.season || process.env.API_FOOTBALL_DEFAULT_SEASON || String(new Date().getFullYear()), group.league_id ?? 128);
    return {
        group: {
            id: group.id,
            name: group.name,
            slug: group.slug,
            season: decoded.season,
            leagueId: group.league_id ?? 128,
            competitionStage: decoded.competitionStage,
            competitionName: input.competitionName || decoded.competitionName,
            competitionKey: input.competitionKey || decoded.competitionKey
        },
        membership: { role: "owner" },
        invite: {
            code: invite.code,
            token: invite.token,
            expiresAt: invite.expires_at
        }
    };
}
export async function joinGroupByCodeOrToken(input, authToken) {
    const filter = encodeURIComponent(`code=${q(input.codeOrToken)} || token=${q(input.codeOrToken)}`);
    const inviteList = await pbRequest(`/api/collections/group_invites/records?perPage=1&filter=${filter}&code=${encodeURIComponent(input.codeOrToken)}&token=${encodeURIComponent(input.codeOrToken)}`, { method: "GET" }, authToken);
    const invite = inviteList.items[0];
    if (!invite) {
        return { ok: false, error: "Invite not found" };
    }
    const expiresAt = invite.expires_at ? new Date(invite.expires_at).getTime() : 0;
    if (expiresAt && expiresAt < Date.now()) {
        return { ok: false, error: "Invite expired" };
    }
    const uses = invite.uses ?? 0;
    const maxUses = invite.max_uses ?? 0;
    if (maxUses > 0 && uses >= maxUses) {
        return { ok: false, error: "Invite reached max uses" };
    }
    const existingFilter = encodeURIComponent(`user_id=${q(input.userId)} && group_id=${q(invite.group_id)}`);
    const existing = await pbRequest(`/api/collections/group_members/records?perPage=1&filter=${existingFilter}`, { method: "GET" }, authToken);
    const existingMembership = existing.items[0];
    if (!existingMembership) {
        await pbRequest("/api/collections/group_members/records", {
            method: "POST",
            body: JSON.stringify({
                group_id: invite.group_id,
                user_id: input.userId,
                role: "member",
                status: "active",
                joined_at: new Date().toISOString()
            })
        }, authToken);
    }
    else if (existingMembership.status !== "active") {
        await pbRequest(`/api/collections/group_members/records/${existingMembership.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                status: "active",
                joined_at: new Date().toISOString(),
                role: existingMembership.role === "owner" ? "owner" : "member"
            })
        }, authToken);
    }
    try {
        await pbRequest(`/api/collections/group_invites/records/${invite.id}`, {
            method: "PATCH",
            body: JSON.stringify({ uses: uses + 1 })
        }, authToken);
    }
    catch {
        // Invite usage updates can be blocked by PB rules in locked-down setups.
    }
    const group = await pbRequest(`/api/collections/groups/records/${invite.group_id}`, { method: "GET" }, authToken);
    const decoded = decodeSeasonWithStage(group.season || process.env.API_FOOTBALL_DEFAULT_SEASON || String(new Date().getFullYear()), group.league_id ?? 128);
    return {
        ok: true,
        group: {
            id: group.id,
            name: group.name,
            slug: group.slug,
            season: decoded.season,
            leagueId: group.league_id ?? 128,
            competitionStage: decoded.competitionStage,
            competitionName: decoded.competitionName,
            competitionKey: decoded.competitionKey
        }
    };
}
export async function listPredictionsForScope(input, authToken) {
    const filter = encodeURIComponent(`user_id=${q(input.userId)} && group_id=${q(input.groupId)} && period=${q(input.period)}`);
    const response = await pbRequest(`/api/collections/predictions/records?perPage=300&filter=${filter}`, { method: "GET" }, authToken);
    return Object.fromEntries(response.items.map((item) => [item.fixture_id, { home: item.home_pred ?? null, away: item.away_pred ?? null }]));
}
export async function upsertPrediction(input, authToken) {
    const filter = encodeURIComponent(`user_id=${q(input.userId)} && group_id=${q(input.groupId)} && fixture_id=${q(input.fixtureId)}`);
    const existing = await pbRequest(`/api/collections/predictions/records?perPage=1&filter=${filter}`, { method: "GET" }, authToken);
    const payload = {
        user_id: input.userId,
        group_id: input.groupId,
        fixture_id: input.fixtureId,
        period: input.period,
        home_pred: input.home,
        away_pred: input.away,
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    if (existing.items.length > 0) {
        await pbRequest(`/api/collections/predictions/records/${existing.items[0].id}`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        }, authToken);
        return;
    }
    await pbRequest("/api/collections/predictions/records", {
        method: "POST",
        body: JSON.stringify(payload)
    }, authToken);
}
export async function leaveGroup(input, authToken) {
    const currentMembership = await getActiveMembership(input.userId, input.groupId, authToken);
    if (!currentMembership) {
        return { ok: false, error: "No active membership found." };
    }
    if (currentMembership.role === "owner") {
        const ownersFilter = encodeURIComponent(`group_id=${q(input.groupId)} && status='active' && role='owner'`);
        const owners = await pbRequest(`/api/collections/group_members/records?perPage=2&filter=${ownersFilter}`, { method: "GET" }, authToken);
        if (owners.totalItems <= 1) {
            const deleted = await deleteGroupSoft(input, authToken);
            if (!deleted.ok) {
                return { ok: false, error: deleted.error };
            }
            return { ok: true, deletedGroup: true };
        }
    }
    await pbRequest(`/api/collections/group_members/records/${currentMembership.id}`, {
        method: "PATCH",
        body: JSON.stringify({
            status: "removed"
        })
    }, authToken);
    return { ok: true, deletedGroup: false };
}
export async function renameGroup(input, authToken) {
    const currentMembership = await getActiveMembership(input.userId, input.groupId, authToken);
    if (!currentMembership || (currentMembership.role !== "owner" && currentMembership.role !== "admin")) {
        return { ok: false, error: "No tenés permisos para editar este grupo." };
    }
    const nextName = input.name.trim();
    if (!nextName) {
        return { ok: false, error: "El nombre es obligatorio." };
    }
    if (nextName.length > 80) {
        return { ok: false, error: "El nombre es demasiado largo." };
    }
    const updated = await pbRequest(`/api/collections/groups/records/${input.groupId}`, {
        method: "PATCH",
        body: JSON.stringify({
            name: nextName,
            slug: toSlug(nextName)
        })
    }, authToken);
    return {
        ok: true,
        group: {
            id: updated.id,
            name: updated.name,
            slug: updated.slug
        }
    };
}
export async function deleteGroupSoft(input, authToken) {
    const groupRecord = await pbRequest(`/api/collections/groups/records/${input.groupId}`, { method: "GET" }, authToken);
    const membersFilter = encodeURIComponent(`group_id=${q(input.groupId)} && status='active'`);
    const members = await pbRequest(`/api/collections/group_members/records?perPage=500&filter=${membersFilter}`, { method: "GET" }, authToken);
    const currentMembership = members.items.find((member) => member.user_id === input.userId);
    if (!currentMembership) {
        return { ok: false, error: "No tenés membresía activa en este grupo." };
    }
    const activeMembers = members.items.length;
    const canDelete = activeMembers === 1 ||
        currentMembership.role === "owner" ||
        currentMembership.role === "admin";
    if (!canDelete) {
        return { ok: false, error: "Solo admins u owners pueden eliminar grupos con otros miembros." };
    }
    const invitesFilter = encodeURIComponent(`group_id=${q(input.groupId)}`);
    const invites = await pbRequest(`/api/collections/group_invites/records?perPage=500&filter=${invitesFilter}`, { method: "GET" }, authToken);
    try {
        await pbRequest(`/api/collections/groups/records/${input.groupId}`, {
            method: "PATCH",
            body: JSON.stringify({
                name: groupRecord.name || "Grupo",
                slug: groupRecord.slug || toSlug(groupRecord.name || "grupo"),
                owner_user_id: groupRecord.owner_user_id || input.userId,
                is_active: false,
                season: groupRecord.season || String(new Date().getFullYear()),
                league_id: groupRecord.league_id ?? 128
            })
        }, authToken);
    }
    catch (error) {
        const message = extractPocketBaseErrorMessage(error);
        const rawMessage = error instanceof Error ? error.message.toLowerCase() : "";
        const isIsActiveRequiredError = (message.toLowerCase().includes("is_active") && message.toLowerCase().includes("missing required value")) ||
            (rawMessage.includes("is_active") && rawMessage.includes("missing required value"));
        if (!isIsActiveRequiredError) {
            throw error;
        }
        // Some PocketBase setups reject is_active=false when the bool is required.
        // Continue by removing members/invites so the group becomes inaccessible.
    }
    await Promise.all(invites.items.map((invite) => {
        const fallbackInvite = generateInviteValues();
        return pbRequest(`/api/collections/group_invites/records/${invite.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                group_id: invite.group_id || input.groupId,
                code: invite.code || fallbackInvite.code,
                token: invite.token || fallbackInvite.token,
                created_by: invite.created_by || input.userId,
                expires_at: new Date().toISOString(),
                max_uses: invite.max_uses ?? 200,
                uses: invite.max_uses ?? invite.uses ?? 1
            })
        }, authToken);
    }));
    const nowIso = new Date().toISOString();
    const orderedMembers = [...members.items].sort((a, b) => {
        if (a.user_id === input.userId)
            return 1;
        if (b.user_id === input.userId)
            return -1;
        return 0;
    });
    for (const member of orderedMembers) {
        await pbRequest(`/api/collections/group_members/records/${member.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                group_id: member.group_id || input.groupId,
                user_id: member.user_id,
                role: member.role || "member",
                status: "removed",
                joined_at: member.joined_at || nowIso
            })
        }, authToken);
    }
    return {
        ok: true,
        warningRequired: activeMembers > 1
    };
}
export async function refreshGroupInvite(input, authToken) {
    const currentMembership = await getActiveMembership(input.userId, input.groupId, authToken);
    if (!currentMembership || (currentMembership.role !== "owner" && currentMembership.role !== "admin")) {
        return { ok: false, error: "No tenés permisos para generar invitaciones." };
    }
    const inviteValues = generateInviteValues();
    const invite = await pbRequest("/api/collections/group_invites/records", {
        method: "POST",
        body: JSON.stringify({
            group_id: input.groupId,
            code: inviteValues.code,
            token: inviteValues.token,
            created_by: input.userId,
            expires_at: inviteValues.expiresAt,
            max_uses: 200,
            uses: 0
        })
    }, authToken);
    return {
        ok: true,
        invite: {
            code: invite.code,
            token: invite.token,
            expiresAt: invite.expires_at
        }
    };
}
export async function getGroupInvite(input, authToken) {
    const currentMembership = await getActiveMembership(input.userId, input.groupId, authToken);
    if (!currentMembership) {
        return { ok: false, error: "No tenés membresía activa en este grupo." };
    }
    const canRefresh = currentMembership.role === "owner" || currentMembership.role === "admin";
    const filter = encodeURIComponent(`group_id=${q(input.groupId)} && expires_at > ${q(new Date().toISOString())}`);
    const response = await pbRequest(`/api/collections/group_invites/records?perPage=20&sort=-created&filter=${filter}`, { method: "GET" }, authToken);
    const validInvite = response.items.find((item) => {
        const uses = item.uses ?? 0;
        const maxUses = item.max_uses ?? 1;
        return maxUses <= 0 || uses < maxUses;
    });
    return {
        ok: true,
        canRefresh,
        invite: validInvite
            ? {
                code: validInvite.code,
                token: validInvite.token,
                expiresAt: validInvite.expires_at
            }
            : null
    };
}
function mapAuthSessionRecord(record) {
    return {
        recordId: record.id,
        sessionId: record.session_id,
        userId: record.user_id,
        refreshTokenHash: record.refresh_token_hash,
        issuedAt: record.issued_at,
        expiresAt: record.expires_at,
        revokedAt: record.revoked_at ?? null,
        replacedBySessionId: record.replaced_by_session_id ?? null
    };
}
export async function createAuthSessionRecord(input, authToken) {
    const created = await pbRequest("/api/collections/auth_sessions/records", {
        method: "POST",
        body: JSON.stringify({
            session_id: input.sessionId,
            user_id: input.userId,
            refresh_token_hash: input.refreshTokenHash,
            issued_at: input.issuedAt,
            expires_at: input.expiresAt
        })
    }, authToken);
    return mapAuthSessionRecord(created);
}
export async function getAuthSessionRecord(input, authToken) {
    const filter = encodeURIComponent(`session_id=${q(input.sessionId)} && user_id=${q(input.userId)}`);
    const result = await pbRequest(`/api/collections/auth_sessions/records?perPage=1&filter=${filter}`, { method: "GET" }, authToken);
    const record = result.items[0];
    return record ? mapAuthSessionRecord(record) : null;
}
export async function patchAuthSessionRecord(input, authToken) {
    const payload = {};
    if (input.refreshTokenHash !== undefined) {
        payload.refresh_token_hash = input.refreshTokenHash;
    }
    if (input.expiresAt !== undefined) {
        payload.expires_at = input.expiresAt;
    }
    if (input.revokedAt !== undefined) {
        payload.revoked_at = input.revokedAt;
    }
    if (input.replacedBySessionId !== undefined) {
        payload.replaced_by_session_id = input.replacedBySessionId;
    }
    const updated = await pbRequest(`/api/collections/auth_sessions/records/${input.recordId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
    }, authToken);
    return mapAuthSessionRecord(updated);
}
