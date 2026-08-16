/**
 * Home — Heathland Links Activity Feed
 *
 * Premium social feed inspired by Strava. Shows content from:
 *   • Accepted friends
 *   • Followed golfers
 *   • Golf clubs & communities the user follows
 *   • Achievements & milestones
 *
 * Infinite scroll · Pull-to-refresh · Optimistic reactions · Comments
 */
import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  Alert,
  Animated,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
} from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Colors, TAB_BAR_CLEARANCE } from "@/constants/theme";
import { fetchFeedPage } from "@/components/Home/api";
import { FeedHeader } from "@/components/Home/FeedHeader";
import { FeedCard } from "@/components/Home/FeedCard";
import { ReactionPicker } from "@/components/Home/ReactionPicker";
import { CommentsModal } from "@/components/Home/CommentsModal";
import {
  EmptyState,
  LoadingState,
  ErrorState,
  FeedCardSkeleton,
} from "@/components/Home/FeedStates";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const listRef = useRef(null);

  const [filter, setFilter] = useState("all");
  const [commentPost, setCommentPost] = useState(null);
  const [reactionPost, setReactionPost] = useState(null);
  const reactionAnim = useRef(new Animated.Value(0)).current;

  // User greeting
  const { data: profileData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const r = await fetch("/api/user/profile");
      if (!r.ok) throw new Error("Profile failed");
      return r.json();
    },
    staleTime: 300_000,
  });
  const firstName = profileData?.profile?.first_name || "Golfer";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await fetch("/api/user/notifications");
      if (!r.ok) throw new Error("Notifications failed");
      return r.json();
    },
    refetchInterval: 60_000,
  });
  const hasUnread = (notifData?.unread_count ?? 0) > 0;

  // Feed query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["feed", filter],
    queryFn: ({ pageParam }) => fetchFeedPage({ pageParam, filter }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: filter !== "clubs",
  });

  const posts = useMemo(
    () =>
      filter === "clubs" ? [] : (data?.pages.flatMap((p) => p.posts) ?? []),
    [data, filter],
  );

  // ── Reaction picker animation ────────────────────────────────────────────
  const openReactionPicker = useCallback(
    (postId) => {
      setReactionPost(postId);
      Animated.spring(reactionAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 12,
      }).start();
    },
    [reactionAnim],
  );

  const closeReactionPicker = useCallback(() => {
    Animated.timing(reactionAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => setReactionPost(null));
  }, [reactionAnim]);

  // ── Reactions (optimistic) ──────────────────────────────────────────────
  const reactMutation = useMutation({
    mutationFn: async ({ postId, reaction }) => {
      const res = await fetch("/api/feed/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reaction }),
      });
      if (!res.ok) throw new Error("React failed");
      return res.json();
    },
    onMutate: async ({ postId, reaction }) => {
      await qc.cancelQueries({ queryKey: ["feed", filter] });
      const prev = qc.getQueryData(["feed", filter]);
      qc.setQueryData(["feed", filter], (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => {
              if (p.id !== postId) return p;
              const wasReacted = p.user_reaction === reaction;
              const delta = wasReacted ? -1 : 1;
              return {
                ...p,
                user_reaction: wasReacted ? null : reaction,
                reaction_count: (p.reaction_count || 0) + delta,
                like_count:
                  reaction === "like"
                    ? (p.like_count || 0) + delta
                    : p.like_count,
                love_count:
                  reaction === "love"
                    ? (p.love_count || 0) + delta
                    : p.love_count,
                celebrate_count:
                  reaction === "celebrate"
                    ? (p.celebrate_count || 0) + delta
                    : p.celebrate_count,
              };
            }),
          })),
        };
      });
      return { prev };
    },
    onError: (_, __, ctx) => {
      if (ctx?.prev) qc.setQueryData(["feed", filter], ctx.prev);
    },
    onSettled: () => closeReactionPicker(),
  });

  // ── Hide post ────────────────────────────────────────────────────────────
  const hideMutation = useMutation({
    mutationFn: async (postId) => {
      await fetch("/api/feed/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed", filter] }),
  });

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (postId) => {
      await fetch(`/api/feed/${postId}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feed", filter] }),
  });

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleQuickReact = useCallback(
    (post) => {
      if (post.user_reaction) {
        reactMutation.mutate({ postId: post.id, reaction: post.user_reaction });
      } else {
        reactMutation.mutate({ postId: post.id, reaction: "like" });
      }
    },
    [reactMutation],
  );

  const handlePostMenu = useCallback(
    (post) => {
      if (!post) return;
      const userId = profileData?.profile?.id;
      const isOwn = post.author_id === userId;
      Alert.alert("Post Options", undefined, [
        isOwn
          ? {
              text: "Delete Post",
              style: "destructive",
              onPress: () =>
                Alert.alert("Delete Post", "Remove this from your feed?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate(post.id),
                  },
                ]),
            }
          : { text: "Hide Post", onPress: () => hideMutation.mutate(post.id) },
        {
          text: "Report",
          style: "destructive",
          onPress: () =>
            Alert.alert("Report Post", "Why are you reporting this?", [
              { text: "Spam", onPress: () => submitReport(post.id, "spam") },
              {
                text: "Inappropriate",
                onPress: () => submitReport(post.id, "inappropriate"),
              },
              {
                text: "Harassment",
                onPress: () => submitReport(post.id, "harassment"),
              },
              { text: "Cancel", style: "cancel" },
            ]),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [hideMutation, deleteMutation, profileData],
  );

  const submitReport = useCallback(async (postId, reason) => {
    try {
      await fetch("/api/feed/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason }),
      });
      Alert.alert("Reported", "Thank you. Our team will review this.");
    } catch {}
  }, []);

  const handleShare = useCallback(async (post) => {
    try {
      const coursePart = post.course_name ? ` at ${post.course_name}` : "";
      await Share.share({
        message: `${post.author_name} on Heathland Links${coursePart}`,
        url: `https://heathlandlinks.com/feed/${post.id}`,
      });
    } catch {}
  }, []);

  // ── List helpers ─────────────────────────────────────────────────────────
  const renderPost = useCallback(
    ({ item }) => (
      <FeedCard
        post={item}
        onReact={handleQuickReact}
        onLongReact={() => openReactionPicker(item.id)}
        onComment={() => setCommentPost(item)}
        onShare={handleShare}
        onMenu={handlePostMenu}
        onCoursePress={() =>
          item.course_id && router.push(`/course/${item.course_id}`)
        }
      />
    ),
    [handleQuickReact, openReactionPicker, handleShare, handlePostMenu, router],
  );

  const keyExtractor = useCallback((item) => `post-${item.id}`, []);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const ListFooter = () =>
    isFetchingNextPage ? (
      <View style={{ paddingBottom: insets.bottom + TAB_BAR_CLEARANCE }}>
        <FeedCardSkeleton variant="course" />
      </View>
    ) : (
      <View style={{ height: insets.bottom + TAB_BAR_CLEARANCE + 16 }} />
    );

  const ListEmpty = () => {
    if (filter === "clubs") {
      return <EmptyState filter={filter} router={router} />;
    }
    if (isLoading) return <LoadingState />;
    if (isError) return <ErrorState onRetry={refetch} />;
    return <EmptyState filter={filter} router={router} />;
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0EDE7" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <FeedHeader
        insets={insets}
        greeting={greeting}
        firstName={firstName}
        filter={filter}
        onFilterChange={setFilter}
        onNotificationsPress={() => router.push("/notifications")}
        hasUnread={hasUnread}
      />

      {/* ── Feed ────────────────────────────────────────────────────────── */}
      <FlatList
        ref={listRef}
        data={posts}
        renderItem={renderPost}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.green}
          />
        }
      />

      {/* ── Reaction picker ──────────────────────────────────────────────── */}
      <ReactionPicker
        postId={reactionPost}
        onReact={(postId, reaction) =>
          reactMutation.mutate({ postId, reaction })
        }
        onClose={closeReactionPicker}
        reactionAnim={reactionAnim}
      />

      {/* ── Comments modal ───────────────────────────────────────────────── */}
      {commentPost && (
        <CommentsModal
          post={commentPost}
          onClose={() => setCommentPost(null)}
          queryClient={qc}
          filter={filter}
        />
      )}
    </View>
  );
}
