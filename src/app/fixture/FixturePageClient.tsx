"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { CurrentSelectionSelector } from "@/components/home/CurrentSelectionSelector";
import { FixtureDateCard } from "@/components/fixture/FixtureDateCard";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import { usePageBenchmark } from "@/lib/use-page-benchmark";
import type { FechasPayload, FixtureDateCard as FixtureDateCardType, FixturePayload, SelectionOption } from "@/lib/types";

interface FechaOption {
  id: string;
  label: string;
}

export default function FixturePage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<FechaOption[]>([]);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [periodLabel, setPeriodLabel] = useState("-");
  const [cards, setCards] = useState<FixtureDateCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    () => selectionOptions.find((option) => option.groupId === activeGroupId) || null,
    [selectionOptions, activeGroupId]
  );

  const period = periods[periodIndex]?.id || "";

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
        if (cancelled) {
          return;
        }

        setPeriods(payload.fechas);
        const defaultIndex = payload.fechas.findIndex((fecha) => fecha.id === payload.defaultFecha);
        setPeriodIndex(defaultIndex >= 0 ? defaultIndex : 0);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar las fechas.");
          setPeriods([]);
          setPeriodIndex(0);
        }
      }
    }

    void loadFechas();

    return () => {
      cancelled = true;
    };
  }, [activeSelection]);

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
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/fixture?period=${encodeURIComponent(period)}&groupId=${encodeURIComponent(groupId)}`,
          {
            method: "GET",
            cache: "no-store"
          }
        );

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as FixturePayload;

        if (!cancelled) {
          fixtureCacheRef.current.set(cacheKey, payload);
          setPeriodLabel(payload.periodLabel || period);
          setCards(payload.cards);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar el fixture.");
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
  }, [period, authLoading, authenticated, activeSelection]);

  return (
    <AppShell activeTab="fixture">
      <TopHeader title="Fixture" userLabel={user?.name || "USER"} />
      <CurrentSelectionSelector options={selectionOptions} activeGroupId={activeGroupId} onChange={setActiveGroupId} />

      <section className="flex flex-col gap-3 px-5 pt-[10px]">
        {memberships.length === 0 ? (
          <div className="rounded-[6px] border border-[var(--border-dim)] bg-[#0b0b0d] p-4">
            <p className="text-[13px] font-semibold text-white">No tenés grupos activos.</p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Creá o uníte a un grupo para ver el fixture.</p>
            <Link href="/configuracion" className="mt-3 inline-flex rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-black">
              Ir a grupos
            </Link>
          </div>
        ) : null}

        {memberships.length > 0 ? (
          <div className="px-0 py-2">
            <div className="flex items-center justify-between rounded-full border border-[var(--border-light)] bg-[var(--bg-surface)] px-2.5 py-1">
              <button
                type="button"
                onClick={() => setPeriodIndex((value) => (value - 1 + Math.max(1, periods.length)) % Math.max(1, periods.length))}
                aria-label="Fecha anterior"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-dim)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]"
                disabled={periods.length === 0}
              >
                <ChevronLeft size={11} />
              </button>
              <span className="truncate px-2 text-[11px] font-bold tracking-[0.2px] text-[var(--accent)]">{periodLabel}</span>
              <button
                type="button"
                onClick={() => setPeriodIndex((value) => (value + 1) % Math.max(1, periods.length))}
                aria-label="Fecha siguiente"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-[#334400] bg-[var(--bg-surface-elevated)] text-[var(--accent)]"
                disabled={periods.length === 0}
              >
                <ChevronRight size={11} />
              </button>
            </div>
          </div>
        ) : null}

        <div className={`space-y-[10px] transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
          {loading
            ? Array.from({ length: 3 }).map((_, index) => (
                <SkeletonBlock key={`fixture-skeleton-${index}`} className="h-[156px] w-full" />
              ))
            : cards.map((card) => <FixtureDateCard key={card.dateLabel} card={card} />)}
        </div>

        {memberships.length > 0 && !loading && cards.length === 0 ? (
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">No hay partidos disponibles para esta fecha.</p>
        ) : null}

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>
    </AppShell>
  );
}
