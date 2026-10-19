import { RatingStars } from "@/components/RatingStars";
import React from "react";
import { View, Text, Linking, TouchableOpacity } from "react-native";
import { Star, MapPin, Users, Globe } from "lucide-react-native";
import { Colors, Spacing, Radius } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
  resolveCourseHoles,
  resolveCoursePar,
} from "@/utils/courseDisplayName";
import {
  CourseListLogo,
  resolveCourseLogoUrl,
} from "@/components/CourseListRow";

export function StatStrip({ label, value, noBorder, onPress }) {
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
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
    </TouchableOpacity>
  );
}

export function CourseIdentity({
  course,
  rating,
  reviews,
  followerCount,
  listCount,
  onPressReviews,
  onPressLists,
  reviewCount,
}) {
  const { title, subtitle } = courseDisplayName(course);
  const location = formatCourseLocation(course, { includeCounty: true });
  const par = resolveCoursePar(course);
  const holes = resolveCourseHoles(course);
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
        {(rating > 0 || reviews.length > 0) && (
          <TouchableOpacity
            onPress={onPressReviews}
            disabled={!onPressReviews}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            {rating > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <RatingStars rating={rating} size={13} />
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
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
              ({reviewCount ?? reviews.length}{" "}
              {(reviewCount ?? reviews.length) === 1 ? "review" : "reviews"})
            </Text>
          </TouchableOpacity>
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

      {/* Club logo + name */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <CourseListLogo
          url={resolveCourseLogoUrl(course)}
          label={title}
          size={72}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
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
          {location ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <MapPin color={Colors.textMuted} size={13} strokeWidth={1.8} />
              <Text
                style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}
                numberOfLines={2}
              >
                {location}
              </Text>
            </View>
          ) : null}
        </View>
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
        <StatStrip label="ROUNDS" value={course.played_count ?? 0} noBorder />
        <StatStrip label="ON LISTS" value={onLists} onPress={onPressLists} />
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
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: "600",
              color: Colors.green,
            }}
            numberOfLines={1}
          >
            Visit website
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
