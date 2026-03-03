import { EmptyState } from "@/components/EmptyState";
import { ScreenFrame } from "@/components/ScreenFrame";

export function FixtureScreen() {
  return (
    <ScreenFrame title="Fixture" subtitle="Partidos por fecha y resultados">
      <EmptyState title="Fixture en progreso" description="El calendario por fecha se implementa en el próximo slice." />
    </ScreenFrame>
  );
}
