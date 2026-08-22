import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { Colors, Spacing } from "@/constants/theme";
import { PRIVACY_POLICY_HTML } from "@/data/privacyPolicyHtml";

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ChevronLeft color={Colors.green} size={24} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "700",
            color: Colors.textPrimary,
          }}
        >
          Privacy & Security
        </Text>
      </View>
      <WebView
        originWhitelist={["*"]}
        source={{ html: PRIVACY_POLICY_HTML }}
        style={{ flex: 1, backgroundColor: Colors.ivory }}
      />
    </View>
  );
}
