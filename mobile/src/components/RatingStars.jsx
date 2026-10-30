import React from "react";
import { View } from "react-native";
import { Star } from "lucide-react-native";
import { Colors } from "@/constants/theme";
export function RatingStars({ rating, size = 15, color = Colors.gold }) {
  const value = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <View
      accessibilityLabel={`${value.toFixed(1)} out of 5 stars`}
      style={{ flexDirection: "row", gap: 3 }}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={{ width: size, height: size }}>
          <Star size={size} color={color} strokeWidth={1.5} />
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: size * Math.min(1, Math.max(0, value - i)),
              height: size,
              overflow: "hidden",
            }}
          >
            <Star size={size} color={color} fill={color} strokeWidth={1.5} />
          </View>
        </View>
      ))}
    </View>
  );
}
