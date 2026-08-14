import React from "react";
import { View, Text } from "react-native";
import { Star, MapPin, Users } from "lucide-react-native";
import { Colors, Spacing, Radius } from "@/constants/theme";

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

export function CourseIdentity({ course, rating, reviews, followerCount }) {
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

      {/* Course name */}
      <Text
        style={{
          fontSize: 28,
          fontWeight: "300",
          fontStyle: "italic",
          color: Colors.textPrimary,
          lineHeight: 34,
          marginBottom: 4,
        }}
      >
        {course.name}
      </Text>

      {/* Club name */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: Colors.textSecondary,
          marginBottom: 8,
        }}
      >
        {course.club_name}
      </Text>

      {/* Location */}
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
          {[course.city, course.county, course.country]
            .filter(Boolean)
            .join(", ")}
        </Text>
      </View>

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
        <StatStrip label="ON LISTS" value={course.wishlist_count ?? 0} />
        <StatStrip label="PAR" value={course.par ?? 72} />
        <StatStrip label="HOLES" value={course.holes ?? 18} />
      </View>
    </View>
  );
}
