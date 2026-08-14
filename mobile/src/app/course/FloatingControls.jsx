import React from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { ArrowLeft, Share2, Heart } from "lucide-react-native";
import { Spacing } from "@/constants/theme";
import { styles } from "./styles";

export function FloatingControls({
  insets,
  floatingCtrlOpacity,
  onBack,
  onShare,
  onWishlist,
  wishlisted,
  alreadyPlayed,
}) {
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + 10,
        left: Spacing.screenH,
        right: Spacing.screenH,
        flexDirection: "row",
        justifyContent: "space-between",
        zIndex: 20,
        opacity: floatingCtrlOpacity,
      }}
    >
      <TouchableOpacity
        onPress={onBack}
        style={styles.floatBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <ArrowLeft color="#FFF" size={20} strokeWidth={2} />
      </TouchableOpacity>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <TouchableOpacity onPress={onShare} style={styles.floatBtn}>
          <Share2 color="#FFF" size={18} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => !alreadyPlayed && onWishlist()}
          style={styles.floatBtn}
        >
          <Heart
            color="#FFF"
            size={19}
            strokeWidth={2}
            fill={wishlisted ? "#FFF" : "transparent"}
          />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
