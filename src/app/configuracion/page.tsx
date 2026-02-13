import { BookOpen, ChevronRight, Settings, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";

const actions = [
  { label: "Configuración", icon: Settings },
  { label: "Reglas del Prode", icon: BookOpen }
] as const;

export default function ConfiguracionPage() {
  return (
    <AppShell activeTab="configuracion">
      <TopHeader title="Configuración" userLabel="USUARIO" />

      <section className="flex flex-col gap-[10px] px-5 pt-2">
        <h2 className="text-[17px] font-bold text-white">Perfil</h2>

        <div className="rounded-[10px] border border-[var(--border-dim)] bg-[#111214] p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[10px]">
              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)]">
                <UserRound size={18} className="text-[var(--text-secondary)]" strokeWidth={1.9} />
              </div>

              <div className="flex flex-col gap-0.5">
                <p className="text-[13px] font-bold text-[#f5f5f5]">Juan Pérez</p>
                <p className="text-[11px] font-medium text-[var(--text-secondary)]">Ver y editar mi perfil</p>
              </div>
            </div>

            <ChevronRight size={16} strokeWidth={1.9} className="text-[var(--accent)]" />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 px-5 pt-[10px]">
        <h2 className="text-[17px] font-bold text-white">Configuración y cuenta</h2>

        <div className="rounded-lg border border-[#373740] bg-[#0b0b0d] p-[10px]">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <div key={action.label}>
                <div className="flex items-center justify-between px-[2px] py-1">
                  <div className="flex items-center gap-2">
                    <Icon size={16} strokeWidth={1.9} className="text-[var(--text-primary)]" />
                    <span className="text-[13px] font-semibold tracking-[0px] text-[#f4f4f5]">{action.label}</span>
                  </div>
                  <ChevronRight size={14} strokeWidth={1.9} className="text-[var(--text-secondary)]" />
                </div>
                {index < actions.length - 1 ? <div className="my-[10px] h-px w-full bg-[#27272a]" /> : null}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] font-medium text-[var(--text-secondary)]">
          Administrá tu cuenta y conocé las reglas oficiales del torneo.
        </p>
      </section>
    </AppShell>
  );
}
