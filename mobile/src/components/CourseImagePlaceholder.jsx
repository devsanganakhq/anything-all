/**
 * CourseImagePlaceholder — Heathland Links
 *
 * Default club/course banner when no approved photo is available.
 * Real club banners always win; this only renders when those are missing.
 * The default photo sits behind the same name / location text as before.
 *
 * Props:
 *   courseName         string   — displayed course name
 *   county             string?  — county / region
 *   country            string?  — country
 *   height             number   — container height (default 220)
 *   style              object?  — additional View style overrides
 *   compact            boolean  — minimal layout for small cards / thumbnails
 *   contentBottomInset number   — lifts text above overlapping hero chrome
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

export const DEFAULT_COURSE_BANNER = require("../../assets/images/default-course-banner.jpg");

export function CourseImagePlaceholder({
  courseName = "Golf Course",
  county,
  country,
  height = 220,
  style,
  compact = false,
  contentBottomInset = 0,
}) {
  const locationStr = [county, country].filter(Boolean).join(", ");
  const basePad = compact ? 10 : 16;

  return (
    <View
      style={[
        {
          height,
          overflow: "hidden",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          backgroundColor: "#0e1e15",
        },
        style,
      ]}
    >
      <Image
        source={DEFAULT_COURSE_BANNER}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        contentPosition="center"
        transition={200}
      />

      {/* Readability scrim over the photo */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(14,30,21,0.45)",
        }}
        pointerEvents="none"
      />

      {/* Bottom text block — same content as before */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: compact ? 12 : 18,
          paddingTop: compact ? 20 : 36,
          paddingBottom: basePad + contentBottomInset,
        }}
      >
        {!compact && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
            }}
          >
            <HeatherMark size={12} />
            <Text
              style={{
                fontSize: 8,
                fontWeight: "700",
                letterSpacing: 2,
                color: "rgba(245,241,235,0.55)",
              }}
            >
              HEATHLAND LINKS
            </Text>
          </View>
        )}

        <Text
          style={{
            fontSize: compact ? 13 : 22,
            fontWeight: "300",
            fontStyle: "italic",
            color: "rgba(245,241,235,0.95)",
            lineHeight: compact ? 17 : 28,
            marginBottom: compact ? 2 : 5,
          }}
          numberOfLines={compact ? 2 : 3}
        >
          {courseName}
        </Text>

        {locationStr.length > 0 && (
          <Text
            style={{
              fontSize: compact ? 9 : 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              color: "rgba(245,241,235,0.5)",
            }}
            numberOfLines={1}
          >
            {locationStr}
          </Text>
        )}
      </View>
    </View>
  );
}

function HeatherMark({ size = 14 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        backgroundColor: "rgba(201,168,76,0.7)",
        transform: [{ rotate: "45deg" }],
      }}
    />
  );
}

export default CourseImagePlaceholder;
