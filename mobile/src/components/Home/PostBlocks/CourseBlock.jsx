import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Star, Trophy } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";
import { countryFlag } from "@/components/Home/utils";
import { THUMB_H } from "@/components/Home/constants";
import { formatCourseHolesPar } from "@/utils/courseDisplayName";
import { SHOW_RANKINGS } from "@/constants/courseConstants";

export function CourseBlock({ post, onCoursePress }) {
  const flag = countryFlag(post.course_country);
  const hasRanking =
    SHOW_RANKINGS && post.top_ranking_name && post.top_ranking_position;
  const holesPar = formatCourseHolesPar(
    { holes: post.course_holes, par: post.course_par },
    { compact: true },
  );

  return (
    <>
      {/* Course image */}
      {post.course_image_url && (
        <TouchableOpacity activeOpacity={0.92} onPress={onCoursePress}>
          <Image
            source={{ uri: post.course_image_url }}
            style={{ width: "100%", height: THUMB_H }}
            contentFit="cover"
          />
          {hasRanking && (
            <View
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "rgba(0,0,0,0.65)",
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: Radius.pill,
              }}
            >
              <Trophy size={11} color="#C9952A" strokeWidth={2} />
              <Text style={{ fontSize: 10, fontWeight: "800", color: "#fff" }}>
                #{post.top_ranking_position} {post.top_ranking_name}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Course name row */}
      <TouchableOpacity
        onPress={onCoursePress}
        activeOpacity={0.75}
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}
      >
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: Colors.textPrimary,
            lineHeight: 25,
          }}
        >
          {post.course_name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            marginTop: 3,
          }}
        >
          <Text style={{ fontSize: 13 }}>{flag}</Text>
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            {[post.course_county, post.course_country]
              .filter(Boolean)
              .join(", ")}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              marginLeft: 8,
            }}
          >
            <Text style={{ fontSize: 11, color: Colors.textMuted }}>
              {holesPar}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Rating stars */}
      {post.rating != null && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            paddingHorizontal: 16,
            paddingTop: 6,
            paddingBottom: 4,
          }}
        >
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={15}
              color="#C9952A"
              fill={s <= Math.round(post.rating) ? "#C9952A" : "transparent"}
              strokeWidth={1.5}
            />
          ))}
          <Text
            style={{
              fontSize: 13,
              fontWeight: "800",
              color: "#C9952A",
              marginLeft: 5,
            }}
          >
            {post.rating}/5
          </Text>
        </View>
      )}

      {/* Review excerpt */}
      {post.review_text && (
        <View
          style={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 }}
        >
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              lineHeight: 20,
              fontStyle: "italic",
            }}
            numberOfLines={3}
          >
            "{post.review_text}"
          </Text>
        </View>
      )}

      {/* Date played chip */}
      {post.date_played && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <Text style={{ fontSize: 11, color: Colors.textMuted }}>
            Played{" "}
            {new Date(post.date_played).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </View>
      )}
    </>
  );
}
