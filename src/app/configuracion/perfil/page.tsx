import Link from "next/link";
import { PencilLine, UserRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TopHeader } from "@/components/layout/TopHeader";

const preferenceRows = [
  { key: "Nombre completo", value: "Juan Pérez" },
  { key: "Email", value: "juan.perez@gmail.com" },
  { key: "Equipo favorito", value: "Boca Juniors" },
  { key: "Privacidad", value: "Solo amigos" }
] as const;

export default function ConfiguracionPerfilPage() {
  return (
    <AppShell activeTab="configuracion">
      <TopHeader title="Configuración" userLabel="USUARIO" />

      <section className="flex flex-col gap-3 px-5 pt-[2px]">
        <Link
          href="/configuracion"
          className="rounded-[10px] border border-[var(--border-dim)] bg-[#111214] p-3 transition-opacity hover:opacity-90"
        >
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
            <span className="text-[19px] font-semibold leading-none text-[var(--accent)]">›</span>
          </div>
        </Link>
      </section>

      <section className="flex flex-col gap-3 px-5 pt-[18px]">
        <h2 className="text-[17px] font-bold text-white">Perfil</h2>
        <p className="text-[12px] font-medium text-[var(--text-secondary)]">
          Gestioná tu información personal y preferencias de cuenta.
        </p>

        <div className="rounded-[10px] border border-[var(--border-dim)] bg-[#090a0d] p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-[11px]">
              <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[var(--border-light)] bg-[var(--bg-surface-elevated)]">
                <UserRound size={27} className="text-[var(--text-secondary)]" strokeWidth={1.8} />
              </div>
              <div className="flex flex-col gap-0.5">
                <p className="text-[18px] font-bold text-[#f5f5f5]">Juan Pérez</p>
                <p className="text-[14px] font-medium text-[var(--text-secondary)]">juan.perez@gmail.com</p>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 rounded-[10px] border border-[var(--border-dim)] bg-[#111218] px-[13px] py-[8px] text-[16px] font-semibold text-[var(--text-primary)]"
            >
              <PencilLine size={16} />
              Editar
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full border border-[var(--border-dim)] bg-[#121217] px-[10px] py-[6px] text-[11px] font-semibold text-[var(--text-secondary)]">
              Participante desde 2024
            </span>
            <span className="rounded-full border border-[var(--border-dim)] bg-[#121217] px-[10px] py-[6px] text-[11px] font-semibold text-[var(--accent)]">
              Cuenta verificada
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3 px-5 pt-[16px]">
        <h2 className="text-[17px] font-bold text-white">Datos y preferencias</h2>

        <div className="overflow-hidden rounded-[10px] border border-[var(--border-dim)] bg-[#090a0d] p-[0_12px]">
          {preferenceRows.map((row, index) => (
            <div key={row.key}>
              <div className="flex items-center justify-between py-3">
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">{row.key}</span>
                <span className="text-[12px] font-semibold text-[#f5f5f5]">{row.value}</span>
              </div>
              {index < preferenceRows.length - 1 ? <div className="h-px w-full bg-[#242428]" /> : null}
            </div>
          ))}
        </div>

        <p className="text-[11px] font-medium text-[var(--text-muted)]">Tus cambios se aplican al instante en el torneo.</p>

        <button
          type="button"
          className="h-12 rounded-[12px] bg-[var(--accent)] text-[16px] font-bold text-[var(--bg-body)] transition-transform active:scale-[0.995]"
        >
          Guardar cambios
        </button>

        <button
          type="button"
          className="h-12 rounded-[12px] border border-[var(--border-dim)] bg-[#111214] text-[16px] font-semibold text-[var(--text-secondary)] transition-opacity hover:opacity-90"
        >
          Cerrar sesión
        </button>
      </section>
    </AppShell>
  );
}
