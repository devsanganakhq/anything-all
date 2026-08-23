import { useAuth } from "@/utils/auth/useAuth";
import { AuthModal } from "@/utils/auth/useAuthModal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/queryClient";
import { PostHogAppShell } from "@/utils/PostHogAppShell";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initiate, isReady } = useAuth();

  useEffect(() => {
    initiate();
  }, [initiate]);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <PostHogAppShell>
            <Stack
              screenOptions={{ headerShown: false }}
              initialRouteName="index"
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="auth/personalize" />
              <Stack.Screen name="auth/intro" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="explore/list"
                options={{ presentation: "card" }}
              />

              <Stack.Screen
                name="activity/mark-played"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen name="communities/index" />
              <Stack.Screen name="communities/[id]" />
              <Stack.Screen
                name="communities/create"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen name="friends/index" />
              <Stack.Screen name="friends/discover" />
              <Stack.Screen name="notifications/index" />
              <Stack.Screen
                name="feed/[postId]"
                options={{ presentation: "card" }}
              />
              <Stack.Screen name="profile/edit-club" />
              <Stack.Screen name="profile/edit" />
              <Stack.Screen name="profile/privacy" />
              <Stack.Screen
                name="passport/played"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="passport/wishlist"
                options={{ presentation: "card" }}
              />
              <Stack.Screen
                name="profile/edit-memberships"
                options={{ presentation: "modal" }}
              />
              <Stack.Screen
                name="social/[userId]"
                options={{ presentation: "card" }}
              />
            </Stack>
            <AuthModal />
          </PostHogAppShell>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
