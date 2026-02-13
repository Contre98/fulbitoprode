import type { ReactNode } from "react";
import type { AppTab } from "@/lib/types";
import { BottomNav } from "@/components/layout/BottomNav";

interface AppShellProps {
  activeTab: AppTab;
  children: ReactNode;
}

export function AppShell({ activeTab, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-black text-[var(--text-primary)]">
      <div className="relative mx-auto min-h-screen w-full max-w-[469px] bg-[var(--bg-body)]">
        <main className="pb-[76px]">{children}</main>
        <BottomNav activeTab={activeTab} />
      </div>
    </div>
  );
}
