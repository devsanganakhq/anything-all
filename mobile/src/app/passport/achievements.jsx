import React from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Award } from "lucide-react-native";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function AchievementsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const targetId = Number(userId);
  const otherUser = Number.isSafeInteger(targetId) && targetId > 0;
  const query = useQuery({
    queryKey: ["passport-achievements", otherUser ? targetId : "self"],
    queryFn: async () => {
      const response = await fetch(otherUser ? `/api/social/profile/${targetId}` : "/api/user/passport-stats");
      const result = await response.json();
      if (!response.ok || result.profile?.private) throw Error("This Passport is private");
      return result.achievements || [];
    },
  });
  return <View style={{ flex: 1, backgroundColor: Colors.ivory, paddingTop: insets.top }}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back to Passport" onPress={() => router.back()}
      style={{ paddingHorizontal: Spacing.screenH, paddingVertical: 15 }}>
      <Text style={{ color: Colors.green, fontWeight: "700" }}>← Passport</Text>
    </TouchableOpacity>
    <Text style={{ paddingHorizontal: Spacing.screenH, fontSize: 26, fontWeight: "700", color: Colors.textPrimary, marginBottom: 16 }}>Achievements</Text>
    {query.isLoading ? <ActivityIndicator color={Colors.green} /> : query.isError ?
      <TouchableOpacity onPress={() => query.refetch()} style={{ padding: Spacing.screenH }}>
        <Text style={{ color: Colors.textSecondary }}>Unable to load achievements. Tap to retry.</Text>
      </TouchableOpacity> :
      <ScrollView contentContainerStyle={{ paddingHorizontal: Spacing.screenH, paddingBottom: insets.bottom + 30 }}>
        {query.data.filter(a => a.unlocked_at).length === 0 &&
          <Text style={{ color: Colors.textSecondary }}>No achievements unlocked yet.</Text>}
        {query.data.filter(a => a.unlocked_at).map(a =>
          <View key={a.slug} style={{ backgroundColor: Colors.white, borderRadius: Radius.md,
            borderWidth: 1, borderColor: Colors.border, padding: 16, marginBottom: 10,
            flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Award color={Colors.green} size={24} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.textPrimary, fontSize: 16, fontWeight: "700" }}>{a.name}</Text>
              {!!a.description && <Text style={{ color: Colors.textSecondary, marginTop: 3 }}>{a.description}</Text>}
            </View>
          </View>)}
      </ScrollView>}
  </View>;
}
