"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Clock, Home, Moon, Settings, Sun, TrendingUp, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalGroupSelector } from "@/components/layout/GlobalGroupSelector";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { trackClientEvent } from "@/lib/observability";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import { useToast } from "@/components/ui/ToastProvider";
import { useTheme } from "@/lib/use-theme";
import type { FixtureDateCard as FixtureDateCardType, FixtureScoreTone } from "@/lib/types";

interface HomeSummary {
  pendingPredictions?: number;
  liveMatches?: number;
  myRank?: number;
  myPoints?: number;
  weeklyWinner?: {
    period: string;
    periodLabel: string;
    winnerName: string;
    points: number;
    tied?: boolean;
  } | null;
}

interface HomePayload {
  liveCards: FixtureDateCardType[];
  updatedAt: string;
  summary?: HomeSummary;
}

type HomeFilter = "todos" | "en vivo" | "próximos";
type HomeMatchStatus = "upcoming" | "live" | "finished";

interface HomeMatch {
  id: string;
  status: HomeMatchStatus;
  home: string;
  away: string;
  homeLogoUrl?: string;
  awayLogoUrl?: string;
  info: string;
  subInfo: string;
  stadium: string;
  isLive: boolean;
  kickoffAt?: string;
}

const HOME_FILTERS: Array<{ id: HomeFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "en vivo", label: "En vivo" },
  { id: "próximos", label: "Próximos" }
];

function kickoffDayLabel(kickoffAt?: string) {
  if (!kickoffAt) {
    return "HOY";
  }

  const kickoff = new Date(kickoffAt);
  if (!Number.isFinite(kickoff.getTime())) {
    return "HOY";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const tomorrow = today + 24 * 60 * 60 * 1000;
  const kickoffDay = new Date(kickoff.getFullYear(), kickoff.getMonth(), kickoff.getDate()).getTime();

  if (kickoffDay === today) {
    return "HOY";
  }
  if (kickoffDay === tomorrow) {
    return "MAÑANA";
  }

  return kickoff
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit"
    })
    .toUpperCase();
}

function kickoffTimeLabel(kickoffAt?: string) {
  if (!kickoffAt) {
    return "--:--";
  }

  const kickoff = new Date(kickoffAt);
  if (!Number.isFinite(kickoff.getTime())) {
    return "--:--";
  }

  return kickoff.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function statusFromTone(tone: FixtureScoreTone): HomeMatchStatus {
  if (tone === "live") return "live";
  if (tone === "final") return "finished";
  return "upcoming";
}

function statusOrder(status: HomeMatchStatus) {
  if (status === "live") return 0;
  if (status === "upcoming") return 1;
  return 2;
}

function toHomeMatches(cards: FixtureDateCardType[]) {
  return cards
    .flatMap((card) =>
      card.rows.map((row, index) => {
        const status = statusFromTone(row.tone);
        const info = status === "upcoming" ? kickoffDayLabel(row.kickoffAt) : row.score ? `${row.score.home} - ${row.score.away}` : "0 - 0";
        const subInfo = status === "upcoming" ? kickoffTimeLabel(row.kickoffAt) : status === "live" ? row.statusDetail || "EN VIVO" : "Final";

        return {
          id: `${card.dateLabel}-${row.home}-${row.away}-${row.kickoffAt || index}`,
          status,
          home: row.home,
          away: row.away,
          homeLogoUrl: row.homeLogoUrl,
          awayLogoUrl: row.awayLogoUrl,
          info,
          subInfo,
          stadium: row.venue || "Sede por confirmar",
          isLive: status === "live",
          kickoffAt: row.kickoffAt
        } satisfies HomeMatch;
      })
    )
    .sort((a, b) => {
      const toneDiff = statusOrder(a.status) - statusOrder(b.status);
      if (toneDiff !== 0) return toneDiff;

      const aKickoff = a.kickoffAt ? new Date(a.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bKickoff = b.kickoffAt ? new Date(b.kickoffAt).getTime() : Number.MAX_SAFE_INTEGER;
      return aKickoff - bKickoff;
    });
}

function filteredMatches(matches: HomeMatch[], filter: HomeFilter) {
  if (filter === "todos") {
    return matches;
  }

  return matches.filter((match) => {
    if (filter === "en vivo") return match.status === "live";
    if (filter === "próximos") return match.status === "upcoming";
    return true;
  });
}

function initialsFromLabel(label: string) {
  const chunks = label
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk.charAt(0).toUpperCase());

  return chunks.length > 0 ? chunks.join("") : "FC";
}

function teamBadgeText(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "FC";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

function HomeTopHeader({
  userName,
  theme,
  onToggleTheme,
  memberships,
  activeGroupId,
  onSelectGroup
}: {
  userName: string;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  memberships: ReturnType<typeof useAuthSession>["memberships"];
  activeGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
}) {
  return (
    <header className="sticky top-0 z-10 rounded-b-3xl bg-[var(--surface-card)] px-5 pt-12 pb-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[var(--bg-surface-2)] p-1.5 text-[var(--accent-primary)] shadow-sm">
            <Trophy size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-[var(--text-primary)]">
            <span className="italic">Fulbito</span>
            <span className="text-[var(--accent-primary)]">Prode</span>
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]"
            aria-label="Cambiar tema"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href="/configuracion/ajustes"
            className="rounded-full bg-[var(--surface-card-muted)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-card-muted)]"
            aria-label="Configuración"
          >
            <Settings size={18} />
          </Link>
          <Link
            href="/perfil"
            aria-label="Perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-primary)]"
          >
            {initialsFromLabel(userName)}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-[var(--accent-primary)] p-1.5 text-[var(--text-on-accent)]">
          <Home size={18} />
        </div>
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Inicio</h2>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--text-muted)]">Tablero general</span>
          <GlobalGroupSelector memberships={memberships} activeGroupId={activeGroupId} onSelectGroup={onSelectGroup} />
        </div>
      </div>
    </header>
  );
}

function TeamMark({
  logoUrl,
  teamName,
  fallbackTone
}: {
  logoUrl?: string;
  teamName: string;
  fallbackTone: "home" | "away";
}) {
  if (logoUrl) {
    return (
      <div className="relative mb-2 h-12 w-12 overflow-hidden rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <img src={logoUrl} alt={`${teamName} logo`} className="h-full w-full object-contain p-[5px]" />
      </div>
    );
  }

  const fallbackClass =
    fallbackTone === "home"
      ? "bg-[var(--bg-surface-2)] text-[var(--text-primary)]"
      : "border-2 border-[var(--status-danger-border)] bg-[var(--surface-card)] text-[var(--danger)]";

  return (
    <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${fallbackClass}`}>{teamBadgeText(teamName)}</div>
  );
}

export function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HomeFilter>("todos");
  const [liveCards, setLiveCards] = useState<FixtureDateCardType[]>([]);
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const homeCacheRef = useRef<Map<string, HomePayload>>(new Map());
  const { showToast } = useToast();
  const { user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();
  const { theme, toggleTheme } = useTheme();
  usePageBenchmark("home", loading);

  useEffect(() => {
    if (memberships.length === 0) {
      setLiveCards([]);
      setSummary(null);
      setLoading(false);
      return;
    }

    const targetGroupId = activeGroupId || memberships[0].groupId;
    const cached = homeCacheRef.current.get(targetGroupId);
    if (cached) {
      setError(null);
      setLoading(false);
      setLiveCards(cached.liveCards);
      setSummary(cached.summary ?? null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/home?groupId=${encodeURIComponent(targetGroupId)}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as HomePayload;
        if (cancelled) {
          return;
        }

        homeCacheRef.current.set(targetGroupId, payload);
        setLiveCards(payload.liveCards);
        setSummary(payload.summary ?? null);
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los datos de inicio.";
          setError(message);
          setLiveCards([]);
          setSummary(null);
          showToast({ title: "Error al cargar Inicio", description: message, tone: "error" });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [activeGroupId, memberships, showToast]);

  const matches = useMemo(() => toHomeMatches(liveCards), [liveCards]);
  const visibleMatches = useMemo(() => filteredMatches(matches, filter), [matches, filter]);
  const weeklyWinner = summary?.weeklyWinner ?? null;

  async function shareWeeklyWinner() {
    if (!weeklyWinner) {
      return;
    }
    const text = `Ganador ${weeklyWinner.periodLabel}: ${weeklyWinner.winnerName} con ${weeklyWinner.points} pts en Fulbito Prode.`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Fulbito Prode",
          text
        });
        trackClientEvent("home.weekly-winner.shared", { mode: "native" });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast({ title: "Resultado copiado", description: "Ya podés compartirlo.", tone: "success" });
        trackClientEvent("home.weekly-winner.shared", { mode: "clipboard" });
      }
    } catch {
      // Ignore user-cancelled share flow.
    }
  }

  return (
    <AppShell activeTab="inicio" showTopGlow={false}>
      <div className="min-h-full bg-[var(--surface-card-muted)]">
        <HomeTopHeader
          userName={user?.name || "Facundo Contreras"}
          theme={theme}
          onToggleTheme={toggleTheme}
          memberships={memberships}
          activeGroupId={activeGroupId}
          onSelectGroup={setActiveGroupId}
        />

        <main className="mt-6 space-y-4 no-scrollbar">
          {memberships.length > 0 ? (
            <div className="flex gap-2 px-4 no-scrollbar">
              <div className="flex h-20 flex-1 flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5 text-center shadow-sm">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-[var(--text-muted)]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">RANKING</span>
                </div>
                <p className="text-xl leading-none font-black tracking-tighter text-[var(--text-primary)]">{summary?.myRank ? `#${summary.myRank}` : "--"}</p>
              </div>

              <div className="flex h-20 flex-1 flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5 text-center shadow-sm">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-[var(--text-muted)]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">PENDIENTES</span>
                </div>
                <p className="text-xl leading-none font-black tracking-tighter text-[var(--text-primary)]">{summary?.pendingPredictions ?? 0}</p>
              </div>

              <div className="flex h-20 flex-1 flex-col items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-2.5 text-center shadow-sm">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Activity size={14} className="text-[var(--danger)]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">EN VIVO</span>
                </div>
                <p className={`text-xl leading-none font-black tracking-tighter ${summary?.liveMatches ? "animate-pulse text-[var(--danger)]" : "text-[var(--text-primary)]"}`}>{summary?.liveMatches ?? 0}</p>
              </div>
            </div>
          ) : null}

          {weeklyWinner ? (
            <div className="px-4">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase">Ganador semanal</p>
                    <p className="mt-1 text-base font-black text-[var(--text-primary)]">{weeklyWinner.periodLabel}: {weeklyWinner.winnerName}</p>
                    <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">{weeklyWinner.points} pts {weeklyWinner.tied ? "· empate" : ""}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void shareWeeklyWinner()}
                    className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-[11px] font-bold text-[var(--accent-primary)]"
                  >
                    Compartir
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-4 px-4 pb-4 no-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Próximos Partidos</h3>
              <button type="button" className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]" aria-label="Estado de partidos">
                <Activity size={16} />
              </button>
            </div>

            <div className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-0.5 shadow-sm">
              <div className="grid grid-cols-3 gap-1">
                {HOME_FILTERS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`h-7 w-full whitespace-nowrap rounded-lg px-2 text-[11px] font-bold transition-colors ${
                      filter === tab.id ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-card-muted)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 no-scrollbar">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={`home-skeleton-${index}`} className="h-[160px] w-full rounded-2xl" />)
                : visibleMatches.map((match) => (
                    <div
                      key={match.id}
                      className={`overflow-hidden rounded-2xl border bg-[var(--surface-card)] shadow-sm ${
                        match.isLive ? "animate-pulse border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)]" : "border-[var(--border-subtle)]"
                      }`}
                    >
                      <div className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex w-1/3 flex-col items-center">
                            <TeamMark logoUrl={match.homeLogoUrl} teamName={match.home} fallbackTone="home" />
                            <p className="text-center text-xs leading-tight font-bold text-[var(--text-primary)]">{match.home}</p>
                          </div>

                          <div className="w-1/3 text-center">
                            {match.isLive ? (
                              <div className="flex flex-col items-center">
                                <span className="mb-1 animate-pulse rounded-full bg-[var(--status-danger-bg)] px-2 py-0.5 text-[10px] font-bold text-[var(--danger)]">EN VIVO</span>
                                <p className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">{match.info}</p>
                                <p className="mt-1 text-xs font-bold text-[var(--danger)]">{match.subInfo}</p>
                              </div>
                            ) : (
                              <>
                                <p className="mb-1 text-xs font-bold text-[var(--text-muted)]">{match.info}</p>
                                <p className="text-2xl font-black tracking-tighter text-[var(--text-primary)]">{match.status === "upcoming" ? "VS" : match.info}</p>
                                <p className="mt-1 text-xs font-bold text-[var(--text-secondary)]">{match.subInfo}</p>
                              </>
                            )}
                          </div>

                          <div className="flex w-1/3 flex-col items-center">
                            <TeamMark logoUrl={match.awayLogoUrl} teamName={match.away} fallbackTone="away" />
                            <p className="text-center text-xs leading-tight font-bold text-[var(--text-primary)]">{match.away}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="inline-flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 10c0 5-8 12-8 12s-8-7-8-12a8 8 0 1 1 16 0Z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {match.stadium}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>

            {memberships.length > 0 && !loading && visibleMatches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)]">No hay partidos para este filtro en este momento.</p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs font-medium text-[var(--danger)]">{error}</p>
            ) : null}
          </div>
        </main>
      </div>
    </AppShell>
  );
}
