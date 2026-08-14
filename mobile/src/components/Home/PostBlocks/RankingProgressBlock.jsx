import React from "react";
import { View, Text } from "react-native";
import { Trophy } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";

export function RankingProgressBlock({ post, md }) {
  const pct = Math.min(100, Math.max(0, parseInt(md.progress_pct || 0)));
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: Colors.goldLight,
        borderRadius: Radius.xl,
        borderWidth: 1,
        borderColor: "rgba(201,168,76,0.25)",
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Trophy color={Colors.gold} size={16} strokeWidth={1.8} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "800",
            letterSpacing: 0.8,
            color: Colors.gold,
          }}
        >
          {(md.list_name || "RANKING LIST").toUpperCase()}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          gap: 4,
          marginBottom: 10,
        }}
      >
        <Text
          style={{ fontSize: 34, fontWeight: "800", color: Colors.textPrimary }}
        >
          {md.completed || 0}
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary }}>
          / {md.total || 100} courses
        </Text>
      </View>
      <View
        style={{
          height: 7,
          backgroundColor: "rgba(0,0,0,0.08)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${pct}%`,
            backgroundColor: Colors.gold,
            borderRadius: 4,
          }}
        />
      </View>
      <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 6 }}>
        {pct}% complete
      </Text>
    </View>
  );
}
