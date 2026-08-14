import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/utils/auth/useAuth";

// ── Official Welcome Screen artwork — do NOT regenerate or replace ──
const ARTWORK_URI =
  "https://dtvoeevhaseb5.cloudfront.net/user-uploads/e30ce1d7-f3f9-466d-8641-919de79212af.png";

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isReady, signUp, signIn } = useAuth();

  // Authenticated users bypass this screen entirely
  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isReady, isAuthenticated]);

  if (!isReady || isAuthenticated) return null;

  // The artwork has "THE DIGITAL GOLF PASSPORT" baked in at the very bottom.
  // Push buttons up enough to sit evenly above that footer text.
  // footerReserve = home-indicator inset + ~80px for the footer label height + breathing room.
  const footerReserve = Math.max(insets.bottom, 16) + 80;

  return (
    <View style={{ flex: 1, backgroundColor: "#0e1e15" }}>
      <StatusBar style="light" />

      {/* Production artwork — fills screen edge-to-edge, nothing cropped */}
      <Image
        source={{ uri: ARTWORK_URI }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
        transition={200}
      />

      {/* ── Two real interactive buttons, sitting above the footer text ── */}
      <View
        style={{
          position: "absolute",
          left: 28,
          right: 28,
          bottom: footerReserve,
        }}
      >
        {/* CREATE ACCOUNT — dark green fill, gold border */}
        <TouchableOpacity
          onPress={() => signUp()}
          accessibilityRole="button"
          accessibilityLabel="Create a Heathland Links account"
          activeOpacity={0.82}
          style={{
            backgroundColor: "#1B3828",
            borderWidth: 1.5,
            borderColor: "#C9A84C",
            borderRadius: 6,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#F5F1EB",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2.6,
            }}
          >
            CREATE ACCOUNT
          </Text>
        </TouchableOpacity>

        {/* Explicit 14 px gap — buttons never touch or merge */}
        <View style={{ height: 14 }} />

        {/* LOG IN — transparent, cream outline */}
        <TouchableOpacity
          onPress={() => signIn()}
          accessibilityRole="button"
          accessibilityLabel="Log in to Heathland Links"
          activeOpacity={0.75}
          style={{
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: "rgba(245,241,235,0.65)",
            borderRadius: 6,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#F5F1EB",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2.6,
            }}
          >
            LOG IN
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
