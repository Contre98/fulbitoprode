import { Text } from "react-native";
import { ScreenFrame } from "@/components/ScreenFrame";

export function PronosticosScreen() {
  return (
    <ScreenFrame title="Pronósticos" subtitle="Ingresa y guarda tus predicciones">
      <Text style={{ color: "#F9FAFB" }}>MVP mock: flujo de predicción en progreso.</Text>
    </ScreenFrame>
  );
}
