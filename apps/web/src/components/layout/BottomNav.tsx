import Link from "next/link";
import { Activity, CalendarDays, Home, List } from "lucide-react";
import type { AppTab } from "@/lib/types";

interface BottomNavProps {
  activeTab: AppTab | null;
}

interface NavTab {
  key: AppTab;
  label: string;
  href: string;
  icon: typeof Home;
}

const tabs: NavTab[] = [
  { key: "inicio", label: "Inicio", href: "/", icon: Home },
  { key: "posiciones", label: "Posiciones", href: "/posiciones", icon: List },
  { key: "pronosticos", label: "Pronósticos", href: "/pronosticos", icon: Activity },
  { key: "fixture", label: "Fixture", href: "/fixture", icon: CalendarDays }
];

export function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-40 grid grid-cols-4 items-center border-t border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 pb-6 no-scrollbar"
      aria-label="Navegación principal"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`flex w-full flex-col items-center gap-1 transition-colors ${
              isActive ? "text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <div className={isActive ? "rounded-lg bg-[var(--accent-soft)] p-1.5" : ""}>
              <Icon size={22} />
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
