import type { FixtureDateCard, LeagueOption, MatchCardData, MatchPeriod, MatchStatus } from "./types";
export interface LiveProviderHealth {
    configured: boolean;
    baseUrl?: string;
    fixturesPath?: string;
    leagueId?: string;
    season?: string;
    timezone?: string;
    keyHeader?: string;
    hostHeader?: string;
    hasHost: boolean;
    period: MatchPeriod;
    queryMode?: "round" | "window";
    query?: {
        round?: string;
        from?: string;
        to?: string;
    };
    ok: boolean;
    status: number | null;
    latencyMs: number | null;
    fixturesCount: number;
    error?: string;
}
export interface LiveFixture {
    id: string;
    kickoffAt: string;
    statusShort: string;
    statusLong: string;
    elapsed: number | null;
    venue: string;
    homeName: string;
    awayName: string;
    homeLogoUrl?: string;
    awayLogoUrl?: string;
    homeGoals: number | null;
    awayGoals: number | null;
}
export interface LiveStandingRow {
    rank: number;
    teamName: string;
    played: number;
    win: number;
    draw: number;
    lose: number;
    points: number;
    group: string;
}
export interface LiveStandingsPayload {
    leagueName: string;
    groupLabel: string;
    rows: LiveStandingRow[];
}
type CompetitionStage = "apertura" | "clausura" | "general";
export declare function classifyFixtureStatus(statusShort: string): MatchStatus;
export declare function formatTeamCode(name: string): string;
export declare function formatRoundLabel(period: string): string;
export declare function probeLigaArgentinaProvider(period?: MatchPeriod): Promise<LiveProviderHealth>;
export declare function fetchProviderLeagues(input?: {
    season?: string;
}): Promise<LeagueOption[]>;
export declare function fetchAvailableFechas(input: {
    leagueId?: number | string;
    season?: string;
    competitionStage?: CompetitionStage;
}): Promise<MatchPeriod[]>;
export declare function resolveDefaultFecha(input: {
    leagueId?: number | string;
    season?: string;
    competitionStage?: CompetitionStage;
    fechas?: MatchPeriod[];
}): Promise<MatchPeriod>;
export declare function fetchLigaArgentinaFixtures(periodOrInput: MatchPeriod | {
    period?: MatchPeriod;
    leagueId?: number | string;
    season?: string;
    competitionStage?: CompetitionStage;
}): Promise<LiveFixture[]>;
export declare function fetchLigaArgentinaStandings(input?: {
    leagueId?: number | string;
    season?: string;
}): Promise<LiveStandingsPayload | null>;
export declare function mapFixturesToPronosticosMatches(fixtures: LiveFixture[]): MatchCardData[];
export declare function mapFixturesToFixtureCards(fixtures: LiveFixture[]): FixtureDateCard[];
export declare function mapFixturesToHomeLiveMatches(fixtures: LiveFixture[]): MatchCardData[];
export declare function mapFixturesToHomeUpcomingMatches(fixtures: LiveFixture[]): FixtureDateCard[];
export {};
