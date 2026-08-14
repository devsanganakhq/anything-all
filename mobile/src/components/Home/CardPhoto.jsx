import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Camera } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";
import { THUMB_H } from "@/components/Home/constants";

export function CardPhoto({ url, count }) {
  return (
    <View style={{ position: "relative" }}>
      <Image
        source={{ uri: url }}
        style={{ width: "100%", height: THUMB_H }}
        contentFit="cover"
      />
      {count > 1 && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(0,0,0,0.58)",
            borderRadius: Radius.pill,
            paddingHorizontal: 9,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Camera size={11} color="#fff" />
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}
