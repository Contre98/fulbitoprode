"use client";

import { ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";
import { GroupCardCarousel } from "@/components/home/GroupCardCarousel";
import { LeagueSelector } from "@/components/home/LeagueSelector";
import { MatchCard } from "@/components/matches/MatchCard";
import type { GroupCard, MatchCardData } from "@/lib/types";
import { currentLeagueLabel, homeGroupCards, liveMatches } from "@/lib/mock-data";

interface HomeScreenProps {
  leagueLabel?: string;
  groupCards?: GroupCard[];
  matches?: MatchCardData[];
}

export function HomeScreen({
  leagueLabel = currentLeagueLabel,
  groupCards = homeGroupCards,
  matches = liveMatches
}: HomeScreenProps = {}) {
  return (
    <AppShell activeTab="inicio">
      <TopHeader title="Inicio" userLabel="USER" />
      <LeagueSelector label={leagueLabel} />
      <GroupCardCarousel cards={groupCards} />

      <section className="flex flex-col gap-4 px-5 pt-[10px] pb-0">
        <header className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-white">Partidos en vivo</h2>
          <button type="button" className="flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
            Ver todo
            <ChevronRight size={12} />
          </button>
        </header>

        <div className="h-px w-full bg-[var(--bg-surface)]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 6 },
            visible: {
              opacity: 1,
              y: 0,
              transition: {
                staggerChildren: 0.06,
                duration: 0.2
              }
            }
          }}
          className="space-y-4 pb-0"
        >
          {matches.map((match) => (
            <motion.div
              key={match.id}
              variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }}
              transition={{ duration: 0.2 }}
            >
              <MatchCard {...match} />
            </motion.div>
          ))}
        </motion.div>
      </section>
    </AppShell>
  );
}
