import React from "react";
import { View, Text } from "react-native";
import { Colors, Radius } from "@/constants/theme";

export function MilestoneBlock({ post, md }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        backgroundColor: Colors.greenLight,
        borderRadius: Radius.xl,
        borderWidth: 1.5,
        borderColor: Colors.greenBorder,
        padding: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: Colors.green,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ fontSize: 26 }}>🏆</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: Colors.green,
            marginBottom: 3,
          }}
        >
          MILESTONE
        </Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.green }}>
          {md.milestone_count || md.count || "🎉"}
        </Text>
        <Text
          style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary }}
        >
          {md.headline || "courses played"}
        </Text>
      </View>
    </View>
  );
}
