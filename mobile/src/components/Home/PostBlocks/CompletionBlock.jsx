import React from "react";
import { View, Text } from "react-native";
import { Colors, Radius } from "@/constants/theme";

export function CompletionBlock({ post, md }) {
  const isPassport = post.post_type === "passport_complete";
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 14,
        borderRadius: Radius.xl,
        overflow: "hidden",
        backgroundColor: isPassport ? Colors.green : "#1B3828",
        padding: 20,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text style={{ fontSize: 40 }}>{isPassport ? "🛂" : "🏆"}</Text>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "800",
              letterSpacing: 2,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 3,
            }}
          >
            {isPassport ? "PASSPORT COMPLETE" : "LIST COMPLETE"}
          </Text>
          <Text style={{ fontSize: 19, fontWeight: "800", color: "#fff" }}>
            {md.list_name || md.passport_name || "Challenge Complete!"}
          </Text>
          {md.total && (
            <Text
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                marginTop: 3,
              }}
            >
              All {md.total} courses played
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
