"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { AppTab } from "@/lib/types";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppShellProps {
  activeTab: AppTab | null;
  children: ReactNode;
  showTopGlow?: boolean;
}

export function AppShell({ activeTab, children, showTopGlow = true }: AppShellProps) {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  return (
    <div className="h-dvh overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="relative mx-auto h-dvh w-full max-w-[469px] overflow-hidden bg-[var(--bg-app)]">
        {showTopGlow ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_0%_0%,var(--accent-soft),transparent_62%)]" />
        ) : null}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            className="relative h-dvh overflow-y-auto px-0 pb-[calc(92px+env(safe-area-inset-bottom,0px))]"
            initial={reducedMotion ? undefined : { opacity: 0.95, y: 6 }}
            animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0.98, y: 4 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <BottomNav activeTab={activeTab} />
      </div>
    </div>
  );
}
