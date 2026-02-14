"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { AppTab } from "@/lib/types";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppShellProps {
  activeTab: AppTab;
  children: ReactNode;
}

export function AppShell({ activeTab, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="h-dvh overflow-hidden bg-black text-[var(--text-primary)]">
      <div className="relative mx-auto h-dvh w-full max-w-[469px] overflow-hidden bg-[var(--bg-body)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            className="h-full overflow-y-auto pb-[76px]"
            initial={{ opacity: 0.92 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.96 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {children}
          </motion.main>
        </AnimatePresence>
        <BottomNav activeTab={activeTab} />
      </div>
    </div>
  );
}
