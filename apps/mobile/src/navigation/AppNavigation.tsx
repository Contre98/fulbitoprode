import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BottomTabBar, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { BottomTabBarButtonProps, BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { Linking } from "react-native";
import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@fulbito/design-tokens";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { AuthProvider, useAuth } from "@/state/AuthContext";
import { PeriodProvider } from "@/state/PeriodContext";
import { AuthScreen } from "@/screens/AuthScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { PronosticosScreen } from "@/screens/PronosticosScreen";
import { PosicionesScreen } from "@/screens/PosicionesScreen";
import { FixtureScreen } from "@/screens/FixtureScreen";
import { PerfilScreen } from "@/screens/PerfilScreen";
import { TerminosCondicionesScreen } from "@/screens/TerminosCondicionesScreen";
import { ReglasScreen } from "@/screens/ReglasScreen";
import { SugerenciasScreen } from "@/screens/SugerenciasScreen";
import { PoliticasPrivacidadScreen } from "@/screens/PoliticasPrivacidadScreen";
import { UnirseCrearGrupoScreen } from "@/screens/UnirseCrearGrupoScreen";
import { GroupProvider } from "@/state/GroupContext";
import { PendingInviteProvider } from "@/state/PendingInviteContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { GroupSelectorOverlayProvider, useGroupSelectorOverlay } from "@/state/GroupSelectorOverlayContext";
import { useRegisterPushToken } from "@/lib/pushNotifications";
import { usePendingInvite } from "@/state/PendingInviteContext";
import { parseInviteTokenFromUrl } from "@/lib/inviteDeepLink";
import { groupsRepository } from "@/repositories";
import { AppDialogProvider, useAppDialog } from "@/state/AppDialogContext";
import { NotificationsOverlayProvider } from "@/state/NotificationsOverlayContext";
import { NotificationsBubbleOverlay } from "@/components/NotificationsBubbleOverlay";

const RootStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>();
const TAB_INDICATOR_WIDTH = 18;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ICON_SPRING = {
  damping: 17,
  stiffness: 320,
  mass: 0.45
} as const;

const TAB_BUTTON_PRESS_IN_SPRING = {
  damping: 22,
  stiffness: 420,
  mass: 0.42
} as const;

const TAB_BUTTON_PRESS_OUT_SPRING = {
  damping: 18,
  stiffness: 340,
  mass: 0.45
} as const;

const TAB_INDICATOR_SPRING = {
  damping: 18,
  stiffness: 260,
  mass: 0.5
} as const;

const tabIconByName: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Inicio: { active: "home", inactive: "home-outline" },
  Posiciones: { active: "podium", inactive: "podium-outline" },
  Pronosticos: { active: "football", inactive: "football-outline" },
  Fixture: { active: "calendar", inactive: "calendar-outline" },
  Perfil: { active: "person", inactive: "person-outline" }
};

function TabIcon({ routeName, focused }: { routeName: string; focused: boolean }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(focused ? 1.06 : 1);
  const iconScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  useEffect(() => {
    const target = focused ? 1.06 : 1;
    if (reducedMotion) {
      scale.value = target;
      return;
    }
    scale.value = withSpring(target, TAB_ICON_SPRING);
  }, [focused, reducedMotion, scale]);

  const icons = tabIconByName[routeName];
  if (!icons) return null;
  const isCenter = routeName === "Pronosticos";

  if (isCenter) {
    return (
      <Animated.View style={iconScaleStyle}>
        <View style={[styles.centerTabButton, focused ? styles.centerTabButtonActive : styles.centerTabButtonIdle]}>
          <View style={[styles.centerTabInner, focused ? styles.centerTabInnerActive : styles.centerTabInnerIdle]}>
            <Ionicons
              name={focused ? icons.active : icons.inactive}
              size={24}
              color={focused ? colors.textInverse : colors.textSecondary}
            />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={iconScaleStyle}>
      <Ionicons
        name={focused ? icons.active : icons.inactive}
        size={22}
        color={focused ? colors.primary : colors.textSecondary}
      />
    </Animated.View>
  );
}

type AnimatedTabButtonPressableProps = Omit<BottomTabBarButtonProps, "onPressIn" | "onPressOut" | "style" | "ref">;

function AnimatedTabBarButton({ onPressIn, onPressOut, style, ...rest }: BottomTabBarButtonProps) {
  const reducedMotion = useReducedMotion();
  const pressScale = useSharedValue(1);
  const pressableProps = rest as AnimatedTabButtonPressableProps;
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  const handlePressIn = useCallback((event: GestureResponderEvent) => {
    onPressIn?.(event);
    if (reducedMotion) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(0.96, TAB_BUTTON_PRESS_IN_SPRING);
  }, [onPressIn, pressScale, reducedMotion]);

  const handlePressOut = useCallback((event: GestureResponderEvent) => {
    onPressOut?.(event);
    if (reducedMotion) {
      pressScale.value = 1;
      return;
    }
    pressScale.value = withSpring(1, TAB_BUTTON_PRESS_OUT_SPRING);
  }, [onPressOut, pressScale, reducedMotion]);

  return (
    <AnimatedPressable
      {...pressableProps}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, buttonAnimatedStyle]}
    />
  );
}

function AnimatedTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const reducedMotion = useReducedMotion();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  const tabCount = state.routes.length || 1;
  const tabWidth = barWidth > 0 ? barWidth / tabCount : 0;

  useEffect(() => {
    if (tabWidth <= 0) return;
    const target = state.index * tabWidth + (tabWidth - TAB_INDICATOR_WIDTH) / 2;
    if (reducedMotion) {
      indicatorX.value = target;
      return;
    }
    indicatorX.value = withSpring(target, TAB_INDICATOR_SPRING);
  }, [indicatorX, reducedMotion, state.index, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: tabWidth > 0 ? 1 : 0,
    transform: [{ translateX: indicatorX.value }]
  }));

  return (
    <View style={styles.tabBarHost} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
      <BottomTabBar state={state} descriptors={descriptors} navigation={navigation} insets={insets} />
      <Animated.View pointerEvents="none" style={[styles.activeTabIndicator, indicatorStyle]} />
    </View>
  );
}

function InviteLinkHandler() {
  const { setPendingInviteToken } = usePendingInvite();

  useEffect(() => {
    // Handle cold-start deep link (app opened from a link)
    Linking.getInitialURL().then((url) => {
      const token = parseInviteTokenFromUrl(url);
      if (token) setPendingInviteToken(token);
    });

    // Handle warm-start deep link (app already open)
    const sub = Linking.addEventListener("url", ({ url }) => {
      const token = parseInviteTokenFromUrl(url);
      if (token) setPendingInviteToken(token);
    });

    return () => sub.remove();
  }, []);

  return null;
}

function InviteAutoJoinHandler() {
  const { loading, isAuthenticated, refresh } = useAuth();
  const { pendingInviteToken, clearPendingInviteToken } = usePendingInvite();
  const dialog = useAppDialog();
  const joiningRef = useRef(false);

  useEffect(() => {
    const token = pendingInviteToken?.trim() || "";
    if (!token || loading || !isAuthenticated || joiningRef.current) {
      return;
    }

    joiningRef.current = true;
    void (async () => {
      try {
        const result = await groupsRepository.joinGroup({ codeOrToken: token });
        if (result.status === "joined") {
          await refresh();
        }
        await clearPendingInviteToken();
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo procesar la invitación.";
        const normalized = message.toLowerCase();
        const shouldClearToken =
          normalized.includes("invitación") ||
          normalized.includes("invite") ||
          normalized.includes("grupo") ||
          normalized.includes("member") ||
          normalized.includes("membres");

        if (shouldClearToken) {
          await clearPendingInviteToken();
        }
        dialog.alert("Invitación", message);
      } finally {
        joiningRef.current = false;
      }
    })();
  }, [pendingInviteToken, loading, isAuthenticated, refresh, clearPendingInviteToken, dialog]);

  return null;
}

function AppTabs() {
  const overlay = useGroupSelectorOverlay();
  useRegisterPushToken();
  return (
    <Tabs.Navigator
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenListeners={{
        tabPress: () => {
          if (overlay.visible) overlay.hide();
        }
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: route.name === "Pronosticos" ? styles.centerTabItem : styles.tabItem,
        tabBarIcon: ({ focused }) => <TabIcon routeName={route.name} focused={focused} />,
        tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        tabBarActiveTintColor: colors.primaryDeep,
        tabBarInactiveTintColor: colors.textSecondary
      })}
    >
      <Tabs.Screen name="Inicio" component={HomeScreen} />
      <Tabs.Screen name="Posiciones" component={PosicionesScreen} />
      <Tabs.Screen
        name="Pronosticos"
        component={PronosticosScreen}
        options={{
          tabBarLabel: "Pronósticos",
          tabBarActiveTintColor: colors.primary,
          tabBarLabelStyle: styles.centerTabLabel
        }}
      />
      <Tabs.Screen name="Fixture" component={FixtureScreen} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} />
    </Tabs.Navigator>
  );
}

function RootNavigator() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <RootStack.Screen name="App" component={AppTabs} />
          <RootStack.Screen name="TerminosCondiciones" component={TerminosCondicionesScreen} />
          <RootStack.Screen name="Reglas" component={ReglasScreen} />
          <RootStack.Screen name="Sugerencias" component={SugerenciasScreen} />
          <RootStack.Screen name="PoliticasPrivacidad" component={PoliticasPrivacidadScreen} />
          <RootStack.Screen name="UnirseCrearGrupo" component={UnirseCrearGrupoScreen} />
        </>
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
              Fixture: "fixture",
              Perfil: "perfil"
            }
          }
        }
      }
    }),
    []
  ) as any;

  return (
    <AuthProvider>
      <AppDialogProvider>
        <PendingInviteProvider>
          <InviteLinkHandler />
          <InviteAutoJoinHandler />
          <GroupProvider>
            <GroupSelectorOverlayProvider>
              <NotificationsOverlayProvider>
                <PeriodProvider>
                  <NavigationContainer ref={navigationRef} linking={linking}>
                    <RootNavigator />
                  </NavigationContainer>
                  <NotificationsBubbleOverlay />
                </PeriodProvider>
              </NotificationsOverlayProvider>
            </GroupSelectorOverlayProvider>
          </GroupProvider>
        </PendingInviteProvider>
      </AppDialogProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabBarHost: {
    position: "relative"
  },
  tabBar: {
    height: 90,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4
  },
  tabItem: {
    paddingVertical: 2,
    paddingHorizontal: 2
  },
  centerTabItem: {
    paddingVertical: 2
  },
  tabLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    marginTop: 1
  },
  centerTabLabel: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    marginTop: 1
  },
  centerTabButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -34,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  centerTabButtonActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.surface
  },
  centerTabButtonIdle: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle
  },
  centerTabInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  centerTabInnerActive: {
    backgroundColor: "rgba(0,0,0,0.08)"
  },
  centerTabInnerIdle: {
    backgroundColor: "transparent"
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 6,
    left: 0,
    width: TAB_INDICATOR_WIDTH,
    height: 3,
    borderRadius: 999,
    backgroundColor: colors.primary
  }
});
