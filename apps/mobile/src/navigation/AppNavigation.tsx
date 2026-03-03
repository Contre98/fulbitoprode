import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { PeriodProvider } from "@/state/PeriodContext";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { PronosticosScreen } from "@/screens/PronosticosScreen";
import { PosicionesScreen } from "@/screens/PosicionesScreen";
import { FixtureScreen } from "@/screens/FixtureScreen";
import { ConfiguracionScreen } from "@/screens/ConfiguracionScreen";
import { GroupProvider } from "@/state/GroupContext";

const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Inicio" component={HomeScreen} />
      <Tabs.Screen name="Pronosticos" component={PronosticosScreen} />
      <Tabs.Screen name="Posiciones" component={PosicionesScreen} />
      <Tabs.Screen name="Fixture" component={FixtureScreen} />
      <Tabs.Screen name="Configuracion" component={ConfiguracionScreen} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0B1220" }}>
        <ActivityIndicator color="#22C55E" />
      </View>
    );
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <RootStack.Screen name="App" component={AppTabs} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthScreen} />
      )}
    </RootStack.Navigator>
  );
}

export function AppNavigation() {
  return (
    <AuthProvider>
      <GroupProvider>
        <PeriodProvider>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </PeriodProvider>
      </GroupProvider>
    </AuthProvider>
  );
}
