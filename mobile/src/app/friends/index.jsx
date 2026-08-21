/**
 * Friends screen
 * Tabs: My Friends · Requests (inbound + outbound) · Following
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  UserPlus,
  Users,
  CheckCircle,
  XCircle,
  MapPin,
  Search,
  ChevronRight,
  UserMinus,
  MoreHorizontal,
  Eye,
  UserCheck,
  Rss,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";
import { useOpenUserProfile } from "@/utils/openUserProfile";

const TABS = [
  { key: "friends", label: "FRIENDS" },
  { key: "requests", label: "REQUESTS" },
  { key: "following", label: "FOLLOWING" },
];

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const openUserProfile = useOpenUserProfile();
  const qc = useQueryClient();
  const [tab, setTab] = useState("friends");
  const [query, setQuery] = useState("");

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: friendsData, isLoading: loadingFriends } = useQuery({
    queryKey: ["friends", "accepted"],
    queryFn: async () => {
      const r = await fetch("/api/friends/list?status=accepted");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: inboundData, isLoading: loadingIn } = useQuery({
    queryKey: ["friends", "pending", "inbound"],
    queryFn: async () => {
      const r = await fetch(
        "/api/friends/list?status=pending&direction=inbound",
      );
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: outboundData } = useQuery({
    queryKey: ["friends", "pending", "outbound"],
    queryFn: async () => {
      const r = await fetch(
        "/api/friends/list?status=pending&direction=outbound",
      );
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: followingData, isLoading: loadingFollowing } = useQuery({
    queryKey: ["social", "connections", "following"],
    queryFn: async () => {
      const r = await fetch("/api/social/connections?type=following");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: followersData, isLoading: loadingFollowers } = useQuery({
    queryKey: ["social", "connections", "followers"],
    queryFn: async () => {
      const r = await fetch("/api/social/connections?type=followers");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const friends = (friendsData?.friends ?? []).filter((f) =>
    filterName(f.friend_name, query),
  );
  const inbound = (inboundData?.friends ?? []).filter((f) =>
    filterName(f.friend_name, query),
  );
  const outbound = (outboundData?.friends ?? []).filter((f) =>
    filterName(f.friend_name, query),
  );
  const following = (followingData?.users ?? []).filter((f) =>
    filterName(f.name, query),
  );
  const followers = (followersData?.users ?? []).filter((f) =>
    filterName(f.name, query),
  );

  const inboundCount = inboundData?.friends?.length ?? 0;
  const outboundCount = outboundData?.friends?.length ?? 0;
  const requestCount = inboundCount + outboundCount;

  // ── Mutations ───────────────────────────────────────────────────────────────
  const respondMutation = useMutation({
    mutationFn: async ({ friendshipId, action }) => {
      const r = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendshipId, action }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (friendId) => {
      const r = await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });

  const followMutation = useMutation({
    mutationFn: async (followeeId) => {
      const r = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followeeId, followeeType: "user" }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["social", "connections"] }),
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (friendId) => {
      await fetch("/api/friends/request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends", "pending"] }),
  });

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleFriendMenu = useCallback(
    (f) => {
      Alert.alert(f.friend_name, undefined, [
        {
          text: "View Profile",
          onPress: () => openUserProfile(f.friend_id),
        },
        {
          text: "Remove Friend",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Remove Friend",
              `Remove ${f.friend_name} from your friends?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => removeMutation.mutate(f.friend_id),
                },
              ],
            ),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [router, openUserProfile, removeMutation],
  );

  const handleFollowingMenu = useCallback(
    (u) => {
      Alert.alert(u.name, undefined, [
        { text: "View Profile", onPress: () => openUserProfile(u.id) },
        {
          text: u.is_following ? "Unfollow" : "Follow",
          style: u.is_following ? "destructive" : "default",
          onPress: () => followMutation.mutate(u.id),
        },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [openUserProfile, followMutation],
  );

  // ── Renders ──────────────────────────────────────────────────────────────────
  const isLoading =
    tab === "friends"
      ? loadingFriends
      : tab === "following"
        ? loadingFollowing || loadingFollowers
        : loadingIn;

  const renderFriend = useCallback(
    ({ item: f }) => (
      <TouchableOpacity
        onPress={() => openUserProfile(f.friend_id)}
        style={styles.card}
      >
        <UserAvatar
          uri={f.friend_photo}
          name={f.friend_name}
          size={52}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{f.friend_name}</Text>
          {f.friend_location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                marginTop: 2,
              }}
            >
              <MapPin color={Colors.textMuted} size={10} strokeWidth={1.8} />
              <Text style={styles.sub}>{f.friend_location}</Text>
            </View>
          )}
          {f.home_club && (
            <Text style={[styles.sub, { marginTop: 1 }]}>{f.home_club}</Text>
          )}
        </View>
        <View style={{ alignItems: "flex-end", gap: 8 }}>
          {f.courses_played != null && (
            <View style={{ alignItems: "center" }}>
              <Text style={styles.statNum}>{f.courses_played}</Text>
              <Text style={styles.statLabel}>COURSES</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => handleFriendMenu(f)}
            style={{ padding: 4 }}
          >
            <MoreHorizontal
              color={Colors.textMuted}
              size={16}
              strokeWidth={1.8}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [openUserProfile, handleFriendMenu],
  );

  const renderInbound = useCallback(
    ({ item: r }) => (
      <View style={[styles.card, { flexDirection: "column", gap: 12 }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => openUserProfile(r.friend_id)}
          >
            <UserAvatar
              uri={r.friend_photo}
              name={r.friend_name}
              size={46}
            />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>{r.friend_name}</Text>
            <Text style={styles.sub}>
              {r.courses_played || 0} courses played
            </Text>
            {r.friend_location && (
              <Text style={styles.sub}>{r.friend_location}</Text>
            )}
          </View>
          <View
            style={{
              backgroundColor: Colors.greenLight,
              borderRadius: Radius.sm,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "700",
                color: Colors.green,
                letterSpacing: 0.8,
              }}
            >
              PENDING
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={() =>
              respondMutation.mutate({ friendshipId: r.id, action: "accept" })
            }
            style={styles.acceptBtn}
          >
            <CheckCircle color={Colors.ivory} size={14} strokeWidth={2} />
            <Text style={styles.acceptBtnText}>ACCEPT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              respondMutation.mutate({ friendshipId: r.id, action: "decline" })
            }
            style={styles.declineBtn}
          >
            <XCircle color={Colors.textSecondary} size={14} strokeWidth={2} />
            <Text style={styles.declineBtnText}>DECLINE</Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [respondMutation, router],
  );

  const renderOutbound = useCallback(
    ({ item: r }) => (
      <View style={styles.card}>
        <UserAvatar
          uri={r.friend_photo}
          name={r.friend_name}
          size={46}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{r.friend_name}</Text>
          <Text style={styles.sub}>Request sent</Text>
        </View>
        <TouchableOpacity
          onPress={() => cancelRequestMutation.mutate(r.friend_id)}
          style={{
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: Colors.textSecondary,
            }}
          >
            CANCEL
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [cancelRequestMutation],
  );

  const renderFollowing = useCallback(
    ({ item: u }) => (
      <TouchableOpacity
        onPress={() => openUserProfile(u.id)}
        style={styles.card}
      >
        <UserAvatar uri={u.avatar} name={u.name} size={46} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{u.name}</Text>
          {u.location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 3,
                marginTop: 2,
              }}
            >
              <MapPin color={Colors.textMuted} size={10} strokeWidth={1.8} />
              <Text style={styles.sub}>{u.location}</Text>
            </View>
          )}
          {u.home_club && <Text style={styles.sub}>{u.home_club}</Text>}
        </View>
        <TouchableOpacity
          onPress={() => handleFollowingMenu(u)}
          style={{ padding: 4 }}
        >
          <MoreHorizontal
            color={Colors.textMuted}
            size={16}
            strokeWidth={1.8}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [openUserProfile, handleFollowingMenu],
  );

  // Build data for Requests tab: inbound section header + items, then outbound
  const requestsData = [
    ...(inbound.length
      ? [
          { __type: "header", label: `RECEIVED (${inbound.length})` },
          ...inbound.map((r) => ({ ...r, __type: "inbound" })),
        ]
      : []),
    ...(outbound.length
      ? [
          { __type: "header", label: `SENT (${outbound.length})` },
          ...outbound.map((r) => ({ ...r, __type: "outbound" })),
        ]
      : []),
  ];

  const followsData = [
    ...(followers.length
      ? [
          { __type: "header", label: `FOLLOWERS (${followers.length})` },
          ...followers.map((u) => ({ ...u, __type: "follow" })),
        ]
      : []),
    ...(following.length
      ? [
          { __type: "header", label: `FOLLOWING (${following.length})` },
          ...following.map((u) => ({ ...u, __type: "follow" })),
        ]
      : []),
  ];

  const currentData =
    tab === "friends" ? friends : tab === "requests" ? requestsData : followsData;

  const currentEmpty =
    tab === "friends"
      ? {
          icon: Users,
          title: "No friends yet",
          msg: "Discover and connect with golfers across Britain & Ireland.",
        }
      : tab === "requests"
        ? {
            icon: UserPlus,
            title: "No requests",
            msg: "Friend requests you send and receive will appear here.",
          }
        : {
            icon: Rss,
            title: "No follows yet",
            msg: "People who follow you, and golfers you follow, will appear here.",
          };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: insets.top + 14,
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
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            Connections
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/friends/discover")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.green,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <UserPlus color={Colors.ivory} size={17} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.ivory,
            borderRadius: Radius.md,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 12,
          }}
        >
          <Search color={Colors.textMuted} size={14} strokeWidth={1.8} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 14,
              color: Colors.textPrimary,
            }}
            placeholder={`Search ${tab === "following" ? "follows" : "friends"}…`}
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Tab pills */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {TABS.map((t) => {
            const active = tab === t.key;
            const badge =
              t.key === "requests" && requestCount > 0
                ? requestCount
                : t.key === "following" &&
                    (followersData?.users?.length || 0) +
                      (followingData?.users?.length || 0) >
                      0
                  ? (followersData?.users?.length || 0) +
                    (followingData?.users?.length || 0)
                  : null;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setTab(t.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: Radius.pill,
                  backgroundColor: active ? Colors.green : "transparent",
                  borderWidth: 1,
                  borderColor: active ? Colors.green : Colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1,
                    color: active ? Colors.ivory : Colors.textSecondary,
                  }}
                >
                  {t.label}
                </Text>
                {badge && (
                  <View
                    style={{
                      backgroundColor: active ? Colors.ivory : Colors.purple,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: Radius.pill,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "700",
                        color: active ? Colors.green : Colors.ivory,
                      }}
                    >
                      {badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, i) =>
            `${tab}-${item.__type || "row"}-${item.id || item.friend_id || "h"}-${i}`
          }
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 14,
            paddingBottom: insets.bottom + 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingTop: 60,
                paddingHorizontal: 24,
              }}
            >
              <currentEmpty.icon
                color={Colors.textMuted}
                size={44}
                strokeWidth={1.4}
              />
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                {currentEmpty.title}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginTop: 8,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                {currentEmpty.msg}
              </Text>
              {tab !== "requests" && (
                <TouchableOpacity
                  onPress={() => router.push("/friends/discover")}
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
                      letterSpacing: 1.2,
                      color: Colors.ivory,
                    }}
                  >
                    FIND GOLFERS
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            if (item.__type === "header") {
              return (
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    color: Colors.textMuted,
                    marginBottom: 8,
                    marginTop: 4,
                  }}
                >
                  {item.label}
                </Text>
              );
            }
            if (item.__type === "inbound") return renderInbound({ item });
            if (item.__type === "outbound") return renderOutbound({ item });
            if (item.__type === "follow" || tab === "following")
              return renderFollowing({ item });
            return renderFriend({ item });
          }}
        />
      )}
    </View>
  );
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function filterName(name, query) {
  if (!query) return true;
  return (name || "").toLowerCase().includes(query.toLowerCase());
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.card,
  },
  avatar52: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: Colors.ivoryDeep,
  },
  avatar46: {
    width: 46,
    height: 46,
    borderRadius: 23,
    overflow: "hidden",
    backgroundColor: Colors.ivoryDeep,
  },
  img: { width: "100%", height: "100%" },
  name: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  sub: { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },
  statNum: { fontSize: 18, fontWeight: "700", color: Colors.green },
  statLabel: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.8,
    color: Colors.textMuted,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.green,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  acceptBtnText: {
    color: Colors.ivory,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  declineBtn: {
    flex: 1,
    borderRadius: Radius.sm,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  declineBtnText: {
    color: Colors.textSecondary,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
};
