import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/theme";

export default function IntroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.green }}>
      <StatusBar style="light" />
      <ImageBackground
        source={{
          uri: "https://images.unsplash.com/photo-1590732503206-89686008b49e?q=80&w=1200&auto=format&fit=crop",
        }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(27,56,40,0.55)", "rgba(27,56,40,0.82)", Colors.green]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <View
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 32,
        }}
      >
        {/* Logo Area */}
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          {/* Circular badge */}
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 1.5,
              borderColor: "rgba(245,241,235,0.35)",
              backgroundColor: "rgba(245,241,235,0.08)",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: 28,
            }}
          >
            {/* Simple heathland motif */}
            <Text style={{ fontSize: 44, lineHeight: 50 }}>⛳</Text>
          </View>

          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 4,
              color: Colors.ivory,
              marginBottom: 12,
              opacity: 0.9,
            }}
          >
            HEATHLAND LINKS
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: Colors.ivory,
              fontStyle: "italic",
              fontWeight: "300",
              opacity: 0.7,
              letterSpacing: 0.5,
            }}
          >
            Your Golf. Your Journey.
          </Text>
        </View>

        {/* Buttons */}
        <View style={{ gap: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.ivory,
              paddingVertical: 17,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={() => router.push("/auth/signup")}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                color: Colors.green,
              }}
            >
              CREATE ACCOUNT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              borderWidth: 1,
              borderColor: "rgba(245,241,235,0.4)",
              paddingVertical: 17,
              borderRadius: 6,
              alignItems: "center",
            }}
            onPress={() => router.replace("/(tabs)/home")}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                color: Colors.ivory,
                opacity: 0.85,
              }}
            >
              LOG IN
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
