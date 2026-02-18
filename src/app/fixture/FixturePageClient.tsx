"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Moon, Settings, Trophy, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import { useToast } from "@/components/ui/ToastProvider";
import { useTheme } from "@/lib/use-theme";
import type { FechasPayload, FixtureDateCard as FixtureDateCardType, FixtureMatchRow, FixturePayload, SelectionOption } from "@/lib/types";

interface FechaOption {
  id: string;
  label: string;
}

type FixtureFilter = "all" | "live" | "final" | "upcoming";

const filterLabels: Record<FixtureFilter, string> = {
  all: "Todos",
  live: "En vivo",
  final: "Finalizados",
  upcoming: "Próximos"
};

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
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return words[0].charAt(0).toUpperCase();
}

function selectionLabel(option: SelectionOption | null) {
  if (!option) {
    return "Sin grupo activo";
  }
  return `${option.competitionName || option.leagueName} · ${option.groupName}`;
}

function parseScore(scoreLabel: string) {
  const match = scoreLabel.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  return `${match[1]} - ${match[2]}`;
}

function parseTime(row: FixtureMatchRow) {
  const byLabel = row.scoreLabel.match(/\b(\d{1,2}:\d{2})\b/);
  if (byLabel) return byLabel[1];

  if (!row.kickoffAt) return "--:--";
  const kickoff = new Date(row.kickoffAt);
  if (!Number.isFinite(kickoff.getTime())) return "--:--";
  return kickoff.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formattedUpdatedLabel(updatedAt: string | null) {
  if (!updatedAt) return "Actualizado hace instantes";

  const date = new Date(updatedAt);
  if (!Number.isFinite(date.getTime())) {
    return "Actualizado hace instantes";
  }

  if (Date.now() - date.getTime() <= 90_000) {
    return "Actualizado hace instantes";
  }

  const value = new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  })
    .format(date)
    .replace(/\u00A0/g, " ")
    .toLowerCase();

  return `Actualizado ${value}`;
}

function filteredCards(cards: FixtureDateCardType[], filter: FixtureFilter) {
  if (filter === "all") {
    return cards;
  }

  return cards
    .map((card) => ({
      ...card,
      rows: card.rows.filter((row) => {
        if (filter === "upcoming") {
          return row.tone === "upcoming" || row.tone === "warning";
        }
        return row.tone === filter;
      })
    }))
    .filter((card) => card.rows.length > 0);
}

function GroupSelectorModal({
  open,
  options,
  activeGroupId,
  onSelect,
  onClose
}: {
  open: boolean;
  options: SelectionOption[];
  activeGroupId: string | null;
  onSelect: (groupId: string) => void;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center overflow-hidden no-scrollbar" role="dialog" aria-modal="true">
      <button type="button" aria-label="Cerrar selector" onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
      <div className="relative max-h-[70%] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl no-scrollbar">
        <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">Cambiar Grupo</h3>
          <button type="button" onClick={onClose} className="rounded-full bg-slate-50 p-2 text-slate-400" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2 no-scrollbar">
          {options.map((option) => {
            const isActive = option.groupId === activeGroupId;
            return (
              <button
                key={option.groupId}
                type="button"
                onClick={() => {
                  onSelect(option.groupId);
                  onClose();
                }}
                className={`w-full rounded-xl p-3 transition-all ${
                  isActive ? "border-2 border-lime-400 bg-lime-50" : "border border-slate-100 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="flex min-w-0 items-center gap-3 overflow-hidden">
                    <span
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        isActive ? "bg-lime-200 text-lime-800" : "bg-white text-slate-500 shadow-sm"
                      }`}
                    >
                      {initialsFromLabel(option.groupName)}
                    </span>

                    <span className="min-w-0 text-left">
                      <span className={`block truncate text-sm font-bold ${isActive ? "text-slate-900" : "text-slate-700"}`}>{option.groupName}</span>
                      <span className="block truncate text-xs text-slate-500">{option.competitionName || option.leagueName}</span>
                    </span>
                  </span>

                  {isActive ? (
                    <span className="flex flex-shrink-0 rounded-full bg-lime-400 p-1 text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamLogo({
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
      <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full border border-slate-200 bg-white p-[3px]">
        <img src={logoUrl} alt={`${teamName} logo`} className="h-full w-full object-contain" />
      </div>
    );
  }

  const fallbackClass = fallbackTone === "home" ? "bg-blue-800 text-white" : "border-2 border-red-500 bg-white text-red-500";
  return (
    <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${fallbackClass}`}>
      {teamBadgeText(teamName)}
    </div>
  );
}

function FixtureScoreContent({ row }: { row: FixtureMatchRow }) {
  const score = parseScore(row.scoreLabel);

  if (row.tone === "live") {
    return (
      <div className="flex flex-col items-center">
        <span className="text-sm font-black tracking-tighter text-slate-800">{score || "0 - 0"}</span>
        <span className="text-[9px] font-bold text-red-400">{row.statusDetail || "EN VIVO"}</span>
      </div>
    );
  }

  if (row.tone === "final") {
    return (
      <div className="flex flex-col items-center">
        <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">FINAL</span>
        <span className="text-sm font-black tracking-tighter text-slate-800">{score || "0 - 0"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <span className="mb-0.5 block text-[10px] font-bold uppercase text-slate-400">VS</span>
      <span className="text-sm font-black tracking-tighter text-slate-800">{parseTime(row)}</span>
    </div>
  );
}

export default function FixturePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { toggleTheme } = useTheme();
  const [periods, setPeriods] = useState<FechaOption[]>([]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [periodLabel, setPeriodLabel] = useState("-");
  const [cards, setCards] = useState<FixtureDateCardType[]>([]);
  const [filter, setFilter] = useState<FixtureFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const fixtureCacheRef = useRef<Map<string, FixturePayload>>(new Map());
  const { loading: authLoading, authenticated, user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();
  usePageBenchmark("fixture", loading);

  const selectionOptions = useMemo<SelectionOption[]>(
    () =>
      memberships.map((membership) => ({
        groupId: membership.groupId,
        groupName: membership.groupName,
        role: membership.role,
        leagueId: membership.leagueId,
        leagueName: membership.leagueName,
        season: membership.season,
        competitionKey: membership.competitionKey,
        competitionName: membership.competitionName,
        competitionStage: membership.competitionStage
      })),
    [memberships]
  );

  const activeSelection = useMemo(
    () => selectionOptions.find((option) => option.groupId === activeGroupId) || selectionOptions[0] || null,
    [selectionOptions, activeGroupId]
  );

  const period = periods[periodIndex]?.id || "";
  const currentSelection = activeSelection;

  useEffect(() => {
    if (!authLoading && !authenticated) {
      router.replace("/auth");
    }
  }, [authLoading, authenticated, router]);

  useEffect(() => {
    if (!activeSelection) {
      setPeriods([]);
      setPeriodIndex(0);
      return;
    }

    const leagueId = activeSelection.leagueId;
    const season = activeSelection.season;
    const competitionStage = activeSelection.competitionStage || "general";

    let cancelled = false;

    async function loadFechas() {
      try {
        const response = await fetch(
          `/api/fechas?leagueId=${encodeURIComponent(String(leagueId))}&season=${encodeURIComponent(season)}&competitionStage=${encodeURIComponent(competitionStage)}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(`No se pudieron cargar las fechas (${response.status})`);
        }

        const payload = (await response.json()) as FechasPayload;
        if (cancelled) return;

        setPeriods(payload.fechas);
        const defaultIndex = payload.fechas.findIndex((fecha) => fecha.id === payload.defaultFecha);
        setPeriodIndex(defaultIndex >= 0 ? defaultIndex : 0);
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fechas.";
          setError(message);
          setPeriods([]);
          setPeriodIndex(0);
          showToast({ title: "Error al cargar fechas", description: message, tone: "error" });
        }
      }
    }

    void loadFechas();

    return () => {
      cancelled = true;
    };
  }, [activeSelection, showToast]);

  useEffect(() => {
    if (authLoading || !authenticated || !activeSelection || !period) {
      if (!period) {
        setCards([]);
        setPeriodLabel("Sin fechas disponibles");
      }
      return;
    }

    const groupId = activeSelection.groupId;
    const cacheKey = `${groupId}:${period}`;
    const cached = fixtureCacheRef.current.get(cacheKey);
    if (cached) {
      setError(null);
      setLoading(false);
      setPeriodLabel(cached.periodLabel || period);
      setCards(cached.cards);
      setUpdatedAt(cached.updatedAt);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/fixture?period=${encodeURIComponent(period)}&groupId=${encodeURIComponent(groupId)}`, {
          method: "GET",
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as FixturePayload;

        if (!cancelled) {
          fixtureCacheRef.current.set(cacheKey, payload);
          setPeriodLabel(payload.periodLabel || period);
          setCards(payload.cards);
          setUpdatedAt(payload.updatedAt);
        }
      } catch (fetchError) {
        if (!cancelled) {
          const message = fetchError instanceof Error ? fetchError.message : "No se pudo cargar el fixture.";
          setError(message);
          showToast({ title: "Error al cargar fixture", description: message, tone: "error" });
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
  }, [period, authLoading, authenticated, activeSelection, showToast]);

  const cardsByFilter = useMemo(() => filteredCards(cards, filter), [cards, filter]);
  const updatedLabel = useMemo(() => formattedUpdatedLabel(updatedAt), [updatedAt]);

  return (
    <AppShell activeTab="fixture" showTopGlow={false}>
      <div className="relative min-h-full bg-slate-50">
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
                onClick={toggleTheme}
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
                className="flex h-9 w-9 items-center justify-center rounded-full bg-lime-100 text-sm font-bold text-lime-700"
                aria-label="Perfil"
              >
                {initialsFromLabel(user?.name || "FC")}
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-lime-400 p-1.5 text-white">
              <CalendarDays size={18} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Fixture</h2>
            <span className="ml-auto text-sm font-medium text-slate-400">Partidos por fecha</span>
          </div>
        </header>

        <main className="mt-6 no-scrollbar">
          <section className="space-y-4 px-4 pb-6 no-scrollbar">
            {memberships.length > 0 ? (
              <>
                <div className="relative rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <p className="mb-1 ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">SELECCION ACTUAL</p>
                  <button
                    type="button"
                    onClick={() => setSelectorOpen(true)}
                    className="w-full rounded-lg bg-slate-50 p-3 text-left transition-colors hover:bg-slate-100"
                    aria-label="Cambiar selección"
                  >
                    <span className="flex items-center justify-between">
                      <span className="flex min-w-0 items-center gap-2 pr-2 text-sm font-bold text-slate-800">
                        <Trophy size={16} className="flex-shrink-0 text-lime-600" />
                        <span className="truncate">{selectionLabel(currentSelection)}</span>
                      </span>
                      <ChevronDown size={16} className="flex-shrink-0 text-slate-400" />
                    </span>
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setPeriodIndex((value) => (value - 1 + Math.max(1, periods.length)) % Math.max(1, periods.length))}
                    aria-label="Fecha anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600"
                    disabled={periods.length === 0}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div className="text-center">
                    <h3 className="text-base font-black text-lime-600">{periodLabel}</h3>
                    <p className="text-[10px] font-medium text-slate-400">{updatedLabel}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periods.length))}
                    aria-label="Fecha siguiente"
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-slate-600"
                    disabled={periods.length === 0}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="w-full rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                  <div className="grid grid-cols-4 gap-1">
                    {(Object.keys(filterLabels) as FixtureFilter[]).map((key) => {
                      const selected = filter === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFilter(key)}
                          className={`h-7 w-full whitespace-nowrap rounded-lg px-2 text-[11px] font-bold ${
                            selected ? "bg-lime-300 text-slate-900" : "text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {filterLabels[key]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">No tenés grupos activos.</p>
                <p className="mt-1 text-xs text-slate-500">Creá o uníte a un grupo para ver el fixture.</p>
                <Link href="/configuracion" className="mt-3 inline-flex rounded-xl bg-lime-400 px-4 py-2 text-xs font-bold text-slate-900">
                  Ir a grupos
                </Link>
              </div>
            )}

            <div className={`space-y-4 transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
              {loading
                ? Array.from({ length: 3 }).map((_, index) => <SkeletonBlock key={`fixture-skeleton-${index}`} className="h-[170px] w-full rounded-3xl" />)
                : cardsByFilter.map((card, index) => (
                    <div key={`${card.dateLabel}-${index}-${filter}`} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                      <div className="border-b border-slate-50 px-5 py-3">
                        <h4 className="font-black text-slate-800">{card.dateLabel}</h4>
                      </div>

                      <div className="divide-y divide-slate-50">
                        {card.rows.map((row, rowIndex) => (
                          <div key={`${row.home}-${row.away}-${row.kickoffAt || rowIndex}`} className="group flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                            <div className="flex min-w-0 flex-1 items-center gap-3">
                              <TeamLogo logoUrl={row.homeLogoUrl} teamName={row.home} fallbackTone="home" />
                              <span className="truncate text-xs font-bold text-slate-800">{row.home}</span>
                            </div>

                            <div className="flex-shrink-0 px-2 text-center">
                              <FixtureScoreContent row={row} />
                            </div>

                            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
                              <span className="truncate text-right text-xs font-bold text-slate-800">{row.away}</span>
                              <TeamLogo logoUrl={row.awayLogoUrl} teamName={row.away} fallbackTone="away" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </div>

            {memberships.length > 0 && !loading && cardsByFilter.length === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">No hay partidos disponibles para este filtro.</p>
            ) : null}

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-500">{error}</p> : null}
          </section>
        </main>

        <GroupSelectorModal
          open={selectorOpen}
          options={selectionOptions}
          activeGroupId={currentSelection?.groupId || null}
          onSelect={setActiveGroupId}
          onClose={() => setSelectorOpen(false)}
        />
      </div>
    </AppShell>
  );
}
