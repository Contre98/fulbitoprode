import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { colors } from "@fulbito/design-tokens";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { PeriodProvider } from "@/state/PeriodContext";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { PronosticosScreen } from "@/screens/PronosticosScreen";
import { PosicionesScreen } from "@/screens/PosicionesScreen";
import { FixtureScreen } from "@/screens/FixtureScreen";
import { GroupProvider } from "@/state/GroupContext";
import { PendingInviteProvider } from "@/state/PendingInviteContext";

const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();

const tabGlyphByName: Record<string, string> = {
  Inicio: "⌂",
  Posiciones: "≣",
  Pronosticos: "∿",
  Fixture: "▦"
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary
      })}
    >
      <Tabs.Screen name="Inicio" component={HomeScreen} />
      <Tabs.Screen name="Posiciones" component={PosicionesScreen} />
      <Tabs.Screen name="Pronosticos" component={PronosticosScreen} options={{ tabBarLabel: "Pronósticos" }} />
      <Tabs.Screen name="Fixture" component={FixtureScreen} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
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
  const linking = useMemo(
    () => ({
      prefixes: ["fulbito://", "https://fulbito.prode", "https://fulbito.local"],
      config: {
        screens: {
          Auth: "auth",
          App: {
            screens: {
              Inicio: "",
              Posiciones: "posiciones",
              Pronosticos: "pronosticos",
              Fixture: "fixture"
            }
          },
        }
      }
    }),
    []
  ) as any;

  return (
    <AuthProvider>
      <PendingInviteProvider>
        <GroupProvider>
          <PeriodProvider>
            <NavigationContainer ref={navigationRef} linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </PeriodProvider>
        </GroupProvider>
      </PendingInviteProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
    backgroundColor: colors.surface
  },
  tabItem: {
    paddingVertical: 2
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "700"
  },
  tabIconWrap: {
    height: 28,
    width: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  tabIconWrapActive: {
    backgroundColor: colors.primaryAlpha16
  },
  tabIconGlyph: {
    fontSize: 20,
    color: colors.textSecondary
  },
  tabIconGlyphActive: {
    color: colors.primary
  }
});
