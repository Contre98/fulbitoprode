"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bell, Clock, Home, Moon, Settings, Shield, TrendingUp, Trophy } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import { useToast } from "@/components/ui/ToastProvider";
import { useTheme } from "@/lib/use-theme";
import type { FixtureDateCard as FixtureDateCardType, FixtureScoreTone, GroupCard } from "@/lib/types";

interface HomeSummary {
  pendingPredictions?: number;
  liveMatches?: number;
  myRank?: number;
  myPoints?: number;
}

interface HomePayload {
  groupCards: GroupCard[];
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

function groupSeasonLabel(subtitle: string) {
  const match = subtitle.match(/TEMP\s*\d{4}/i);
  return match ? match[0].toUpperCase() : "TEMP 2026";
}

function parseScore(scoreLabel: string) {
  const match = scoreLabel.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) {
    return null;
  }

  return {
    home: Number(match[1]),
    away: Number(match[2])
  };
}

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
  if (status === "upcoming") return 0;
  if (status === "live") return 1;
  return 2;
}

function toHomeMatches(cards: FixtureDateCardType[]) {
  return cards
    .flatMap((card) =>
      card.rows.map((row, index) => {
        const status = statusFromTone(row.tone);
        const parsedScore = parseScore(row.scoreLabel);
        const info = status === "upcoming" ? kickoffDayLabel(row.kickoffAt) : parsedScore ? `${parsedScore.home} - ${parsedScore.away}` : "0 - 0";
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
  onToggleTheme
}: {
  userName: string;
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 rounded-b-3xl bg-white px-5 pt-12 pb-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-900 p-1.5 text-lime-400 shadow-sm">
            <Trophy size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-slate-900">
            <span className="italic">Fulbito</span>
            <span className="text-lime-500">Prode</span>
          </h1>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
            aria-label="Cambiar tema"
          >
            <Moon size={18} />
          </button>
          <button
            type="button"
            className="relative rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
            aria-label="Notificaciones"
          >
            <Bell size={18} />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-red-500" />
          </button>
          <Link
            href="/configuracion/ajustes"
            className="rounded-full bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200"
            aria-label="Configuración"
          >
            <Settings size={18} />
          </Link>
          <Link
            href="/perfil"
            aria-label="Perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-100 text-sm font-bold text-lime-700"
          >
            {initialsFromLabel(userName)}
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-lime-400 p-1.5 text-white">
          <Home size={18} />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Inicio</h2>
        <span className="ml-auto text-sm font-medium text-slate-400">Tablero general</span>
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
      <div className="relative mb-2 h-12 w-12 overflow-hidden rounded-full border border-slate-200 bg-white">
        <img src={logoUrl} alt={`${teamName} logo`} className="h-full w-full object-contain p-[5px]" />
      </div>
    );
  }

  const fallbackClass =
    fallbackTone === "home"
      ? "bg-slate-800 text-white"
      : "border-2 border-red-400 bg-white text-red-500";

  return (
    <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${fallbackClass}`}>{teamBadgeText(teamName)}</div>
  );
}

export function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<HomeFilter>("todos");
  const [groupCards, setGroupCards] = useState<GroupCard[]>([]);
  const [liveCards, setLiveCards] = useState<FixtureDateCardType[]>([]);
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const homeCacheRef = useRef<Map<string, HomePayload>>(new Map());
  const { showToast } = useToast();
  const { user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();
  const { toggleTheme } = useTheme();
  usePageBenchmark("home", loading);

  useEffect(() => {
    if (memberships.length === 0) {
      setGroupCards([]);
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
      setGroupCards(cached.groupCards);
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
        setGroupCards(payload.groupCards);
        setLiveCards(payload.liveCards);
        setSummary(payload.summary ?? null);
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los datos de inicio.";
          setError(message);
          setGroupCards([]);
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

  return (
    <AppShell activeTab="inicio" showTopGlow={false}>
      <div className="min-h-full bg-slate-50">
        <HomeTopHeader userName={user?.name || "Facundo Contreras"} onToggleTheme={toggleTheme} />

        <main className="mt-6 space-y-4 no-scrollbar">
          {memberships.length > 0 ? (
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 no-scrollbar">
              {groupCards.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className="relative flex min-w-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm"
                >
                  <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-lime-100 opacity-50 blur-xl" />
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{groupSeasonLabel(group.subtitle)}</span>
                      <h3 className="text-lg font-bold text-slate-800">{group.title}</h3>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-1.5">
                      <Shield size={16} className="text-slate-400" />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                      <p className="mb-0.5 text-[10px] font-semibold text-slate-400">RANKING</p>
                      <p className="text-2xl font-black tracking-tighter text-slate-800">{group.rank || "--"}</p>
                    </div>
                    <div className="flex-1 rounded-xl border border-lime-100 bg-lime-50 p-2.5">
                      <p className="mb-0.5 text-[10px] font-semibold text-lime-700">PUNTOS</p>
                      <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-black tracking-tighter text-lime-700">{group.points || "0"}</p>
                        <Trophy size={12} className="mb-1 text-lime-600" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {memberships.length > 0 ? (
            <div className="flex gap-2 px-4 no-scrollbar">
              <div className="flex h-20 flex-1 flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-2.5 text-center shadow-sm">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-slate-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">RANKING</span>
                </div>
                <p className="text-xl leading-none font-black tracking-tighter text-slate-800">{summary?.myRank ? `#${summary.myRank}` : "--"}</p>
              </div>

              <div className="flex h-20 flex-1 flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-2.5 text-center shadow-sm">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">PENDIENTES</span>
                </div>
                <p className="text-xl leading-none font-black tracking-tighter text-slate-800">{summary?.pendingPredictions ?? 0}</p>
              </div>

              <div className="flex h-20 flex-1 flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-2.5 text-center shadow-sm">
                <div className="mb-0.5 flex items-center gap-1.5">
                  <Activity size={14} className="text-red-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">EN VIVO</span>
                </div>
                <p className={`text-xl leading-none font-black tracking-tighter ${summary?.liveMatches ? "animate-pulse text-red-500" : "text-slate-800"}`}>{summary?.liveMatches ?? 0}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-4 px-4 pb-4 no-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">Próximos Partidos</h3>
              <button type="button" className="text-slate-400 transition-colors hover:text-slate-600" aria-label="Estado de partidos">
                <Activity size={16} />
              </button>
            </div>

            <div className="w-full rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
              <div className="grid grid-cols-3 gap-1">
                {HOME_FILTERS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`h-7 w-full whitespace-nowrap rounded-lg px-2 text-[11px] font-bold transition-colors ${
                      filter === tab.id ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:bg-slate-100"
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
                    <div key={match.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                      <div className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                          <div className="flex w-1/3 flex-col items-center">
                            <TeamMark logoUrl={match.homeLogoUrl} teamName={match.home} fallbackTone="home" />
                            <p className="text-center text-xs leading-tight font-bold text-slate-800">{match.home}</p>
                          </div>

                          <div className="w-1/3 text-center">
                            {match.isLive ? (
                              <div className="flex flex-col items-center">
                                <span className="mb-1 animate-pulse rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">EN VIVO</span>
                                <p className="text-2xl font-black tracking-tighter text-slate-800">{match.info}</p>
                                <p className="mt-1 text-xs font-bold text-red-500">{match.subInfo}</p>
                              </div>
                            ) : (
                              <>
                                <p className="mb-1 text-xs font-bold text-slate-400">{match.info}</p>
                                <p className="text-2xl font-black tracking-tighter text-slate-800">{match.status === "upcoming" ? "VS" : match.info}</p>
                                <p className="mt-1 text-xs font-bold text-slate-500">{match.subInfo}</p>
                              </>
                            )}
                          </div>

                          <div className="flex w-1/3 flex-col items-center">
                            <TeamMark logoUrl={match.awayLogoUrl} teamName={match.away} fallbackTone="away" />
                            <p className="text-center text-xs leading-tight font-bold text-slate-800">{match.away}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
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
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-2 text-xs text-slate-500">No hay partidos para este filtro en este momento.</p>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-500">{error}</p>
            ) : null}
          </div>

          {memberships.length === 0 ? (
            <div className="px-4 pb-4">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">No tenés grupos activos.</p>
                <p className="mt-1 text-xs text-slate-500">Creá o uníte a un grupo para empezar.</p>
                <Link href="/configuracion" className="mt-3 inline-flex rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900">
                  Ir a grupos
                </Link>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </AppShell>
  );
}
