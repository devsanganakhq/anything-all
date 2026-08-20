/**
 * Community detail screen
 * Tabs: DISCUSSION | CHAT | MEMBERS | ABOUT
 * Heathland Links premium visual system
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Users,
  Globe,
  Lock,
  Send,
  MoreHorizontal,
  Pin,
  Heart,
  MessageCircle,
  Camera,
  Plus,
  Trash2,
  Flag,
  CheckCircle,
  Award,
  MapPin,
  ThumbsUp,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";

const TABS = ["DISCUSSION", "CHAT", "MEMBERS", "ABOUT"];
const REACTION_TYPES = [
  { key: "like", emoji: "👍", label: "Like" },
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "insightful", emoji: "💡", label: "Insightful" },
  { key: "funny", emoji: "😄", label: "Funny" },
];
const POST_TYPES = [
  { key: "discussion", emoji: "💬", label: "Discussion" },
  { key: "course_question", emoji: "❓", label: "Course Question" },
  { key: "trip", emoji: "✈️", label: "Trip" },
];

export default function CommunityDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const qc = useQueryClient();
  const commId = parseInt(id, 10);

  const [tab, setTab] = useState("DISCUSSION");
  const [postText, setPostText] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [chatText, setChatText] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null); // postId with comments open
  const [commentText, setCommentText] = useState("");
  const [reactionTarget, setReactionTarget] = useState(null); // postId for reaction picker
  const chatListRef = useRef(null);
  const lastMsgId = useRef(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: detailData, isLoading: loadingDetail } = useQuery({
    queryKey: ["community-detail", commId],
    queryFn: async () => {
      const r = await fetch(`/api/communities/${commId}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: postsData, isLoading: loadingPosts } = useQuery({
    queryKey: ["community-posts", commId],
    queryFn: async () => {
      const r = await fetch(`/api/communities/${commId}/posts`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: tab === "DISCUSSION" || tab === "DISCUSSION",
  });

  const { data: chatData } = useQuery({
    queryKey: ["community-chat", commId],
    queryFn: async () => {
      const r = await fetch(`/api/communities/${commId}/chat?limit=50`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: tab === "CHAT" ? 8000 : false,
    enabled: tab === "CHAT",
  });

  const { data: membersData } = useQuery({
    queryKey: ["community-members", commId],
    queryFn: async () => {
      const r = await fetch(`/api/communities/${commId}/members`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: tab === "MEMBERS",
  });

  const { data: commentsData } = useQuery({
    queryKey: ["community-comments", commId, expandedPost],
    queryFn: async () => {
      const r = await fetch(
        `/api/communities/${commId}/comments?postId=${expandedPost}`,
      );
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    enabled: !!expandedPost,
  });

  const { data: meData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const r = await fetch("/api/user/profile");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const community = detailData?.community ?? null;
  const moderators = detailData?.moderators ?? [];
  const locked = detailData?.locked ?? false;
  const posts = postsData?.posts ?? [];
  const messages = chatData?.messages ?? [];
  const members = membersData?.members ?? [];
  const comments = commentsData?.comments ?? [];

  const isMember = community?.is_member ?? false;
  const myRole = community?.my_role ?? null;
  const isMod = ["admin", "moderator"].includes(myRole);
  const myUserId = Number(
    meData?.profile?.id ?? chatData?.currentUserId ?? 0,
  ) || null;
  const isMine = (userId) =>
    myUserId != null && Number(userId) === myUserId;

  // Track last message id for polling
  useEffect(() => {
    if (messages.length > 0) {
      lastMsgId.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (tab === "CHAT" && chatListRef.current && messages.length > 0) {
      setTimeout(() => {
        chatListRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }
  }, [messages.length, tab]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const joinMutation = useMutation({
    mutationFn: async (action) => {
      const r = await fetch("/api/communities/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId: commId, action }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["community-detail", commId] }),
  });

  const postMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/communities/${commId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: postTitle.trim() || null,
          body: postText.trim(),
          postType,
        }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setPostText("");
      setPostTitle("");
      setComposerOpen(false);
      qc.invalidateQueries({ queryKey: ["community-posts", commId] });
    },
  });

  const reactMutation = useMutation({
    mutationFn: async ({ postId, reactionType }) => {
      const r = await fetch(`/api/communities/${commId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reactionType }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setReactionTarget(null);
      qc.invalidateQueries({ queryKey: ["community-posts", commId] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: async ({ postId, text }) => {
      const r = await fetch(`/api/communities/${commId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, text }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setCommentText("");
      qc.invalidateQueries({
        queryKey: ["community-comments", commId, expandedPost],
      });
      qc.invalidateQueries({ queryKey: ["community-posts", commId] });
    },
  });

  const sendChatMutation = useMutation({
    mutationFn: async (text) => {
      const r = await fetch(`/api/communities/${commId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      setChatText("");
      qc.invalidateQueries({ queryKey: ["community-chat", commId] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (messageId) => {
      const r = await fetch(`/api/communities/${commId}/chat`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["community-chat", commId] }),
  });

  const reportMutation = useMutation({
    mutationFn: async ({ postId, reportedUserId, reason }) => {
      await fetch("/api/communities/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId: commId,
          postId,
          reportedUserId,
          reason,
        }),
      });
    },
    onSuccess: () =>
      Alert.alert("Reported", "Thank you — our moderators will review this."),
  });

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleJoin = () => {
    if (isMember) {
      Alert.alert("Leave Community", `Leave ${community?.name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => joinMutation.mutate("leave"),
        },
      ]);
    } else {
      joinMutation.mutate(
        community?.community_type === "private" ? "request_access" : "join",
      );
    }
  };

  const handleChatLongPress = (msg) => {
    const isOwn = isMine(msg.user_id);
    const opts = [];
    if (isOwn || isMod) {
      opts.push({
        text: "Delete Message",
        style: "destructive",
        onPress: () => deleteChatMutation.mutate(msg.id),
      });
    }
    opts.push({ text: "Cancel", style: "cancel" });
    Alert.alert(
      isOwn ? "Your Message" : msg.sender_name,
      msg.message_text?.slice(0, 60),
      opts,
    );
  };

  const handlePostMenu = (post) => {
    const isOwn = isMine(post.user_id);
    const opts = [];
    if (isOwn || isMod) {
      opts.push({
        text: "Delete Post",
        style: "destructive",
        onPress: () => {},
      });
    }
    opts.push({
      text: "Report Post",
      onPress: () =>
        Alert.alert("Report Post", "Select a reason:", [
          {
            text: "Spam",
            onPress: () =>
              reportMutation.mutate({ postId: post.id, reason: "spam" }),
          },
          {
            text: "Inappropriate",
            onPress: () =>
              reportMutation.mutate({
                postId: post.id,
                reason: "inappropriate",
              }),
          },
          {
            text: "Misinformation",
            onPress: () =>
              reportMutation.mutate({
                postId: post.id,
                reason: "misinformation",
              }),
          },
          {
            text: "Harassment",
            onPress: () =>
              reportMutation.mutate({ postId: post.id, reason: "harassment" }),
          },
          { text: "Cancel", style: "cancel" },
        ]),
    });
    opts.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Post Options", undefined, opts);
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingDetail) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
          paddingTop: insets.top,
        }}
      >
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  if (!community) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
          paddingTop: insets.top,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            color: Colors.textPrimary,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Community not found
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            marginTop: 20,
            backgroundColor: Colors.green,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: Radius.pill,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: Colors.ivory,
              letterSpacing: 1.2,
            }}
          >
            GO BACK
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Tab content ───────────────────────────────────────────────────────────
  const renderDiscussion = () => (
    <FlatList
      data={posts}
      keyExtractor={(p) => `post-${p.id}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Spacing.screenH,
        paddingTop: 14,
        paddingBottom: insets.bottom + 140,
      }}
      ListEmptyComponent={
        <View style={{ padding: 48, alignItems: "center" }}>
          <MessageCircle color={Colors.textMuted} size={40} strokeWidth={1.4} />
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: Colors.textPrimary,
              marginTop: 14,
            }}
          >
            No posts yet
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              marginTop: 6,
              textAlign: "center",
            }}
          >
            {isMember
              ? "Be the first to start a discussion."
              : "Join to see and create posts."}
          </Text>
        </View>
      }
      renderItem={({ item: post }) => (
        <View
          key={post.id}
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: Colors.border,
            ...Shadow.card,
            overflow: "hidden",
          }}
        >
          {/* Pinned badge */}
          {post.is_pinned && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: Colors.goldLight,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderBottomWidth: 1,
                borderBottomColor: "rgba(201,168,76,0.2)",
              }}
            >
              <Pin color={Colors.gold} size={11} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: Colors.gold,
                }}
              >
                PINNED
              </Text>
            </View>
          )}
          <View style={{ padding: 14 }}>
            {/* Author row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <UserAvatar
                uri={post.author_photo}
                name={post.author_name}
                size={36}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                >
                  {post.author_name}
                </Text>
                <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                  {post.author_club ? `${post.author_club} · ` : ""}
                  {post.time_ago}
                </Text>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                {/* Post type badge */}
                {post.post_type !== "discussion" && (
                  <View
                    style={{
                      backgroundColor: Colors.purpleLight,
                      borderRadius: Radius.pill,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8,
                        fontWeight: "700",
                        color: Colors.purple,
                        letterSpacing: 0.6,
                      }}
                    >
                      {post.post_type === "course_question"
                        ? "QUESTION"
                        : "TRIP"}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  onPress={() => handlePostMenu(post)}
                  style={{ padding: 4 }}
                >
                  <MoreHorizontal
                    color={Colors.textMuted}
                    size={15}
                    strokeWidth={1.8}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Title */}
            {post.title && (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginBottom: 6,
                  lineHeight: 21,
                }}
              >
                {post.title}
              </Text>
            )}

            {/* Body */}
            <Text
              style={{
                fontSize: 14,
                color: Colors.textPrimary,
                lineHeight: 22,
                marginBottom: post.photo_urls?.length ? 10 : 0,
              }}
            >
              {post.body}
            </Text>

            {/* Photos */}
            {post.photo_urls?.length > 0 && (
              <View
                style={{
                  borderRadius: Radius.md,
                  overflow: "hidden",
                  marginTop: 10,
                  marginBottom: 4,
                }}
              >
                <Image
                  source={{ uri: post.photo_urls[0] }}
                  style={{ width: "100%", height: 180 }}
                  contentFit="cover"
                />
              </View>
            )}

            {/* Course tag */}
            {post.course_name && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: Colors.greenLight,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  alignSelf: "flex-start",
                  marginTop: 8,
                  borderWidth: 1,
                  borderColor: Colors.greenBorder,
                }}
              >
                <MapPin color={Colors.green} size={10} strokeWidth={2} />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: Colors.green,
                  }}
                >
                  {post.course_name}
                </Text>
              </View>
            )}
          </View>

          {/* Reaction + comment bar */}
          <View
            style={{
              flexDirection: "row",
              borderTopWidth: 1,
              borderTopColor: Colors.divider,
              paddingHorizontal: 14,
              paddingVertical: 10,
              gap: 6,
            }}
          >
            {/* Reactions summary */}
            {post.reactions?.map((r) => {
              const rt = REACTION_TYPES.find((x) => x.key === r.type);
              return (
                <TouchableOpacity
                  key={r.type}
                  onPress={() =>
                    isMember &&
                    reactMutation.mutate({
                      postId: post.id,
                      reactionType: r.type,
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: Radius.pill,
                    backgroundColor:
                      post.my_reaction === r.type
                        ? Colors.greenLight
                        : Colors.ivoryDeep,
                    borderWidth: 1,
                    borderColor:
                      post.my_reaction === r.type
                        ? Colors.greenBorder
                        : Colors.border,
                  }}
                >
                  <Text style={{ fontSize: 11 }}>{rt?.emoji ?? "👍"}</Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color:
                        post.my_reaction === r.type
                          ? Colors.green
                          : Colors.textSecondary,
                    }}
                  >
                    {r.count}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Add reaction */}
            {isMember && (
              <TouchableOpacity
                onPress={() =>
                  setReactionTarget(reactionTarget === post.id ? null : post.id)
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: Radius.pill,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ fontSize: 11 }}>
                  {post.my_reaction
                    ? (REACTION_TYPES.find((x) => x.key === post.my_reaction)
                        ?.emoji ?? "👍")
                    : "+"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Comment count */}
            <TouchableOpacity
              onPress={() =>
                setExpandedPost(expandedPost === post.id ? null : post.id)
              }
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <MessageCircle
                color={
                  expandedPost === post.id ? Colors.green : Colors.textMuted
                }
                size={14}
                strokeWidth={1.8}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color:
                    expandedPost === post.id
                      ? Colors.green
                      : Colors.textSecondary,
                }}
              >
                {post.comment_count || 0}{" "}
                {post.comment_count === 1 ? "reply" : "replies"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reaction picker */}
          {reactionTarget === post.id && (
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                paddingHorizontal: 14,
                paddingBottom: 10,
                flexWrap: "wrap",
              }}
            >
              {REACTION_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.key}
                  onPress={() =>
                    reactMutation.mutate({
                      postId: post.id,
                      reactionType: rt.key,
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: Radius.pill,
                    backgroundColor:
                      post.my_reaction === rt.key
                        ? Colors.greenLight
                        : Colors.ivoryDeep,
                    borderWidth: 1,
                    borderColor:
                      post.my_reaction === rt.key
                        ? Colors.greenBorder
                        : Colors.border,
                  }}
                >
                  <Text style={{ fontSize: 14 }}>{rt.emoji}</Text>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: Colors.textSecondary,
                    }}
                  >
                    {rt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Comments expanded */}
          {expandedPost === post.id && (
            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: Colors.divider,
                padding: 12,
              }}
            >
              {comments.length === 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textMuted,
                    textAlign: "center",
                    paddingVertical: 8,
                  }}
                >
                  No replies yet
                </Text>
              )}
              {comments.map((c) => (
                <View
                  key={c.id}
                  style={{ flexDirection: "row", marginBottom: 10 }}
                >
                  <UserAvatar
                    uri={c.author_avatar}
                    name={c.author_name}
                    size={28}
                  />
                  <View
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      backgroundColor: Colors.ivoryDeep,
                      borderRadius: Radius.md,
                      padding: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: Colors.textPrimary,
                        marginBottom: 2,
                      }}
                    >
                      {c.author_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: Colors.textPrimary,
                        lineHeight: 19,
                      }}
                    >
                      {c.comment_text}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textMuted,
                        marginTop: 3,
                      }}
                    >
                      {c.time_ago}
                    </Text>
                  </View>
                </View>
              ))}
              {/* Comment input */}
              {isMember && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={{
                      flex: 1,
                      backgroundColor: Colors.ivoryDeep,
                      borderRadius: Radius.md,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      fontSize: 13,
                      color: Colors.textPrimary,
                      borderWidth: 1,
                      borderColor: Colors.border,
                    }}
                    placeholder="Write a reply…"
                    placeholderTextColor={Colors.textMuted}
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      commentText.trim() &&
                      commentMutation.mutate({
                        postId: post.id,
                        text: commentText,
                      })
                    }
                    disabled={!commentText.trim()}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: commentText.trim()
                        ? Colors.green
                        : Colors.border,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Send color={Colors.ivory} size={15} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    />
  );

  const renderChat = () => (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={220}
    >
      <ScrollView
        ref={chatListRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingTop: 14,
          paddingBottom: 16,
        }}
        onContentSizeChange={() =>
          chatListRef.current?.scrollToEnd?.({ animated: false })
        }
      >
        {messages.map((msg, idx) => {
          const isOwn = isMine(msg.user_id);
          const prevMsg = messages[idx - 1];
          const showName =
            !isOwn && (idx === 0 || prevMsg?.user_id !== msg.user_id);
          return (
            <TouchableOpacity
              key={msg.id}
              onLongPress={() => handleChatLongPress(msg)}
              style={{
                width: "100%",
                flexDirection: isOwn ? "row-reverse" : "row",
                alignItems: "flex-end",
                marginBottom: 8,
                gap: 8,
              }}
            >
              {!isOwn && (
                <View style={{ width: 30, height: 30 }}>
                  {showName ? (
                    <UserAvatar
                      uri={msg.sender_avatar}
                      name={msg.sender_name}
                      size={30}
                    />
                  ) : null}
                </View>
              )}
              <View style={{ maxWidth: "72%" }}>
                {showName && (
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: Colors.textSecondary,
                      marginBottom: 3,
                      marginLeft: 4,
                    }}
                  >
                    {msg.sender_name}
                  </Text>
                )}
                <View
                  style={{
                    backgroundColor: isOwn ? Colors.green : Colors.white,
                    borderRadius: 16,
                    borderBottomRightRadius: isOwn ? 4 : 16,
                    borderBottomLeftRadius: isOwn ? 16 : 4,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderWidth: isOwn ? 0 : 1,
                    borderColor: Colors.border,
                    ...Shadow.card,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: isOwn ? Colors.ivory : Colors.textPrimary,
                      lineHeight: 20,
                    }}
                  >
                    {msg.message_text}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 9,
                    color: Colors.textMuted,
                    marginTop: 3,
                    marginLeft: 4,
                    alignSelf: isOwn ? "flex-end" : "flex-start",
                  }}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {messages.length === 0 && (
          <View style={{ paddingTop: 60, alignItems: "center" }}>
            <MessageCircle
              color={Colors.textMuted}
              size={36}
              strokeWidth={1.4}
            />
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: Colors.textPrimary,
                marginTop: 12,
              }}
            >
              No messages yet
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                marginTop: 6,
                textAlign: "center",
              }}
            >
              {isMember
                ? "Be the first to say hello."
                : "Join to participate in the chat."}
            </Text>
          </View>
        )}
      </ScrollView>
      {/* Chat input */}
      {isMember && (
        <View
          style={{
            flexDirection: "row",
            gap: 8,
            paddingHorizontal: Spacing.screenH,
            paddingVertical: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: Colors.white,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          }}
        >
          <TextInput
            style={{
              flex: 1,
              backgroundColor: Colors.ivory,
              borderRadius: Radius.pill,
              paddingHorizontal: 14,
              paddingVertical: 10,
              fontSize: 14,
              color: Colors.textPrimary,
              borderWidth: 1,
              borderColor: Colors.border,
              maxHeight: 100,
            }}
            placeholder="Message the community…"
            placeholderTextColor={Colors.textMuted}
            value={chatText}
            onChangeText={setChatText}
            multiline
          />
          <TouchableOpacity
            onPress={() =>
              chatText.trim() && sendChatMutation.mutate(chatText.trim())
            }
            disabled={!chatText.trim()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: chatText.trim()
                ? Colors.green
                : Colors.ivoryDeep,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Send
              color={chatText.trim() ? Colors.ivory : Colors.textMuted}
              size={17}
              strokeWidth={2}
            />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );

  const renderMembers = () => {
    const admins = members.filter((m) => m.role === "admin");
    const mods = members.filter((m) => m.role === "moderator");
    const regular = members.filter((m) => m.role === "member");
    const sections = [
      { title: "ADMIN & OWNER", data: admins },
      { title: "MODERATORS", data: mods },
      { title: `MEMBERS (${regular.length})`, data: regular },
    ].filter((s) => s.data.length > 0);

    return (
      <FlatList
        data={sections.flatMap((s) => [{ __header: s.title }, ...s.data])}
        keyExtractor={(item, i) =>
          item.__header ? `hdr-${i}` : `member-${item.id}`
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingTop: 14,
          paddingBottom: insets.bottom + 100,
        }}
        renderItem={({ item }) => {
          if (item.__header) {
            return (
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  color: Colors.textMuted,
                  marginBottom: 8,
                  marginTop: 4,
                }}
              >
                {item.__header}
              </Text>
            );
          }
          return (
            <TouchableOpacity
              onPress={() => router.push(`/social/${item.id}`)}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                padding: 12,
                marginBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                borderWidth: 1,
                borderColor: Colors.border,
                ...Shadow.card,
              }}
            >
              <UserAvatar uri={item.avatar} name={item.name} size={44} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: Colors.textPrimary,
                    }}
                  >
                    {item.name}
                  </Text>
                  {item.is_owner && (
                    <View
                      style={{
                        backgroundColor: Colors.green,
                        borderRadius: Radius.pill,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: "700",
                          color: Colors.ivory,
                          letterSpacing: 0.8,
                        }}
                      >
                        OWNER
                      </Text>
                    </View>
                  )}
                  {item.role === "moderator" && (
                    <View
                      style={{
                        backgroundColor: Colors.purpleLight,
                        borderRadius: Radius.pill,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: Colors.purpleBorder,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 7,
                          fontWeight: "700",
                          color: Colors.purple,
                          letterSpacing: 0.8,
                        }}
                      >
                        MOD
                      </Text>
                    </View>
                  )}
                </View>
                {item.home_club && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textSecondary,
                      marginTop: 1,
                    }}
                  >
                    {item.home_club}
                  </Text>
                )}
              </View>
              {item.courses_played > 0 && (
                <View style={{ alignItems: "center" }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: Colors.green,
                    }}
                  >
                    {item.courses_played}
                  </Text>
                  <Text
                    style={{
                      fontSize: 7,
                      fontWeight: "700",
                      color: Colors.textMuted,
                      letterSpacing: 0.8,
                    }}
                  >
                    COURSES
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  const renderAbout = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: Spacing.screenH,
        paddingTop: 16,
        paddingBottom: insets.bottom + 100,
      }}
    >
      {/* Description */}
      <View
        style={{
          backgroundColor: Colors.white,
          borderRadius: Radius.lg,
          padding: 16,
          borderWidth: 1,
          borderColor: Colors.border,
          marginBottom: 14,
          ...Shadow.card,
        }}
      >
        <Text
          style={{
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.5,
            color: Colors.textMuted,
            marginBottom: 10,
          }}
        >
          ABOUT
        </Text>
        <Text
          style={{ fontSize: 14, color: Colors.textPrimary, lineHeight: 22 }}
        >
          {community.description}
        </Text>
      </View>

      {/* Badges */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: Colors.greenLight,
            borderRadius: Radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: Colors.greenBorder,
          }}
        >
          {community.community_type === "private" ? (
            <Lock color={Colors.green} size={11} strokeWidth={2} />
          ) : (
            <Globe color={Colors.green} size={11} strokeWidth={1.8} />
          )}
          <Text
            style={{ fontSize: 10, fontWeight: "700", color: Colors.green }}
          >
            {community.community_type === "private" ? "PRIVATE" : "PUBLIC"}
          </Text>
        </View>
        {community.category && (
          <View
            style={{
              backgroundColor: Colors.purpleLight,
              borderRadius: Radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 7,
              borderWidth: 1,
              borderColor: Colors.purpleBorder,
            }}
          >
            <Text
              style={{ fontSize: 10, fontWeight: "700", color: Colors.purple }}
            >
              {community.category.toUpperCase()}
            </Text>
          </View>
        )}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: Colors.ivoryDeep,
            borderRadius: Radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Users color={Colors.textSecondary} size={11} strokeWidth={1.8} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: Colors.textSecondary,
            }}
          >
            {community.member_count} MEMBERS
          </Text>
        </View>
      </View>

      {/* Rules */}
      {community.rules?.length > 0 && (
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 14,
            ...Shadow.card,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textMuted,
              marginBottom: 12,
            }}
          >
            COMMUNITY RULES
          </Text>
          {community.rules.map((rule, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: Colors.green,
                  justifyContent: "center",
                  alignItems: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: Colors.ivory,
                  }}
                >
                  {i + 1}
                </Text>
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: Colors.textPrimary,
                  lineHeight: 20,
                }}
              >
                {rule}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Tags */}
      {community.tags?.length > 0 && (
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 14,
            ...Shadow.card,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textMuted,
              marginBottom: 10,
            }}
          >
            TAGS
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {community.tags.map((tag) => (
              <View
                key={tag}
                style={{
                  backgroundColor: Colors.ivoryDeep,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: Colors.textSecondary,
                    fontWeight: "600",
                  }}
                >
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Moderators */}
      {moderators.length > 0 && (
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            padding: 16,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 14,
            ...Shadow.card,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textMuted,
              marginBottom: 12,
            }}
          >
            MODERATION TEAM
          </Text>
          {moderators.map((mod) => (
            <View
              key={mod.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <UserAvatar uri={mod.avatar} name={mod.name} size={36} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                >
                  {mod.name}
                </Text>
                {mod.home_club && (
                  <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                    {mod.home_club}
                  </Text>
                )}
              </View>
              <View
                style={{
                  backgroundColor:
                    mod.role === "admin"
                      ? Colors.greenLight
                      : Colors.purpleLight,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor:
                    mod.role === "admin"
                      ? Colors.greenBorder
                      : Colors.purpleBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "700",
                    color: mod.role === "admin" ? Colors.green : Colors.purple,
                  }}
                >
                  {mod.role === "admin" ? "OWNER" : "MOD"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* ── Cover header ────────────────────────────────────────────────── */}
      <View style={{ height: 180 + insets.top, backgroundColor: Colors.green }}>
        {community.cover_photo_url && (
          <Image
            source={{ uri: community.cover_photo_url }}
            style={{ ...fill, top: 0 }}
            contentFit="cover"
          />
        )}
        {/* Dark overlay */}
        <View style={{ ...fill, backgroundColor: "rgba(27,40,34,0.55)" }} />

        {/* Back + menu */}
        <View
          style={{
            position: "absolute",
            top: insets.top + 10,
            left: Spacing.screenH,
            right: Spacing.screenH,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ChevronLeft color={Colors.ivory} size={20} strokeWidth={1.8} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleJoin}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MoreHorizontal color={Colors.ivory} size={18} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Community name + info on cover */}
        <View
          style={{
            position: "absolute",
            bottom: 16,
            left: Spacing.screenH,
            right: Spacing.screenH,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            {community.community_type === "private" ? (
              <Lock color="rgba(245,241,235,0.75)" size={11} strokeWidth={2} />
            ) : (
              <Globe
                color="rgba(245,241,235,0.75)"
                size={11}
                strokeWidth={1.8}
              />
            )}
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.2,
                color: "rgba(245,241,235,0.75)",
              }}
            >
              {community.category?.toUpperCase() ?? "COMMUNITY"}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: Colors.ivory,
              lineHeight: 26,
            }}
            numberOfLines={2}
          >
            {community.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Users
                color="rgba(245,241,235,0.75)"
                size={12}
                strokeWidth={1.8}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(245,241,235,0.85)",
                  fontWeight: "600",
                }}
              >
                {community.member_count?.toLocaleString()} members
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <MessageCircle
                color="rgba(245,241,235,0.75)"
                size={12}
                strokeWidth={1.8}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(245,241,235,0.85)",
                  fontWeight: "600",
                }}
              >
                {community.post_count || 0} posts
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Info bar: join + tabs ────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        {/* Join / member row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: Spacing.screenH,
            paddingTop: 12,
            paddingBottom: 10,
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            {myRole && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
              >
                <CheckCircle color={Colors.green} size={13} strokeWidth={2} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: Colors.green,
                  }}
                >
                  {myRole === "admin"
                    ? "Owner"
                    : myRole === "moderator"
                      ? "Moderator"
                      : "Member"}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={handleJoin}
            disabled={joinMutation.isPending}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 9,
              borderRadius: Radius.pill,
              backgroundColor: isMember ? "transparent" : Colors.green,
              borderWidth: 1,
              borderColor: isMember ? Colors.border : Colors.green,
              minWidth: 120,
              minHeight: 34,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator
                size="small"
                color={isMember ? Colors.green : Colors.ivory}
              />
            ) : (
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: isMember ? Colors.textSecondary : Colors.ivory,
                }}
              >
                {isMember
                  ? "LEAVE"
                  : community.community_type === "private"
                    ? "REQUEST TO JOIN"
                    : "JOIN COMMUNITY"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.screenH, gap: 0 }}
        >
          {TABS.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: tab === t ? Colors.green : "transparent",
                marginRight: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: tab === t ? Colors.green : Colors.textMuted,
                }}
              >
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        {tab === "DISCUSSION" && (
          <>
            {loadingPosts ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <ActivityIndicator color={Colors.green} />
              </View>
            ) : (
              renderDiscussion()
            )}

            {/* Post composer */}
            {isMember && (
              <View
                style={{
                  backgroundColor: Colors.white,
                  borderTopWidth: 1,
                  borderTopColor: Colors.border,
                }}
              >
                {composerOpen ? (
                  <View
                    style={{ padding: 14, paddingBottom: insets.bottom + 14 }}
                  >
                    {/* Post type chips */}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ flexGrow: 0, marginBottom: 10 }}
                    >
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {POST_TYPES.map((pt) => (
                          <TouchableOpacity
                            key={pt.key}
                            onPress={() => setPostType(pt.key)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: Radius.pill,
                              backgroundColor:
                                postType === pt.key
                                  ? Colors.green
                                  : Colors.ivoryDeep,
                              borderWidth: 1,
                              borderColor:
                                postType === pt.key
                                  ? Colors.green
                                  : Colors.border,
                            }}
                          >
                            <Text style={{ fontSize: 11 }}>{pt.emoji}</Text>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color:
                                  postType === pt.key
                                    ? Colors.ivory
                                    : Colors.textSecondary,
                              }}
                            >
                              {pt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                    <TextInput
                      style={{
                        backgroundColor: Colors.ivory,
                        borderRadius: Radius.md,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: Colors.textPrimary,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        marginBottom: 8,
                      }}
                      placeholder="Title (optional)"
                      placeholderTextColor={Colors.textMuted}
                      value={postTitle}
                      onChangeText={setPostTitle}
                    />
                    <TextInput
                      style={{
                        backgroundColor: Colors.ivory,
                        borderRadius: Radius.md,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        fontSize: 14,
                        color: Colors.textPrimary,
                        borderWidth: 1,
                        borderColor: Colors.border,
                        height: 90,
                        textAlignVertical: "top",
                      }}
                      placeholder="What's on your mind?"
                      placeholderTextColor={Colors.textMuted}
                      value={postText}
                      onChangeText={setPostText}
                      multiline
                    />
                    <View
                      style={{ flexDirection: "row", gap: 8, marginTop: 10 }}
                    >
                      <TouchableOpacity
                        onPress={() => setComposerOpen(false)}
                        style={{
                          flex: 1,
                          paddingVertical: 11,
                          borderRadius: Radius.sm,
                          borderWidth: 1,
                          borderColor: Colors.border,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: Colors.textSecondary,
                          }}
                        >
                          CANCEL
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => postText.trim() && postMutation.mutate()}
                        disabled={!postText.trim()}
                        style={{
                          flex: 2,
                          paddingVertical: 11,
                          borderRadius: Radius.sm,
                          backgroundColor: postText.trim()
                            ? Colors.green
                            : Colors.border,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: Colors.ivory,
                            letterSpacing: 0.5,
                          }}
                        >
                          POST TO COMMUNITY
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setComposerOpen(true)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingHorizontal: Spacing.screenH,
                      paddingVertical: 12,
                      paddingBottom: insets.bottom + 12,
                    }}
                  >
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: Colors.ivory,
                        borderRadius: Radius.pill,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: Colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: Colors.textMuted }}>
                        Share something with the community…
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: Colors.green,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Plus color={Colors.ivory} size={17} strokeWidth={2} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {tab === "CHAT" && renderChat()}
        {tab === "MEMBERS" && renderMembers()}
        {tab === "ABOUT" && renderAbout()}
      </View>
    </View>
  );
}

const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };
