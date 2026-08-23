/**
 * Feed post detail — opened from like/comment notifications.
 * Shows the post and optionally opens comments.
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react-native";
import { Colors, Spacing } from "@/constants/theme";
import { FeedCard } from "@/components/Home/FeedCard";
import { ReactionPicker } from "@/components/Home/ReactionPicker";
import { CommentsModal } from "@/components/Home/CommentsModal";

export default function FeedPostScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { postId, openComments } = useLocalSearchParams();
  const id = parseInt(Array.isArray(postId) ? postId[0] : postId, 10);
  const shouldOpenComments =
    openComments === "1" || openComments === "true";

  const [commentOpen, setCommentOpen] = useState(false);
  const [reactionPost, setReactionPost] = useState(null);
  const reactionAnim = useRef(new Animated.Value(0)).current;
  const openedOnce = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["feed-post", id],
    queryFn: async () => {
      const r = await fetch(`/api/feed/${id}`);
      if (!r.ok) throw new Error("Post not found");
      return r.json();
    },
    enabled: Number.isFinite(id) && id > 0,
  });

  const post = data?.post ?? null;

  useEffect(() => {
    if (post && shouldOpenComments && !openedOnce.current) {
      openedOnce.current = true;
      setCommentOpen(true);
    }
  }, [post, shouldOpenComments]);

  const openReactionPicker = useCallback(() => {
    setReactionPost(id);
    Animated.spring(reactionAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 12,
    }).start();
  }, [id, reactionAnim]);

  const closeReactionPicker = useCallback(() => {
    Animated.timing(reactionAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setReactionPost(null));
  }, [reactionAnim]);

  const reactMutation = useMutation({
    mutationFn: async ({ reaction }) => {
      const res = await fetch("/api/feed/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id, reaction }),
      });
      if (!res.ok) throw new Error("React failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feed-post", id] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      closeReactionPicker();
    },
    onError: () => closeReactionPicker(),
  });

  const handleQuickReact = useCallback(() => {
    if (!post) return;
    if (post.user_reaction) {
      reactMutation.mutate({ reaction: post.user_reaction });
    } else {
      reactMutation.mutate({ reaction: "like" });
    }
  }, [post, reactMutation]);

  const handleShare = useCallback(async () => {
    if (!post) return;
    try {
      const coursePart = post.course_name ? ` at ${post.course_name}` : "";
      await Share.share({
        message: `${post.author_name} on Heathland Links${coursePart}`,
        url: `https://heathlandlinks.com/feed/${post.id}`,
      });
    } catch {}
  }, [post]);

  return (
    <View style={{ flex: 1, backgroundColor: "#F0EDE7" }}>
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.greenLight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ChevronLeft color={Colors.green} size={20} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "300",
            fontStyle: "italic",
            color: Colors.textPrimary,
          }}
        >
          Post
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : isError || !post ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: Colors.textPrimary,
              textAlign: "center",
            }}
          >
            Post unavailable
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            This post may have been deleted or hidden.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{ marginTop: 20 }}
          >
            <Text style={{ color: Colors.green, fontWeight: "600" }}>
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingTop: 10,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <FeedCard
            post={post}
            onReact={handleQuickReact}
            onLongReact={openReactionPicker}
            onComment={() => setCommentOpen(true)}
            onShare={handleShare}
            onMenu={() =>
              Alert.alert("Post", undefined, [
                { text: "Cancel", style: "cancel" },
              ])
            }
            onCoursePress={() =>
              post.course_id && router.push(`/course/${post.course_id}`)
            }
          />
        </ScrollView>
      )}

      <ReactionPicker
        postId={reactionPost}
        onReact={(_postId, reaction) => reactMutation.mutate({ reaction })}
        onClose={closeReactionPicker}
        reactionAnim={reactionAnim}
      />

      {commentOpen && post && (
        <CommentsModal
          post={post}
          onClose={() => setCommentOpen(false)}
          queryClient={qc}
          filter="all"
        />
      )}
    </View>
  );
}
