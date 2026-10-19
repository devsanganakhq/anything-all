import React, { useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Heart, MessageCircle, Share2 } from "lucide-react-native";
import { Colors } from "@/constants/theme";

export function ReactionBar({
  post,
  onReact,
  onLongReact,
  onComment,
  onShare,
}) {
  const reacted = post.user_reaction;
  const total = post.reaction_count || 0;
  const commentCount = post.comment_count || 0;
  const heartScale = useRef(new Animated.Value(1)).current;

  const handleReact = () => {
    Animated.sequence([
      Animated.timing(heartScale, {
        toValue: 1.35,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    onReact();
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
        gap: 2,
      }}
    >
      {/* Like */}
      <TouchableOpacity
        onPress={handleReact}
        delayLongPress={380}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 4,
          paddingRight: 12,
        }}
      >
        <Animated.View style={{ transform: [{ scale: heartScale }] }}>
          <Heart
            size={20}
            color={reacted ? "#E53935" : Colors.textSecondary}
            fill={reacted ? "#E53935" : "transparent"}
            strokeWidth={1.8}
          />
        </Animated.View>
        {total > 0 && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: reacted ? "#E53935" : Colors.textSecondary,
            }}
          >
            {total}
          </Text>
        )}
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity
        onPress={onComment}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 4,
          paddingRight: 12,
        }}
      >
        <MessageCircle
          size={20}
          color={Colors.textSecondary}
          strokeWidth={1.8}
        />
        {commentCount > 0 && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: Colors.textSecondary,
            }}
          >
            {commentCount}
          </Text>
        )}
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        onPress={onShare}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 4,
        }}
      >
        <Share2 size={19} color={Colors.textSecondary} strokeWidth={1.8} />
      </TouchableOpacity>

      <View style={{ flex: 1 }} />
    </View>
  );
}
