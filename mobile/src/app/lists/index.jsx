import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CuratedLists } from "@/components/CuratedLists";
import { Colors, Spacing } from "@/constants/theme";

export default function ListsIndex() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory, paddingTop: insets.top + 12 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Explore"
        onPress={() => router.back()} style={{ paddingHorizontal: Spacing.screenH, paddingVertical: 12 }}>
        <Text style={{ color: Colors.green, fontWeight: "700" }}>← Explore</Text>
      </TouchableOpacity>
      <Text style={{ color: Colors.textPrimary, fontSize: 26, fontWeight: "700",
        paddingHorizontal: Spacing.screenH, marginVertical: 18 }}>Heathland Links Lists</Text>
      <CuratedLists scrollable />
    </View>
  );
}
