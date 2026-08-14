import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Camera, MapPin } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";
import { countryFlag } from "@/components/Home/utils";
import { SCREEN_W, CARD_PHOTO_H } from "@/components/Home/constants";

export function PhotosBlock({ post, onCoursePress }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const photos = post.photo_urls?.length
    ? post.photo_urls
    : post.primary_photo
      ? [post.primary_photo]
      : [];
  const scrollRef = useRef(null);

  if (!photos.length) return null;

  const isSingle = photos.length === 1;

  return (
    <>
      <View style={{ position: "relative" }}>
        {isSingle ? (
          <Image
            source={{ uri: photos[0] }}
            style={{ width: "100%", height: CARD_PHOTO_H }}
            contentFit="cover"
          />
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            onMomentumScrollEnd={(e) => {
              const newIdx = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_W,
              );
              setActiveIdx(newIdx);
            }}
          >
            {photos.map((url, i) => (
              <Image
                key={i}
                source={{ uri: url }}
                style={{ width: SCREEN_W, height: CARD_PHOTO_H }}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        )}

        {/* Photo count chip */}
        {photos.length > 1 && (
          <View
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderRadius: Radius.pill,
              paddingHorizontal: 9,
              paddingVertical: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Camera size={11} color="#fff" strokeWidth={2} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
              {activeIdx + 1} / {photos.length}
            </Text>
          </View>
        )}

        {/* Dot indicators */}
        {photos.length > 1 && (
          <View
            style={{
              position: "absolute",
              bottom: 12,
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
        )}
      </View>

      {/* Course tag under photos */}
      {post.course_name && (
        <TouchableOpacity
          onPress={onCoursePress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            padding: 12,
            paddingHorizontal: 16,
          }}
        >
          <MapPin size={13} color={Colors.textMuted} strokeWidth={1.8} />
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              fontWeight: "600",
            }}
          >
            {post.course_name}
          </Text>
          {post.course_country && (
            <Text style={{ fontSize: 13 }}>
              {countryFlag(post.course_country)}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Caption */}
      {post.caption && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              lineHeight: 21,
              fontStyle: "italic",
            }}
          >
            "{post.caption}"
          </Text>
        </View>
      )}
    </>
  );
}
