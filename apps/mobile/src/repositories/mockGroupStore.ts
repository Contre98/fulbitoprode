import type { Group, Membership } from "@fulbito/domain";
const LPF_APERTURA_2026_LABEL = "LPF: Apertura (2026)";

const baseGroup: Group = {
  id: "grupo-1",
  name: "Grupo Amigos",
  leagueId: 128,
  season: "2026"
};

const asdGroup: Group = {
  id: "grupo-asd",
  name: "asd",
  leagueId: 128,
  season: "2026"
};

const baseMembership: Membership = {
  groupId: "grupo-1",
  groupName: "Grupo Amigos",
  leagueId: 128,
  leagueName: "Liga Profesional",
  season: "2026",
  role: "owner",
  joinedAt: new Date().toISOString(),
  competitionKey: "argentina-128",
  competitionName: LPF_APERTURA_2026_LABEL,
  competitionStage: "apertura"
};

const asdMembership: Membership = {
  groupId: "grupo-asd",
  groupName: "asd",
  leagueId: 128,
  leagueName: "Liga Profesional",
  season: "2026",
  role: "owner",
  joinedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  competitionKey: "argentina-128",
  competitionName: LPF_APERTURA_2026_LABEL,
  competitionStage: "apertura"
};

let groupsStore: Group[] = [asdGroup, baseGroup];
let membershipsStore: Membership[] = [asdMembership, baseMembership];

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function listMockGroups() {
  return groupsStore.map((group) => ({ ...group }));
}

export function listMockMemberships() {
  return membershipsStore.map((membership) => ({ ...membership }));
}

export function createMockGroup(input: {
  name: string;
  season?: string;
  leagueId?: number;
  competitionStage?: "apertura" | "clausura" | "general";
  competitionName?: string;
  competitionKey?: string;
}) {
  const cleanName = input.name.trim();
  const baseId = slugify(cleanName) || `grupo-${groupsStore.length + 1}`;
  const id = `${baseId}-${groupsStore.length + 1}`;
  const nextGroup: Group = {
    id,
    name: cleanName,
    leagueId: input.leagueId ?? 128,
    season: input.season ?? "2026"
  };

  const nextMembership: Membership = {
    groupId: id,
    groupName: cleanName,
    leagueId: nextGroup.leagueId,
    leagueName: "Liga Profesional",
    season: nextGroup.season,
    role: "owner",
    joinedAt: new Date().toISOString(),
    competitionKey: input.competitionKey ?? "argentina-128",
    competitionName: input.competitionName ?? (input.competitionStage === "apertura" ? LPF_APERTURA_2026_LABEL : "Liga Profesional"),
    competitionStage: input.competitionStage ?? "apertura"
  };

  groupsStore = [nextGroup, ...groupsStore];
  membershipsStore = [nextMembership, ...membershipsStore];
  return { ...nextGroup };
}

export function joinMockGroup(input: { codeOrToken: string }) {
  const token = input.codeOrToken.trim();
  const cleanName = token.length > 0 ? `Grupo ${token.slice(0, 12)}` : "Grupo Invitado";
  const baseId = slugify(cleanName) || `grupo-${groupsStore.length + 1}`;
  const id = `${baseId}-${groupsStore.length + 1}`;

  const nextGroup: Group = {
    id,
    name: cleanName,
    leagueId: 128,
    season: "2026"
  };
  const nextMembership: Membership = {
    groupId: id,
    groupName: cleanName,
    leagueId: 128,
    leagueName: "Liga Profesional",
    season: "2026",
    role: "member",
    joinedAt: new Date().toISOString(),
    competitionKey: "argentina-128",
    competitionName: LPF_APERTURA_2026_LABEL,
    competitionStage: "apertura"
  };

  groupsStore = [nextGroup, ...groupsStore];
  membershipsStore = [nextMembership, ...membershipsStore];
  return { ...nextGroup };
}

export function renameMockGroup(input: { groupId: string; name: string }) {
  const cleanName = input.name.trim();
  if (!cleanName) {
    throw new Error("Group name is required");
  }

  let renamed = false;
  groupsStore = groupsStore.map((group) => {
    if (group.id !== input.groupId) {
      return group;
    }
    renamed = true;
    return {
      ...group,
      name: cleanName
    };
  });

  membershipsStore = membershipsStore.map((membership) => {
    if (membership.groupId !== input.groupId) {
      return membership;
    }
    return {
      ...membership,
      groupName: cleanName
    };
  });

  if (!renamed) {
    throw new Error("Group not found");
  }

  return {
    ok: true as const,
    group: {
      id: input.groupId,
      name: cleanName
    }
  };
}

export function resetMockGroupStore() {
  groupsStore = [asdGroup, baseGroup];
  membershipsStore = [asdMembership, baseMembership];
}
