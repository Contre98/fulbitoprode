import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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

const tabGlyphByName: Record<string, string> = {
  Inicio: "⌂",
  Posiciones: "≣",
  Pronosticos: "∿",
  Fixture: "▦",
  Grupos: "◍"
};

function TabGlyph({ routeName, focused }: { routeName: string; focused: boolean }) {
  return (
    <View style={[styles.tabIconWrap, focused ? styles.tabIconWrapActive : null]}>
      <Text style={[styles.tabIconGlyph, focused ? styles.tabIconGlyphActive : null]}>{tabGlyphByName[routeName] ?? "•"}</Text>
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused }) => <TabGlyph routeName={route.name} focused={focused} />,
        tabBarActiveTintColor: "#1F2937",
        tabBarInactiveTintColor: "#7A8698"
      })}
    >
      <Tabs.Screen name="Inicio" component={HomeScreen} />
      <Tabs.Screen name="Posiciones" component={PosicionesScreen} />
      <Tabs.Screen name="Pronosticos" component={PronosticosScreen} options={{ tabBarLabel: "Pronósticos" }} />
      <Tabs.Screen name="Fixture" component={FixtureScreen} />
      <Tabs.Screen name="Grupos" component={ConfiguracionScreen} />
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

const styles = StyleSheet.create({
  tabBar: {
    height: 78,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#D7DCE3",
    backgroundColor: "#F8FAFC"
  },
  tabItem: {
    paddingVertical: 2
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700"
  },
  tabIconWrap: {
    height: 24,
    width: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  tabIconWrapActive: {
    backgroundColor: "#E8EDCD"
  },
  tabIconGlyph: {
    fontSize: 14,
    color: "#7A8698"
  },
  tabIconGlyphActive: {
    color: "#1F2937"
  }
});
