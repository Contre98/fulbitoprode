export declare function generateInviteValues(): {
    code: string;
    token: string;
    expiresAt: string;
};
export interface M3User {
    id: string;
    email: string;
    name: string;
    username?: string | null;
    favoriteTeam?: string | null;
}
export interface M3MembershipGroup {
    id: string;
    name: string;
    slug: string;
    season: string;
    leagueId: number;
    competitionStage: "apertura" | "clausura" | "general";
    competitionName: string;
    competitionKey: string;
}
export interface M3GroupMember {
    userId: string;
    name: string;
    role: "owner" | "admin" | "member";
    joinedAt: string;
}
export interface M3GroupPrediction {
    userId: string;
    fixtureId: string;
    period: string;
    home: number | null;
    away: number | null;
    submittedAt: string;
}
export declare function loginWithPassword(email: string, password: string): Promise<{
    user: M3User;
    token: string;
}>;
export declare function registerWithPassword(input: {
    email: string;
    password: string;
    name?: string;
}): Promise<{
    user: M3User;
    token: string;
}>;
export declare function requestPasswordReset(email: string): Promise<void>;
export declare function getUserById(userId: string, authToken: string): Promise<M3User>;
export declare function updateUserProfile(userId: string, input: {
    name?: string | null;
    favoriteTeam?: string | null;
    username?: string | null;
    email?: string | null;
}, authToken: string): Promise<M3User>;
export declare function listGroupsForUser(userId: string, authToken: string): Promise<{
    group: M3MembershipGroup;
    membership: {
        role: "owner" | "admin" | "member";
        joinedAt: string;
    };
}[]>;
export declare function isActiveGroupMember(userId: string, groupId: string, authToken: string): Promise<boolean>;
export declare function listGroupMembers(groupId: string, authToken: string): Promise<M3GroupMember[]>;
export declare function updateGroupMemberRole(input: {
    actorUserId: string;
    groupId: string;
    targetUserId: string;
    role: "admin" | "member";
}, authToken: string): Promise<{
    ok: false;
    error: string;
    changed?: undefined;
    member?: undefined;
} | {
    ok: true;
    changed: false;
    member: {
        userId: string;
        role: "admin" | "member";
    };
    error?: undefined;
} | {
    ok: true;
    changed: true;
    member: {
        userId: string;
        role: "admin" | "member";
    };
    error?: undefined;
}>;
export declare function removeGroupMember(input: {
    actorUserId: string;
    groupId: string;
    targetUserId: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
} | {
    ok: true;
    error?: undefined;
}>;
export declare function listGroupMembersForGroups(groupIds: string[], authToken: string): Promise<Record<string, M3GroupMember[]>>;
export declare function listGroupPredictions(input: {
    groupId: string;
    period?: string;
}, authToken: string): Promise<M3GroupPrediction[]>;
export declare function listGroupPredictionsForGroups(input: {
    groupIds: string[];
    period?: string;
}, authToken: string): Promise<Record<string, M3GroupPrediction[]>>;
export declare function createGroup(input: {
    userId: string;
    name: string;
    season?: string;
    leagueId?: number;
    competitionStage?: "apertura" | "clausura" | "general";
    competitionName?: string;
    competitionKey?: string;
}, authToken: string): Promise<{
    group: {
        id: string;
        name: string;
        slug: string;
        season: string;
        leagueId: number;
        competitionStage: string;
        competitionName: string;
        competitionKey: string;
    };
    membership: {
        role: "owner";
    };
    invite: {
        code: string;
        token: string;
        expiresAt: string;
    };
}>;
export declare function joinGroupByCodeOrToken(input: {
    userId: string;
    codeOrToken: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
    group?: undefined;
} | {
    ok: true;
    group: {
        id: string;
        name: string;
        slug: string;
        season: string;
        leagueId: number;
        competitionStage: string;
        competitionName: string;
        competitionKey: string;
    };
    error?: undefined;
}>;
export declare function listPredictionsForScope(input: {
    userId: string;
    groupId: string;
    period: string;
}, authToken: string): Promise<{
    [k: string]: {
        home: number | null;
        away: number | null;
    };
}>;
export declare function upsertPrediction(input: {
    userId: string;
    groupId: string;
    fixtureId: string;
    period: string;
    home: number | null;
    away: number | null;
}, authToken: string): Promise<void>;
export declare function leaveGroup(input: {
    userId: string;
    groupId: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
    deletedGroup?: undefined;
} | {
    ok: true;
    deletedGroup: boolean;
    error?: undefined;
}>;
export declare function renameGroup(input: {
    userId: string;
    groupId: string;
    name: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
    group?: undefined;
} | {
    ok: true;
    group: {
        id: string;
        name: string;
        slug: string;
    };
    error?: undefined;
}>;
export declare function deleteGroupSoft(input: {
    userId: string;
    groupId: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
    warningRequired?: undefined;
} | {
    ok: true;
    warningRequired: boolean;
    error?: undefined;
}>;
export declare function refreshGroupInvite(input: {
    userId: string;
    groupId: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
    invite?: undefined;
} | {
    ok: true;
    invite: {
        code: string;
        token: string;
        expiresAt: string;
    };
    error?: undefined;
}>;
export declare function getGroupInvite(input: {
    userId: string;
    groupId: string;
}, authToken: string): Promise<{
    ok: false;
    error: string;
    canRefresh?: undefined;
    invite?: undefined;
} | {
    ok: true;
    canRefresh: boolean;
    invite: {
        code: string;
        token: string;
        expiresAt: string;
    } | null;
    error?: undefined;
}>;
export interface M3AuthSessionRecord {
    recordId: string;
    sessionId: string;
    userId: string;
    refreshTokenHash: string;
    issuedAt: string;
    expiresAt: string;
    revokedAt: string | null;
    replacedBySessionId: string | null;
}
export declare function createAuthSessionRecord(input: {
    sessionId: string;
    userId: string;
    refreshTokenHash: string;
    issuedAt: string;
    expiresAt: string;
}, authToken: string): Promise<M3AuthSessionRecord>;
export declare function getAuthSessionRecord(input: {
    sessionId: string;
    userId: string;
}, authToken: string): Promise<M3AuthSessionRecord | null>;
export declare function patchAuthSessionRecord(input: {
    recordId: string;
    refreshTokenHash?: string;
    expiresAt?: string;
    revokedAt?: string | null;
    replacedBySessionId?: string | null;
}, authToken: string): Promise<M3AuthSessionRecord>;
