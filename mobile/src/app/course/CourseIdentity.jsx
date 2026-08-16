import React from "react";
import { View, Text, Linking, TouchableOpacity } from "react-native";
import { Star, MapPin, Users, Globe } from "lucide-react-native";
import { Colors, Spacing, Radius } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
} from "@/utils/courseDisplayName";

export function StatStrip({ label, value, noBorder }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 14,
        borderLeftWidth: noBorder ? 0 : 1,
        borderLeftColor: "rgba(245,241,235,0.15)",
      }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "800",
          color: Colors.ivory,
          letterSpacing: -0.5,
        }}
      >
        {typeof value === "number" ? value.toLocaleString() : value}
      </Text>
      <Text
        style={{
          fontSize: 7,
          fontWeight: "700",
          letterSpacing: 0.8,
          color: "rgba(245,241,235,0.5)",
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function CourseIdentity({
  course,
  rating,
  reviews,
  followerCount,
  listCount,
}) {
  const { title, subtitle } = courseDisplayName(course);
  const location = formatCourseLocation(course, { includeCounty: true });
  const par = course.par == null || course.par === "" ? "—" : course.par;
  const holes = course.holes == null || course.holes === "" ? "—" : course.holes;
  const onLists = listCount ?? 0;
  const website = course.website
    ? course.website.startsWith("http")
      ? course.website
      : `https://${course.website}`
    : null;

  return (
    <View
      style={{
        paddingHorizontal: Spacing.screenH,
        paddingTop: 22,
        paddingBottom: 4,
      }}
    >
      {/* Community rating row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {rating > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={13}
                color={Colors.gold}
                fill={s <= Math.round(rating) ? Colors.gold : "transparent"}
                strokeWidth={1.5}
              />
            ))}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: Colors.textPrimary,
                marginLeft: 3,
              }}
            >
              {rating.toFixed(1)}
            </Text>
          </View>
        )}
        {reviews.length > 0 && (
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
          </Text>
        )}
        {followerCount > 0 && (
          <>
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>·</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Users size={11} color={Colors.textMuted} strokeWidth={1.8} />
              <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                {followerCount.toLocaleString()}{" "}
                {followerCount === 1 ? "follower" : "followers"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Club first; distinct course name below */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "300",
          fontStyle: "italic",
          color: Colors.textPrimary,
          lineHeight: 34,
          marginBottom: subtitle ? 4 : 8,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: Colors.textSecondary,
            marginBottom: 8,
          }}
        >
          {subtitle}
        </Text>
      ) : null}

      {/* Location */}
      {location ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginBottom: 20,
          }}
        >
          <MapPin color={Colors.textMuted} size={13} strokeWidth={1.8} />
          <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
            {location}
          </Text>
        </View>
      ) : null}

      {/* Stats strip */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: Colors.green,
          borderRadius: Radius.lg,
          overflow: "hidden",
          marginBottom: 20,
        }}
      >
        <StatStrip label="PLAYED" value={course.played_count ?? 0} noBorder />
        <StatStrip label="ON LISTS" value={onLists} />
        <StatStrip label="PAR" value={par} />
        <StatStrip label="HOLES" value={holes} />
      </View>
      {website ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(website)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: Colors.greenLight,
            borderRadius: Radius.md,
          }}
        >
          <Globe size={16} color={Colors.green} strokeWidth={1.8} />
          <Text
            style={{ flex: 1, fontSize: 13, fontWeight: "600", color: Colors.green }}
            numberOfLines={1}
          >
            Visit website
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
