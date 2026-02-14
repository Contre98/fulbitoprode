"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { GroupCardCarousel } from "@/components/home/GroupCardCarousel";
import { FixtureDateCard } from "@/components/fixture/FixtureDateCard";
import { SkeletonBlock } from "@/components/ui/SkeletonBlock";
import { useAuthSession } from "@/lib/use-auth-session";
import type { FixtureDateCard as FixtureDateCardType, GroupCard } from "@/lib/types";

interface HomePayload {
  groupCards: GroupCard[];
  liveCards: FixtureDateCardType[];
  updatedAt: string;
}

export function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupCards, setGroupCards] = useState<GroupCard[]>([]);
  const [liveCards, setLiveCards] = useState<FixtureDateCardType[]>([]);
  const { user, memberships, activeGroupId, setActiveGroupId } = useAuthSession();

  useEffect(() => {
    if (memberships.length === 0) {
      setGroupCards([]);
      setLiveCards([]);
      setLoading(false);
      return;
    }

    const targetGroupId = activeGroupId || memberships[0].groupId;
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

        setGroupCards(payload.groupCards);
        setLiveCards(payload.liveCards);
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "No se pudieron cargar los datos de inicio.");
          setGroupCards([]);
          setLiveCards([]);
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
  }, [activeGroupId, memberships]);

  return (
    <AppShell activeTab="inicio">
      <TopHeader title="Inicio" userLabel={user?.name || "USER"} />
      {memberships.length > 0 ? (
        <GroupCardCarousel cards={groupCards} activeGroupId={activeGroupId} onActiveCardChange={setActiveGroupId} />
      ) : null}

      <section className="flex flex-col gap-4 px-5 pt-[10px] pb-0">
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-white">Próximos Partidos</h2>
        </header>

        <div className="h-px w-full bg-[var(--bg-surface)]" />

        {memberships.length === 0 ? (
          <div className="rounded-[10px] border border-[var(--border-dim)] bg-[#0b0b0d] p-4">
            <p className="text-[13px] font-semibold text-white">No tenés grupos activos.</p>
            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Creá o uníte a un grupo para empezar.</p>
            <Link href="/configuracion" className="mt-3 inline-flex rounded-[8px] bg-[var(--accent)] px-3 py-1.5 text-[11px] font-bold text-black">
              Ir a grupos
            </Link>
          </div>
        ) : null}

        {memberships.length > 0 ? (
          <div className={`space-y-[10px] transition-opacity ${loading ? "opacity-70" : "opacity-100"}`}>
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={`home-skeleton-${index}`} className="h-[132px] w-full" />
                ))
              : liveCards.map((card) => <FixtureDateCard key={card.dateLabel} card={card} />)}
          </div>
        ) : null}

        {memberships.length > 0 && !loading && liveCards.length === 0 ? (
          <p className="text-[11px] font-medium text-[var(--text-secondary)]">No hay partidos próximos en este momento.</p>
        ) : null}

        {error ? <p className="text-[11px] font-medium text-red-400">{error}</p> : null}
      </section>
    </AppShell>
  );
}
