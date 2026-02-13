import Link from "next/link";
import { CalendarDays, ListChecks, Rows3, Settings, Trophy } from "lucide-react";
import type { AppTab } from "@/lib/types";

interface BottomNavProps {
  activeTab: AppTab;
}

interface NavTab {
  key: AppTab;
  label: string;
  href: string;
  icon: typeof Trophy;
  center?: boolean;
}

const tabs: NavTab[] = [
  { key: "inicio", label: "Inicio", href: "/", icon: Trophy },
  { key: "posiciones", label: "Posiciones", href: "/posiciones", icon: Rows3 },
  { key: "pronosticos", label: "Pronósticos", href: "/pronosticos", icon: ListChecks, center: true },
  { key: "fixture", label: "Fixture", href: "/fixture", icon: CalendarDays },
  { key: "configuracion", label: "Configuración", href: "/configuracion", icon: Settings }
];

export function BottomNav({ activeTab }: BottomNavProps) {
  return (
    <nav className="absolute inset-x-0 bottom-0 h-[68px] border-t border-[var(--bg-surface)] bg-[var(--bg-body)] px-4 pt-2 pb-3">
      <ul className="flex h-full items-end justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          if (tab.center) {
            return (
              <li key={tab.key} className="w-16">
                <Link href={tab.href} className="flex flex-col items-center gap-1.5 transition-opacity hover:opacity-90">
                  <span
                    className={`flex h-[34px] w-[34px] items-center justify-center rounded-full border ${
                      isActive
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--bg-body)]"
                        : "border-[var(--text-secondary)] bg-[var(--bg-body)] text-[var(--text-secondary)]"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <span
                    className={`text-[10px] font-bold tracking-[0px] ${
                      isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          }

          return (
            <li key={tab.key} className="w-16">
              <Link href={tab.href} className="flex flex-col items-center gap-1 transition-opacity hover:opacity-90">
                <Icon
                  size={20}
                  className={isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"}
                  strokeWidth={1.9}
                />
                <span
                  className={`text-[10px] leading-none font-semibold tracking-[0px] ${
                    isActive ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
