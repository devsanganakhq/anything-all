import React from "react";
import { View, Text } from "react-native";
import { Colors } from "@/constants/theme";
import { SHOW_RANKINGS } from "@/constants/courseConstants";

export function ActivityHeadline({ post, meta, md }) {
  const first =
    post.author_first_name || (post.author_name || "").split(" ")[0];

  let headline = null;
  const name = post.course_name || md.course_name;

  if (post.post_type === "played_course")
    headline = `${first} played ${name || "a new course"}.`;
  else if (post.post_type === "wishlist")
    headline = `${first} added ${name || "a course"} to their wish list.`;
  else if (post.post_type === "review")
    headline = `${first} reviewed ${name || "a course"}.`;
  else if (post.post_type === "photos")
    headline = `${first} uploaded ${post.photo_count > 1 ? `${post.photo_count} photos` : "a photo"}${name ? ` from ${name}` : ""}.`;
  else if (post.post_type === "achievement")
    headline = `${first} unlocked ${md.achievement_name || "a new achievement"}.`;
  else if (post.post_type === "milestone")
    headline = `${first} ${md.headline || "reached a milestone"}`;
  else if (SHOW_RANKINGS && post.post_type === "ranking_progress")
    headline = `${first} is making progress through ${md.list_name || "a ranking list"}.`;
  else if (SHOW_RANKINGS && post.post_type === "ranking_complete")
    headline = `${first} completed ${md.list_name || "a ranking list"}!`;
  else if (post.post_type === "passport_complete")
    headline = `${first} completed the ${md.passport_name || "Passport Challenge"}!`;
  else if (post.post_type === "club_update")
    return null; // Club has its own header
  else if (post.post_type === "community_discussion") return null;
  else if (post.post_type === "golf_trip")
    headline = `${first} is planning a golf trip.`;

  if (!headline) return null;
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: Colors.textPrimary,
          lineHeight: 23,
        }}
      >
        {headline}
      </Text>
    </View>
  );
}
