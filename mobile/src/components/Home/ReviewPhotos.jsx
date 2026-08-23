import React, { useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Camera } from "lucide-react-native";
import { Radius } from "@/constants/theme";
import { SCREEN_W, THUMB_H } from "@/components/Home/constants";

/** User photos attached to a review / played-course feed card */
export function ReviewPhotos({ urls = [] }) {
  const photos = (urls || []).filter(Boolean);
  const [activeIdx, setActiveIdx] = useState(0);

  if (!photos.length) return null;

  if (photos.length === 1) {
    return (
      <View style={{ position: "relative", marginBottom: 4 }}>
        <Image
          source={{ uri: photos[0] }}
          style={{ width: "100%", height: THUMB_H }}
          contentFit="cover"
        />
      </View>
    );
  }

  return (
    <View style={{ position: "relative", marginBottom: 4 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        onMomentumScrollEnd={(e) => {
          setActiveIdx(
            Math.round(e.nativeEvent.contentOffset.x / SCREEN_W),
          );
        }}
      >
        {photos.map((url, i) => (
          <Image
            key={`${url}-${i}`}
            source={{ uri: url }}
            style={{ width: SCREEN_W, height: THUMB_H }}
            contentFit="cover"
          />
        ))}
      </ScrollView>

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
          {activeIdx + 1} / {photos.length}
        </Text>
      </View>

      <View
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "center",
          gap: 5,
        }}
      >
        {photos.map((_, i) => (
          <View
            key={i}
            style={{
              width: i === activeIdx ? 14 : 5,
              height: 5,
              borderRadius: 3,
              backgroundColor:
                i === activeIdx ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          />
        ))}
      </View>
    </View>
  );
}
