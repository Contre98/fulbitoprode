import type { Fixture } from "@fulbito/domain";

export type MatchFormState = "win" | "draw" | "loss" | "none";

function normalizeTeamName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const TEAM_COLOR_BY_NAME_RAW: Record<string, string> = {
  argentinos: "#FF0000",
  "argentinos juniors": "#FF0000",
  "argentinos jrs": "#FF0000",
  "atletico tucuman": "#75AADB",
  aldosivi: "#008000",
  "club atletico aldosivi": "#008000",
  "banfield": "#00843D",
  "barracas central": "#D71920",
  belgrano: "#6ECFF6",
  "belgrano de cordoba": "#6ECFF6",
  "belgrano cordoba": "#6ECFF6",
  "club atletico belgrano": "#6ECFF6",
  "club atletico belgrano de cordoba": "#6ECFF6",
  "boca juniors": "#0033A0",
  "central cordoba": "#000000",
  "central cordoba se": "#000000",
  "central cordoba de santiago del estero": "#000000",
  "club atletico central cordoba": "#000000",
  "club atletico central cordoba se": "#000000",
  "ca central cordoba": "#000000",
  "defensa y justicia": "#D6DF23",
  "gimnasia de mendoza": "#000000",
  "gimnasia mendoza": "#000000",
  "gimnasia y esgrima de mendoza": "#000000",
  "ca gimnasia y esgrima de mendoza": "#000000",
  "club atletico gimnasia y esgrima de mendoza": "#000000",
  "deportivo riestra": "#111111",
  estudiantes: "#FF0000",
  "estudiantes de la plata": "#FF0000",
  "estudiantes l p": "#FF0000",
  "estudiantes de rio cuarto": "#0000FF",
  "estudiantes rio cuarto": "#0000FF",
  "asociacion atletica estudiantes": "#0000FF",
  gimnasia: "#0000FF",
  "gimnasia l p": "#0000FF",
  "gimnasia m": "#000000",
  "gimnasia de la plata": "#0000FF",
  "gimnasia y esgrima": "#0000FF",
  "gimnasia y esgrima la plata": "#0000FF",
  "godoy cruz": "#2E5FA9",
  "huracan": "#E20613",
  "independiente del valle": "#0000FF",
  "independiente rivadavia": "#1E5BAA",
  "independiente rivadavia de mendoza": "#1E5BAA",
  "club atletico independiente rivadavia": "#1E5BAA",
  independiente: "#C8102E",
  instituto: "#FF0000",
  "instituto de cordoba": "#FF0000",
  "instituto cordoba": "#FF0000",
  "instituto atletico central cordoba": "#FF0000",
  lanus: "#7A0019",
  newells: "#FF0000",
  "newells old boys": "#FF0000",
  "newell's old boys": "#FF0000",
  platense: "#6B3F1D",
  racing: "#4DB6E5",
  "racing club": "#4DB6E5",
  "club atletico racing": "#4DB6E5",
  "river plate": "#E30613",
  "rosario central": "#FFFF00",
  "club atletico rosario central": "#FFFF00",
  "san lorenzo": "#FF0000",
  "san lorenzo de almagro": "#FF0000",
  sarmiento: "#008000",
  "sarmiento de junin": "#008000",
  "sarmiento junin": "#008000",
  "club atletico sarmiento": "#008000",
  "club atletico sarmiento de junin": "#008000",
  "talleres cordoba": "#1D3557",
  talleres: "#1D3557",
  tigre: "#0000FF",
  "club atletico tigre": "#0000FF",
  union: "#FF0000",
  "union de santa fe": "#FF0000",
  "union santa fe": "#FF0000",
  velez: "#1F4AA8",
  "velez sarsfield": "#1F4AA8"
};

const TEAM_COLOR_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_COLOR_BY_NAME_RAW).map(([name, color]) => [normalizeTeamName(name), color])
);

type TeamResult = {
  kickoffMs: number;
  outcome: Exclude<MatchFormState, "none">;
};

function fallbackTeamColor(teamName: string): string {
  void teamName;
  return "#9CA3AF";
}

export function teamPredominantColor(teamName: string): string {
  const normalized = normalizeTeamName(teamName);
  const exact = TEAM_COLOR_BY_NAME[normalized];
  if (exact) {
    return exact;
  }

  // Handle provider variants like suffixes, abbreviations or extra location hints.
  if (normalized.includes("platense")) return "#6B3F1D";
  if (normalized.includes("independiente rivadavia")) return "#1E5BAA";
  if (normalized.includes("central cordoba")) return "#000000";
  if (normalized.includes("belgrano")) return "#6ECFF6";

  return fallbackTeamColor(teamName);
}

export function buildTeamFormLookup(fixtures: Fixture[]) {
  const resultsByTeam = new Map<string, TeamResult[]>();

  const push = (team: string, result: TeamResult) => {
    const key = normalizeTeamName(team);
    const list = resultsByTeam.get(key);
    if (list) {
      list.push(result);
      return;
    }
    resultsByTeam.set(key, [result]);
  };

  fixtures.forEach((fixture) => {
    if (fixture.status !== "final" || !fixture.score) {
      return;
    }
    const kickoffMs = new Date(fixture.kickoffAt).getTime();
    if (!Number.isFinite(kickoffMs)) {
      return;
    }

    const diff = fixture.score.home - fixture.score.away;
    const homeOutcome: TeamResult["outcome"] = diff > 0 ? "win" : diff < 0 ? "loss" : "draw";
    const awayOutcome: TeamResult["outcome"] = diff > 0 ? "loss" : diff < 0 ? "win" : "draw";
    push(fixture.homeTeam, { kickoffMs, outcome: homeOutcome });
    push(fixture.awayTeam, { kickoffMs, outcome: awayOutcome });
  });

  resultsByTeam.forEach((list) => {
    list.sort((a, b) => b.kickoffMs - a.kickoffMs);
  });

  return (teamName: string, beforeKickoffAt: string, count = 5): MatchFormState[] => {
    const key = normalizeTeamName(teamName);
    const list = resultsByTeam.get(key) ?? [];
    const referenceMs = new Date(beforeKickoffAt).getTime();
    const maxMs = Number.isFinite(referenceMs) ? referenceMs : Number.POSITIVE_INFINITY;
    const recent = list.filter((entry) => entry.kickoffMs < maxMs).slice(0, count).map((entry) => entry.outcome);
    while (recent.length < count) {
      recent.push("none");
    }
    // UI expects oldest -> newest from left to right.
    return [...recent].reverse();
  };
}
