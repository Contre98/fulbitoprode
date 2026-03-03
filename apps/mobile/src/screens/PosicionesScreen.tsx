import { EmptyState } from "@/components/EmptyState";
import { ScreenFrame } from "@/components/ScreenFrame";

export function PosicionesScreen() {
  return (
    <ScreenFrame title="Posiciones" subtitle="Tabla del grupo y métricas clave">
      <EmptyState title="Posiciones en progreso" description="La tabla del grupo se conecta en el próximo slice." />
    </ScreenFrame>
  );
}
