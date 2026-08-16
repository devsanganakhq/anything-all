/**
 * Course list row — course logo on the left, name + location beside it.
 */
import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Colors, Radius, Shadow } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
} from "@/utils/courseDisplayName";

const LOGO_SIZE = 52;

/** Prefer the club's own logo; never the Heathland Links app icon. */
export function resolveCourseLogoUrl(item) {
  if (!item) return null;
  if (item.official_logo_url) return item.official_logo_url;
  if (
    item.media_display_type === "club_logo" &&
    item.resolved_thumbnail_url
  ) {
    return item.resolved_thumbnail_url;
  }
  return null;
}

export function CourseListLogo({ url, label }) {
  const [failed, setFailed] = useState(false);
  const showRemote = Boolean(url) && !failed;
  const initial = (label || "G").trim().charAt(0).toUpperCase();

  return (
    <View
      style={{
        width: LOGO_SIZE,
        height: LOGO_SIZE,
        borderRadius: 12,
        backgroundColor: showRemote ? Colors.white : Colors.greenLight,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {showRemote ? (
        <Image
          source={{ uri: url }}
          style={{ width: LOGO_SIZE - 8, height: LOGO_SIZE - 8 }}
          contentFit="contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: Colors.green,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

export function CourseListRow({ item, onPress, showRating = false }) {
  const { title, subtitle } = courseDisplayName(item);
  const location =
    [item.county, item.country].filter(Boolean).join(", ") ||
    formatCourseLocation(item, { includeCounty: true });
  const logoUrl = resolveCourseLogoUrl(item);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={{
        backgroundColor: Colors.white,
        borderRadius: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        ...Shadow.card,
      }}
    >
      <View>
        <CourseListLogo url={logoUrl} label={title} />
        {item.position ? (
          <View
            style={{
              position: "absolute",
              top: -4,
              left: -4,
              backgroundColor: Colors.green,
              borderRadius: 8,
              minWidth: 22,
              paddingHorizontal: 5,
              paddingVertical: 2,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "800",
                color: Colors.ivory,
              }}
            >
              #{item.position}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: Colors.green,
            letterSpacing: -0.2,
          }}
          numberOfLines={2}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 12,
              color: Colors.textSecondary,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        {location ? (
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              marginTop: 3,
            }}
            numberOfLines={1}
          >
            {location}
          </Text>
        ) : null}
      </View>

      {showRating && item.community_rating > 0 ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: Colors.textPrimary,
            flexShrink: 0,
          }}
        >
          {Number(item.community_rating).toFixed(1)}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default CourseListRow;
