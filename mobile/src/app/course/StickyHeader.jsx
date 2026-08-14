import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { ArrowLeft, Share2 } from "lucide-react-native";
import { Colors, Spacing } from "@/constants/theme";
import { STICKY_HEADER_H } from "@/constants/courseConstants";

export function StickyHeader({
  insets,
  stickyHeaderOpacity,
  courseName,
  onBack,
  onShare,
}) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        opacity: stickyHeaderOpacity,
        backgroundColor: Colors.green,
        paddingTop: insets.top,
        height: insets.top + STICKY_HEADER_H,
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: Spacing.screenH,
        paddingBottom: 12,
        gap: 12,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ArrowLeft color={Colors.ivory} size={20} strokeWidth={2} />
      </TouchableOpacity>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "700",
          color: Colors.ivory,
          fontStyle: "italic",
        }}
        numberOfLines={1}
      >
        {courseName}
      </Text>
      <TouchableOpacity onPress={onShare}>
        <Share2 color={Colors.ivory} size={18} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
}
