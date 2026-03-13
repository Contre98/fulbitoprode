import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { notificationsRepository } from "@/repositories";

// Expo Go (SDK 53+) no longer supports push notifications at all.
// We must avoid even importing expo-notifications in Expo Go.
const isExpoGo = Constants.appOwnership === "expo";

async function getExpoPushToken(): Promise<string | null> {
  if (isExpoGo) {
    console.log("[push] Skipping — push notifications not supported in Expo Go");
    return null;
  }

  // Dynamic imports so expo-notifications is never loaded in Expo Go
  const Notifications = await import("expo-notifications");
  const Device = await import("expo-device");

  if (!Device.isDevice) {
    console.log("[push] Skipping token registration — not a physical device");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("[push] Permission not granted");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: projectId || undefined
  });

  return tokenData.data;
}

/**
 * Hook: registers the device push token with the API after login.
 * Call once from the authenticated app root.
 * No-ops silently in Expo Go.
 */
export function useRegisterPushToken() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current || isExpoGo) return;

    (async () => {
      try {
        const token = await getExpoPushToken();
        if (!token) return;

        await notificationsRepository.registerDeviceToken({
          token,
          platform: Platform.OS
        });

        registered.current = true;
        console.log("[push] Token registered:", token.slice(0, 20) + "...");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("[push] Token registration failed:", message);
      }
    })();
  }, []);
}
