import React from "react";
import { View, Text } from "react-native";
import { Award } from "lucide-react-native";
import { Radius } from "@/constants/theme";

export function AchievementBlock({ post, md }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: Radius.xl,
        overflow: "hidden",
        backgroundColor: "#2D1B4E",
        padding: 20,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "rgba(201,168,76,0.2)",
            borderWidth: 2.5,
            borderColor: "#C9952A",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Award color="#C9952A" size={30} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 2,
              color: "rgba(201,168,76,0.8)",
              marginBottom: 4,
            }}
          >
            ACHIEVEMENT UNLOCKED
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#fff",
              lineHeight: 25,
            }}
          >
            {md.achievement_name || "New Achievement"}
          </Text>
          {md.achievement_desc && (
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.65)",
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              {md.achievement_desc}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
