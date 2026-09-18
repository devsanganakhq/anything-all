import React from "react";
import { View, Text } from "react-native";
import { Shadow, Colors } from "@/constants/theme";
import { POST_TYPE_META } from "./constants";
import { CardHeader } from "./CardHeader";
import { ActivityHeadline } from "./ActivityHeadline";
import { ReactionBar } from "./ReactionBar";
import { CardPhoto } from "./CardPhoto";
import { ReviewPhotos } from "./ReviewPhotos";
import { CourseBlock } from "./PostBlocks/CourseBlock";
import { WishlistBlock } from "./PostBlocks/WishlistBlock";
import { PhotosBlock } from "./PostBlocks/PhotosBlock";
import { AchievementBlock } from "./PostBlocks/AchievementBlock";
import { MilestoneBlock } from "./PostBlocks/MilestoneBlock";
import { RankingProgressBlock } from "./PostBlocks/RankingProgressBlock";
import { CompletionBlock } from "./PostBlocks/CompletionBlock";
import { ClubUpdateBlock } from "./PostBlocks/ClubUpdateBlock";
import { CommunityBlock } from "./PostBlocks/CommunityBlock";
import { GolfTripBlock } from "./PostBlocks/GolfTripBlock";
import { SHOW_RANKINGS } from "@/constants/courseConstants";

export function FeedCard({
  post,
  onReact,
  onLongReact,
  onComment,
  onShare,
  onMenu,
  onCoursePress,
}) {
  const meta = POST_TYPE_META[post.post_type] || POST_TYPE_META.played_course;
  const md = post.metadata || {};
  const isClub = post.post_type === "club_update";

  if (
    !SHOW_RANKINGS &&
    (post.post_type === "ranking_progress" ||
      post.post_type === "ranking_complete")
  ) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: Colors.white,
        marginBottom: 10,
        ...Shadow.card,
        overflow: "hidden",
      }}
    >
      {/* Club accent stripe */}
      {isClub && <View style={{ height: 3, backgroundColor: Colors.green }} />}

      {/* Header */}
      <CardHeader post={post} meta={meta} onMenu={onMenu} />

      {/* Activity headline */}
      <ActivityHeadline post={post} meta={meta} md={md} />

      {/* ── Type-specific bodies ── */}
      {(post.post_type === "played_course" || post.post_type === "review") && (
        <CourseBlock post={post} onCoursePress={onCoursePress} />
      )}
      {post.post_type === "wishlist" && (
        <WishlistBlock post={post} onCoursePress={onCoursePress} />
      )}
      {post.post_type === "photos" && (
        <PhotosBlock post={post} onCoursePress={onCoursePress} />
      )}
      {post.post_type === "achievement" && (
        <AchievementBlock post={post} md={md} />
      )}
      {post.post_type === "milestone" && <MilestoneBlock post={post} md={md} />}
      {SHOW_RANKINGS && post.post_type === "ranking_progress" && (
        <RankingProgressBlock post={post} md={md} />
      )}
      {((SHOW_RANKINGS && post.post_type === "ranking_complete") ||
        post.post_type === "passport_complete") && (
        <CompletionBlock post={post} md={md} />
      )}
      {post.post_type === "club_update" && (
        <ClubUpdateBlock post={post} md={md} />
      )}
      {post.post_type === "community_discussion" && (
        <CommunityBlock post={post} md={md} />
      )}
      {post.post_type === "golf_trip" && <GolfTripBlock post={post} md={md} />}

      {/* Caption (for types that don't embed it) */}
      {post.caption &&
        ![
          "club_update",
          "community_discussion",
          "golf_trip",
          "photos",
        ].includes(post.post_type) && (
          <View
            style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 }}
          >
            <Text
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                lineHeight: 22,
                fontStyle: "italic",
              }}
            >
              "{post.caption}"
            </Text>
          </View>
        )}

      {/* Review / played-course user photos (attached with the round) */}
      {(post.post_type === "review" || post.post_type === "played_course") &&
        (post.photo_urls?.length > 0 || post.primary_photo) && (
          <ReviewPhotos
            urls={
              post.photo_urls?.length
                ? post.photo_urls
                : [post.primary_photo]
            }
          />
        )}

      {/* Primary photo (for other non-photo types that have one) */}
      {post.primary_photo &&
        !["photos", "golf_trip", "review", "played_course"].includes(
          post.post_type,
        ) && <CardPhoto url={post.primary_photo} count={post.photo_count} />}

      {/* Reaction bar */}
      <ReactionBar
        post={post}
        onReact={() => onReact(post)}
        onLongReact={() => onLongReact(post.id)}
        onComment={onComment}
        onShare={() => onShare(post)}
      />
    </View>
  );
}
