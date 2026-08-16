/**
 * Map course preview card — shared by Explore map and filtered list maps.
 */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import {
  MapPin,
  Star,
  Heart,
  CheckCircle,
  X,
  ChevronRight,
} from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { CourseImagePlaceholder } from "@/components/CourseImagePlaceholder";
import { MARKER } from "@/components/ExploreMapShared";
import {
  courseDisplayName,
  formatCourseLocation,
  formatCourseShareLabel,
} from "@/utils/courseDisplayName";

export function MapCoursePreviewCard({
  course,
  onClose,
  onWishlist,
  wishlistPending = false,
  onMarkPlayed,
  playedPending = false,
  onViewCourse,
  style,
}) {
  if (!course) return null;

  const identity = courseDisplayName(course);
  const location = formatCourseLocation(course);

  return (
    <View
      style={[
        {
          backgroundColor: Colors.white,
          borderRadius: Radius.lg,
          overflow: "hidden",
          ...Shadow.float,
        },
        style,
      ]}
    >
      <View style={{ height: 110, backgroundColor: Colors.ivoryDeep }}>
        {course.resolved_thumbnail_url ? (
          <Image
            source={{ uri: course.resolved_thumbnail_url }}
            style={{ width: "100%", height: "100%" }}
            contentFit={
              course.media_display_type === "club_logo" ? "contain" : "cover"
            }
          />
        ) : (
          <CourseImagePlaceholder
            courseName={identity.title}
            county={course.county}
            country={course.country}
            height={110}
            compact
          />
        )}

        {course.user_played ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: MARKER.played.bg,
              borderRadius: Radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <CheckCircle size={11} color="#fff" strokeWidth={2.5} />
            <Text
              style={{
                fontSize: 9,
                fontWeight: "800",
                color: "#fff",
                letterSpacing: 0.5,
              }}
            >
              PLAYED
            </Text>
          </View>
        ) : null}

        {!course.user_played && course.user_wishlisted ? (
          <View
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              backgroundColor: MARKER.wishlisted.bg,
              borderRadius: Radius.pill,
              paddingHorizontal: 10,
              paddingVertical: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Heart size={11} color="#fff" fill="#fff" strokeWidth={2} />
            <Text
              style={{
                fontSize: 9,
                fontWeight: "800",
                color: "#fff",
                letterSpacing: 0.5,
              }}
            >
              SAVED
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={onClose}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <X size={14} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>

        {course.rankings?.[0] ? (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.56)",
              borderRadius: Radius.sm,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>
              #{course.rankings[0].position} {course.rankings[0].ranking_name}
            </Text>
          </View>
        ) : course.position ? (
          <View
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              backgroundColor: "rgba(0,0,0,0.56)",
              borderRadius: Radius.sm,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 9, fontWeight: "700", color: "#fff" }}>
              #{course.position}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14 }}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: "700",
            color: Colors.textPrimary,
            marginBottom: 2,
          }}
          numberOfLines={1}
        >
          {identity.title}
        </Text>
        {identity.subtitle ? (
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {identity.subtitle}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {location ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <MapPin
                color={Colors.textSecondary}
                size={11}
                strokeWidth={1.8}
              />
              <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                {location}
              </Text>
            </View>
          ) : null}
          {course.community_rating > 0 ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Star size={10} color={Colors.gold} fill={Colors.gold} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                {Number(course.community_rating).toFixed(1)}
              </Text>
            </View>
          ) : null}
          {course.course_type ? (
            <View
              style={{
                backgroundColor: Colors.ivoryDeep,
                borderRadius: Radius.sm,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  color: Colors.textMuted,
                }}
              >
                {course.course_type.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              if (course.user_played) return;
              onWishlist?.(course.id);
            }}
            disabled={course.user_played || wishlistPending}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: course.user_played
                ? Colors.ivoryDeep
                : course.user_wishlisted
                  ? MARKER.wishlisted.bg
                  : Colors.purpleLight,
              borderWidth: 1,
              borderColor: course.user_played
                ? Colors.border
                : course.user_wishlisted
                  ? MARKER.wishlisted.border
                  : Colors.purpleBorder,
              opacity: course.user_played ? 0.4 : wishlistPending ? 0.6 : 1,
            }}
          >
            {wishlistPending ? (
              <ActivityIndicator
                size="small"
                color={course.user_wishlisted ? "#fff" : Colors.purple}
              />
            ) : (
              <>
                <Heart
                  size={13}
                  color={course.user_wishlisted ? "#fff" : Colors.purple}
                  fill={course.user_wishlisted ? "#fff" : "transparent"}
                  strokeWidth={2}
                />
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "800",
                    letterSpacing: 1,
                    color: course.user_wishlisted ? "#fff" : Colors.purple,
                  }}
                >
                  {course.user_wishlisted ? "SAVED" : "SAVE"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (course.user_played) {
                Alert.alert(
                  "Already Played",
                  "You've already recorded a round at this course. You can update your review from the course page.",
                );
                return;
              }
              onMarkPlayed?.(course);
            }}
            disabled={playedPending}
            style={{
              flex: 1,
              paddingVertical: 11,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 6,
              backgroundColor: course.user_played
                ? MARKER.played.bg
                : Colors.green,
              opacity: playedPending ? 0.6 : 1,
            }}
          >
            {course.user_played ? (
              <CheckCircle size={13} color="#fff" strokeWidth={2.5} />
            ) : null}
            <Text
              style={{
                fontSize: 9,
                fontWeight: "800",
                letterSpacing: 1,
                color: Colors.ivory,
              }}
            >
              {course.user_played ? "PLAYED" : "MARK PLAYED"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onViewCourse?.(course)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 11,
              borderRadius: 6,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: Colors.ivoryDeep,
              borderWidth: 1,
              borderColor: Colors.border,
            }}
          >
            <ChevronRight
              color={Colors.textSecondary}
              size={16}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export function markPlayedHref(course) {
  return `/activity/mark-played?courseId=${course.id}&courseName=${encodeURIComponent(formatCourseShareLabel(course))}`;
}

export default MapCoursePreviewCard;
