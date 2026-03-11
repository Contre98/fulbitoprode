import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { getTheme, setThemeName } from "@fulbito/design-tokens";
import { ThemePreferenceProvider, useThemePreference } from "./src/state/ThemePreferenceContext";
import { AppNavigation } from "./src/navigation/AppNavigation";

const queryClient = new QueryClient();

function AppRoot() {
  const { themeName } = useThemePreference();

  useEffect(() => {
    setThemeName(themeName);
  }, [themeName]);

  const theme = getTheme(themeName);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={themeName === "dark" ? "light" : "dark"} backgroundColor={theme.colors.background} />
          <AppNavigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function App() {
  return (
    <ThemePreferenceProvider>
      <AppRoot />
    </ThemePreferenceProvider>
  );
}
