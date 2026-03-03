import { Pressable, Text } from "react-native";
import { ScreenFrame } from "@/components/ScreenFrame";
import { useAuth } from "@/state/AuthContext";

export function ConfiguracionScreen() {
  const { logout } = useAuth();
  return (
    <ScreenFrame title="Configuración" subtitle="Perfil y ajustes principales">
      <Pressable onPress={() => void logout()} style={{ backgroundColor: "#1F2937", padding: 12, borderRadius: 10 }}>
        <Text style={{ color: "#F9FAFB", fontWeight: "700" }}>Cerrar sesión</Text>
      </Pressable>
    </ScreenFrame>
  );
}
