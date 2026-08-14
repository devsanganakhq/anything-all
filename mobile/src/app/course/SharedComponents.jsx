import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

export function SectionLabel({ icon: Icon, label, gold }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 12,
      }}
    >
      <Icon
        color={gold ? Colors.gold : Colors.textSecondary}
        size={12}
        strokeWidth={1.8}
      />
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: Colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function EmptySection({ icon: Icon, title, body }) {
  return (
    <View
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        padding: 28,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 24,
      }}
    >
      <Icon size={28} color={Colors.textMuted} strokeWidth={1.4} />
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: Colors.textPrimary,
          marginTop: 12,
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: Colors.textSecondary,
          textAlign: "center",
          marginTop: 6,
          lineHeight: 19,
        }}
      >
        {body}
      </Text>
    </View>
  );
}
