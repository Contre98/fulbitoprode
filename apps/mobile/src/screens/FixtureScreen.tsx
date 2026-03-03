import { Text } from "react-native";
import { ScreenFrame } from "@/components/ScreenFrame";

export function FixtureScreen() {
  return (
    <ScreenFrame title="Fixture" subtitle="Partidos por fecha y resultados">
      <Text style={{ color: "#F9FAFB" }}>MVP mock: calendario de partidos.</Text>
    </ScreenFrame>
  );
}
