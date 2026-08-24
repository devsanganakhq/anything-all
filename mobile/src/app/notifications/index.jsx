/**
 * Notifications screen
 * Shows all notification types with inline actions for friend requests.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  UserMinus,
  Rss,
  Users,
  Bell,
  CheckCircle,
  XCircle,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { useOpenUserProfile } from "@/utils/openUserProfile";

const TYPE_CONFIG = {
  friend_request: {
    icon: UserPlus,
    color: Colors.green,
    label: "Friend Request",
  },
  friend_accepted: {
    icon: UserCheck,
    color: Colors.green,
    label: "Friend Accepted",
  },
  mention: { icon: Rss, color: Colors.purple, label: "New Follower" },
  activity_like: { icon: Heart, color: Colors.error, label: "Reaction" },
  activity_comment: {
    icon: MessageCircle,
    color: Colors.green,
    label: "Comment",
  },
  feed_like: { icon: Heart, color: Colors.error, label: "Reaction" },
  feed_comment: {
    icon: MessageCircle,
    color: Colors.green,
    label: "Comment",
  },
  community_invite: { icon: Users, color: Colors.purple, label: "Community" },
  community_invite_received: {
    icon: UserPlus,
    color: Colors.purple,
    label: "Invite",
  },
  community_invite_accepted: {
    icon: UserCheck,
    color: Colors.green,
    label: "Invite Accepted",
  },
  community_invite_declined: {
    icon: XCircle,
    color: Colors.textSecondary,
    label: "Invite Declined",
  },
  community_join: { icon: UserPlus, color: Colors.purple, label: "Joined" },
  community_join_accepted: {
    icon: UserCheck,
    color: Colors.green,
    label: "Accepted",
  },
  community_join_declined: {
    icon: XCircle,
    color: Colors.textSecondary,
    label: "Declined",
  },
  community_leave: { icon: UserMinus, color: Colors.purple, label: "Left" },
  community_post_like: {
    icon: Heart,
    color: Colors.error,
    label: "Reaction",
  },
  community_post_comment: {
    icon: MessageCircle,
    color: Colors.green,
    label: "Comment",
  },
  message: { icon: MessageCircle, color: Colors.green, label: "Message" },
};

function notificationMessage(n) {
  const name = n.community_name;
  if (name) {
    if (n.notification_type === "community_join") {
      return `joined community ${name}`;
    }
    if (n.notification_type === "community_leave") {
      return `left community ${name}`;
    }
    if (n.notification_type === "community_invite") {
      return `requested to join community ${name}`;
    }
    if (n.notification_type === "community_invite_received") {
      return `invited you to join ${name}`;
    }
    if (n.notification_type === "community_invite_accepted") {
      return `accepted your invite to ${name}`;
    }
    if (n.notification_type === "community_invite_declined") {
      return `declined your invite to ${name}`;
    }
    if (n.notification_type === "community_join_accepted") {
      return `accepted your request to join ${name}`;
    }
    if (n.notification_type === "community_join_declined") {
      return `declined your request to join ${name}`;
    }
  }
  return n.message;
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openUserProfile = useOpenUserProfile();
  const qc = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await fetch("/api/user/notifications");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    refetchInterval: 30_000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await fetch("/api/user/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const respondMutation = useMutation({
    mutationFn: async ({ friendshipId, action, notificationId }) => {
      const r = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (!r.ok) throw new Error("Failed");
      // Mark the notification as read too
      if (notificationId) {
        await fetch("/api/user/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        });
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  const respondJoinRequestMutation = useMutation({
    mutationFn: async ({
      communityId,
      requestId,
      action,
      notificationId,
    }) => {
      const r = await fetch(`/api/communities/${communityId}/join-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (!r.ok) throw new Error("Failed");
      if (notificationId) {
        await fetch("/api/user/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        });
      }
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["communities"] });
    },
  });

  const respondInviteMutation = useMutation({
    mutationFn: async ({
      communityId,
      inviteId,
      action,
      notificationId,
    }) => {
      const r = await fetch(
        `/api/communities/${communityId}/invites/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteId, action }),
        },
      );
      if (!r.ok) throw new Error("Failed");
      if (notificationId) {
        await fetch("/api/user/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId }),
        });
      }
      return r.json();
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["communities"] });
      if (variables.action === "accept" && variables.communityId) {
        router.push(`/communities/${variables.communityId}`);
      }
    },
  });

  const notifications = data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.read_at).length;

  const handlePress = useCallback(
    (n) => {
      // Mark as read then navigate
      if (!n.read_at) markReadMutation.mutate(n.id);

      if (n.notification_type === "friend_request" && n.from_user_id) {
        openUserProfile(n.from_user_id);
      } else if (
        ["feed_like", "feed_comment"].includes(n.notification_type)
      ) {
        if (n.feed_post_id) {
          const openComments =
            n.notification_type === "feed_comment" ? "?openComments=1" : "";
          router.push(`/feed/${n.feed_post_id}${openComments}`);
        } else {
          router.push("/(tabs)");
        }
      } else if (
        ["activity_like", "activity_comment"].includes(n.notification_type)
      ) {
        router.push("/(tabs)");
      } else if (
        [
          "community_invite",
          "community_invite_received",
          "community_invite_accepted",
          "community_invite_declined",
          "community_join",
          "community_leave",
          "community_join_accepted",
          "community_join_declined",
          "community_post_like",
          "community_post_comment",
        ].includes(n.notification_type) &&
        n.community_id
      ) {
        const postQuery =
          (n.notification_type === "community_post_like" ||
            n.notification_type === "community_post_comment") &&
          n.community_post_id
            ? `?postId=${n.community_post_id}${
                n.notification_type === "community_post_comment"
                  ? "&openComments=1"
                  : ""
              }`
            : n.notification_type === "community_invite"
              ? "?tab=REQUESTS"
              : "";
        router.push(`/communities/${n.community_id}${postQuery}`);
      } else if (n.from_user_id) {
        openUserProfile(n.from_user_id);
      }
    },
    [router, openUserProfile, markReadMutation],
  );

  const renderItem = useCallback(
    ({ item: n }) => {
      const config = TYPE_CONFIG[n.notification_type] || TYPE_CONFIG.message;
      const Icon = config.icon;
      const isUnread = !n.read_at;

      return (
        <TouchableOpacity
          onPress={() => handlePress(n)}
          style={{
            backgroundColor: isUnread ? Colors.white : Colors.ivory,
            paddingHorizontal: Spacing.screenH,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: Colors.divider,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
          }}
          activeOpacity={0.75}
        >
          {/* Avatar or icon */}
          <View style={{ position: "relative" }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                overflow: "hidden",
                backgroundColor: Colors.ivoryDeep,
              }}
            >
              {n.from_user_photo ? (
                <Image
                  source={{ uri: n.from_user_photo }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: Colors.greenLight,
                  }}
                >
                  <Icon color={config.color} size={19} strokeWidth={1.8} />
                </View>
              )}
            </View>
            {/* Type badge in bottom-right corner */}
            <View
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: config.color,
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 2,
                borderColor: isUnread ? Colors.white : Colors.ivory,
              }}
            >
              <Icon color="#fff" size={10} strokeWidth={2.5} />
            </View>
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                color: Colors.textPrimary,
                lineHeight: 21,
              }}
            >
              <Text style={{ fontWeight: "700" }}>
                {n.from_user_name || "Heathland Links"}
              </Text>{" "}
              {notificationMessage(n)}
            </Text>
            <Text
              style={{ fontSize: 11, color: Colors.textMuted, marginTop: 3 }}
            >
              {n.time_ago}
            </Text>

            {/* Inline accept / decline for friend requests */}
            {n.notification_type === "friend_request" &&
              n.friendship_id &&
              !n.read_at && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      respondMutation.mutate({
                        friendshipId: n.friendship_id,
                        action: "accept",
                        notificationId: n.id,
                      });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: Colors.green,
                      borderRadius: Radius.sm,
                      paddingVertical: 9,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <CheckCircle
                      color={Colors.ivory}
                      size={13}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.ivory,
                        letterSpacing: 0.5,
                      }}
                    >
                      ACCEPT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      respondMutation.mutate({
                        friendshipId: n.friendship_id,
                        action: "decline",
                        notificationId: n.id,
                      });
                    }}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: Radius.sm,
                      paddingVertical: 9,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <XCircle
                      color={Colors.textSecondary}
                      size={13}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.textSecondary,
                        letterSpacing: 0.5,
                      }}
                    >
                      DECLINE
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* Inline accept / decline for community join requests */}
            {n.notification_type === "community_invite" &&
              n.join_request_id &&
              n.community_id &&
              !n.read_at && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      respondJoinRequestMutation.mutate({
                        communityId: n.community_id,
                        requestId: n.join_request_id,
                        action: "accept",
                        notificationId: n.id,
                      });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: Colors.green,
                      borderRadius: Radius.sm,
                      paddingVertical: 9,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <CheckCircle
                      color={Colors.ivory}
                      size={13}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.ivory,
                        letterSpacing: 0.5,
                      }}
                    >
                      ACCEPT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      respondJoinRequestMutation.mutate({
                        communityId: n.community_id,
                        requestId: n.join_request_id,
                        action: "decline",
                        notificationId: n.id,
                      });
                    }}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: Radius.sm,
                      paddingVertical: 9,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <XCircle
                      color={Colors.textSecondary}
                      size={13}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.textSecondary,
                        letterSpacing: 0.5,
                      }}
                    >
                      DECLINE
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* Inline accept / decline for community invites received */}
            {n.notification_type === "community_invite_received" &&
              n.invite_id &&
              n.community_id &&
              !n.read_at && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      respondInviteMutation.mutate({
                        communityId: n.community_id,
                        inviteId: n.invite_id,
                        action: "accept",
                        notificationId: n.id,
                      });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: Colors.green,
                      borderRadius: Radius.sm,
                      paddingVertical: 9,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <CheckCircle
                      color={Colors.ivory}
                      size={13}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.ivory,
                        letterSpacing: 0.5,
                      }}
                    >
                      ACCEPT
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      respondInviteMutation.mutate({
                        communityId: n.community_id,
                        inviteId: n.invite_id,
                        action: "decline",
                        notificationId: n.id,
                      });
                    }}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      borderColor: Colors.border,
                      borderRadius: Radius.sm,
                      paddingVertical: 9,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                    }}
                  >
                    <XCircle
                      color={Colors.textSecondary}
                      size={13}
                      strokeWidth={2}
                    />
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.textSecondary,
                        letterSpacing: 0.5,
                      }}
                    >
                      DECLINE
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
          </View>

          {/* Unread dot */}
          {isUnread && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: Colors.green,
                marginTop: 6,
                flexShrink: 0,
              }}
            />
          )}
        </TouchableOpacity>
      );
    },
    [handlePress, respondMutation, respondJoinRequestMutation, respondInviteMutation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
            <View>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "300",
                  fontStyle: "italic",
                  color: Colors.textPrimary,
                }}
              >
                Notifications
              </Text>
              {unread > 0 && (
                <Text
                  style={{
                    fontSize: 10,
                    color: Colors.textMuted,
                    marginTop: 1,
                  }}
                >
                  {unread} unread
                </Text>
              )}
            </View>
          </View>
          {unread > 0 && (
            <TouchableOpacity onPress={() => markReadMutation.mutate(null)}>
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.green,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                Mark all read
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── List ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(n) => `notif-${n.id}`}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 80,
              }}
            >
              <Bell color={Colors.textMuted} size={44} strokeWidth={1.4} />
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginTop: 16,
                }}
              >
                You're all caught up
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginTop: 8,
                }}
              >
                No new notifications right now.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
