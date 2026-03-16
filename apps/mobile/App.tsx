import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getTheme } from "@fulbito/design-tokens";
import { AppNavigation } from "./src/navigation/AppNavigation";

const queryClient = new QueryClient();

function AppRoot() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === "dark" ? "dark" : "light");

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppNavigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return <AppRoot />;
}
