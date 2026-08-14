import React from "react";
import { View, Text } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Spacing, Radius } from "@/constants/theme";

export function StatusBanner({ statusConfig }) {
  if (!statusConfig) return null;

  return (
    <View
      style={{
        marginHorizontal: Spacing.screenH,
        marginTop: 14,
        backgroundColor: statusConfig.bg,
        borderWidth: 1,
        borderColor: statusConfig.border,
        borderRadius: Radius.md,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <AlertTriangle size={13} color={statusConfig.text} strokeWidth={2} />
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 1,
          color: statusConfig.text,
        }}
      >
        {statusConfig.label}
      </Text>
    </View>
  );
}
