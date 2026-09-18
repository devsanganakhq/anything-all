import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Trophy } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";
import { countryFlag } from "@/components/Home/utils";
import { SHOW_RANKINGS } from "@/constants/courseConstants";

export function WishlistBlock({ post, onCoursePress }) {
  const flag = countryFlag(post.course_country);
  return (
    <TouchableOpacity
      onPress={onCoursePress}
      style={{
        marginHorizontal: 16,
        marginBottom: 12,
        backgroundColor: Colors.purpleLight,
        borderRadius: Radius.lg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.purpleBorder,
      }}
    >
      {post.course_image_url ? (
        <Image
          source={{ uri: post.course_image_url }}
          style={{ width: "100%", height: 140 }}
          contentFit="cover"
        />
      ) : null}
      <View style={{ padding: 12 }}>
        <Text
          style={{ fontSize: 17, fontWeight: "800", color: Colors.textPrimary }}
        >
          {post.course_name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 3,
          }}
        >
          <Text style={{ fontSize: 13 }}>{flag}</Text>
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            {[post.course_county, post.course_country]
              .filter(Boolean)
              .join(", ")}
          </Text>
        </View>
        {SHOW_RANKINGS && post.top_ranking_name && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 6,
            }}
          >
            <Trophy size={11} color={Colors.gold} />
            <Text
              style={{ fontSize: 11, fontWeight: "700", color: Colors.gold }}
            >
              #{post.top_ranking_position} {post.top_ranking_name}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
