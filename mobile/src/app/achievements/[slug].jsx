import React from "react";
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Award } from "lucide-react-native";
import { Colors } from "@/constants/theme";
export default function AchievementDetail() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["passport-stats"],
    queryFn: async () => {
      const r = await fetch("/api/user/passport-stats");
      if (!r.ok) throw new Error("Could not load achievement");
      return r.json();
    },
  });
  const achievement = data?.achievements?.find(a => a.slug === slug);
  return <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: Colors.ivory }}>
    <TouchableOpacity accessibilityLabel="Back" onPress={() => router.back()} style={{ padding: 20 }}><ArrowLeft color={Colors.green} /></TouchableOpacity>
    <View style={{ padding: 28, alignItems: "center" }}>
      {isLoading ? <ActivityIndicator color={Colors.green} /> : isError ? <TouchableOpacity onPress={() => refetch()}><Text>Could not load achievement. Tap to retry.</Text></TouchableOpacity> : <>
        <Award size={64} color={Colors.green} />
        <Text style={{ fontSize: 24, color: Colors.textPrimary, marginTop: 24 }}>{achievement?.name || "Achievement unavailable"}</Text>
        <Text style={{ fontSize: 16, color: Colors.textSecondary, marginTop: 16, textAlign: "center" }}>{achievement?.description}</Text>
        {achievement && <Text style={{ color: Colors.green, marginTop: 16 }}>{achievement.unlocked_at ? "Unlocked" : "Not yet unlocked"}</Text>}
      </>}
    </View>
  </View>;
}
