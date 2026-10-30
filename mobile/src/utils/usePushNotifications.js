import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useAuthStore } from "@/utils/auth/store";
import { queryClient } from "@/utils/queryClient";
let registeredToken = null;
export function safeNotificationPath(path) {
  if (typeof path !== "string") return null;
  return /^\/(?:course|feed|social|communities|lists)\/\d+(?:\?(?:tab=(?:CHAT|REQUESTS)|postId=\d+(?:&openComments=1)?|openComments=1))?$/.test(path)
    || /^\/achievements\/[a-z0-9-]+$/.test(path)
    || path === "/friends" || path === "/(tabs)/passport" ? path : null;
}
export async function detachPushToken() {
  const token = registeredToken;
  registeredToken = null;
  if (token)
    try {
      await fetch("/api/user/push-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(5000),
      });
    } catch {}
}
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export function usePushNotifications() {
  const user = useAuthStore((s) => s.auth?.user);
  useEffect(() => {
    if (!user || !Device.isDevice || Platform.OS === "web") return;
    let cancelled = false;
    let registering = false;
    async function register() {
      if (registering) return;
      registering = true;
      try {
        if (Platform.OS === "android")
          await Notifications.setNotificationChannelAsync("default", {
            name: "Heathland Links",
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        let permission = await Notifications.getPermissionsAsync();
        if (permission.canAskAgain && permission.status !== "granted")
          permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) {
          console.warn("[Push] Notification permission is not granted");
          return;
        }
        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;
        if (!projectId) {
          console.warn("[Push] Expo project ID is missing");
          return;
        }
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        if (cancelled || useAuthStore.getState().auth?.user?.id !== user.id)
          return;
        const r = await fetch("/api/user/push-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) {
          console.warn("[Push] Backend rejected device registration", r.status);
          return;
        }
        registeredToken = token;
      } catch (error) {
        // Log only provider error codes; never log device tokens or credentials.
        console.warn("[Push] Registration failed", error?.code || "RegistrationUnavailable");
        /* Retry on the next foreground transition after offline/provider failure. */
      } finally {
        registering = false;
      }
    }
    register();
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        register();
      }
    });
    const received = Notifications.addNotificationReceivedListener(() =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    );
    const open = (response) => {
      const path = safeNotificationPath(
        response?.notification?.request?.content?.data?.path,
      );
      if (path) {
        router.push(path);
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    };
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!cancelled) open(response);
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      cancelled = true;
      appState.remove();
      received.remove();
      tapped.remove();
    };
  }, [user?.id]);
}
