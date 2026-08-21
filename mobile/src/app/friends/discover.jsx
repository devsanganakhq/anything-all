/**
 * Discover Golfers — real-time search with send/cancel/follow actions
 */
import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Search,
  UserPlus,
  MapPin,
  Award,
  Check,
  UserCheck,
  Rss,
  Users,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";

export default function DiscoverGolfersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const debounceRef = useRef(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const handleSearch = (text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 350);
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["social", "search", debouncedQuery],
    queryFn: async () => {
      const r = await fetch(
        `/api/social/search?q=${encodeURIComponent(debouncedQuery)}&limit=30`,
      );
      if (!r.ok) throw new Error("Search failed");
      return r.json();
    },
    staleTime: 30_000,
  });

  const users = data?.users ?? [];

  // ── Mutations ────────────────────────────────────────────────────────────────
  const friendRequestMutation = useMutation({
    mutationFn: async (friendId) => {
      const r = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social", "search"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const cancelRequestMutation = useMutation({
    mutationFn: async (friendId) => {
      await fetch("/api/friends/request", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "search"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "search"] }),
  });

  // ── Render one golfer card ───────────────────────────────────────────────────
  const renderUser = useCallback(
    ({ item: u }) => {
      const isFriend = u.friendship_status === "accepted";
      const isPending = u.friendship_status === "pending";
      const outbound = isPending && u.request_initiator_id !== u.id;
      const inbound = isPending && u.request_initiator_id === u.id;
      const isFollowing = u.is_following;

      return (
        <TouchableOpacity
          onPress={() => router.push(`/social/${u.id}`)}
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: Colors.border,
            ...Shadow.card,
          }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <UserAvatar uri={u.avatar} name={u.name} size={58} />

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                {u.name}
              </Text>

              {u.home_club && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 3,
                  }}
                >
                  <Award color={Colors.textMuted} size={11} strokeWidth={1.8} />
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                    {u.home_club}
                  </Text>
                </View>
              )}

              {u.location && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 2,
                  }}
                >
                  <MapPin
                    color={Colors.textMuted}
                    size={11}
                    strokeWidth={1.8}
                  />
                  <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                    {u.location}
                  </Text>
                </View>
              )}

              {u.mutual_friends_count > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    marginTop: 5,
                    backgroundColor: Colors.greenLight,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: Radius.pill,
                    alignSelf: "flex-start",
                  }}
                >
                  <Users color={Colors.green} size={10} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: Colors.green,
                    }}
                  >
                    {u.mutual_friends_count} mutual{" "}
                    {u.mutual_friends_count === 1 ? "friend" : "friends"}
                  </Text>
                </View>
              )}
            </View>

            {u.courses_played != null && (
              <View style={{ alignItems: "center", marginLeft: 8 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: Colors.green,
                  }}
                >
                  {u.courses_played}
                </Text>
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color: Colors.textMuted,
                  }}
                >
                  COURSES
                </Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          {!isFriend && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {/* Friend request button */}
              {outbound ? (
                <TouchableOpacity
                  onPress={() => cancelRequestMutation.mutate(u.id)}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    borderRadius: Radius.sm,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <Check color={Colors.green} size={13} strokeWidth={2.5} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: Colors.textSecondary,
                      letterSpacing: 0.5,
                    }}
                  >
                    REQUEST SENT
                  </Text>
                </TouchableOpacity>
              ) : inbound ? (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: Colors.greenLight,
                    borderRadius: Radius.sm,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <UserCheck color={Colors.green} size={13} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: Colors.green,
                      letterSpacing: 0.5,
                    }}
                  >
                    SENT YOU A REQUEST
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => friendRequestMutation.mutate(u.id)}
                  style={{
                    flex: 1,
                    backgroundColor: Colors.green,
                    borderRadius: Radius.sm,
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <UserPlus color={Colors.ivory} size={13} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: Colors.ivory,
                      letterSpacing: 0.5,
                    }}
                  >
                    ADD FRIEND
                  </Text>
                </TouchableOpacity>
              )}

              {/* Follow toggle */}
              <TouchableOpacity
                onPress={() => followMutation.mutate(u.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: isFollowing ? Colors.green : Colors.border,
                  backgroundColor: isFollowing
                    ? Colors.greenLight
                    : "transparent",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Rss
                  color={isFollowing ? Colors.green : Colors.textSecondary}
                  size={13}
                  strokeWidth={1.8}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: isFollowing ? Colors.green : Colors.textSecondary,
                    letterSpacing: 0.5,
                  }}
                >
                  {isFollowing ? "FOLLOWING" : "FOLLOW"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isFriend && (
            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: Colors.greenLight,
                borderRadius: Radius.sm,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <UserCheck color={Colors.green} size={13} strokeWidth={2} />
              <Text
                style={{ fontSize: 11, fontWeight: "700", color: Colors.green }}
              >
                FRIENDS
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [router, friendRequestMutation, cancelRequestMutation, followMutation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
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
            marginBottom: 14,
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
              fontSize: 20,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              marginLeft: 12,
            }}
          >
            Discover Golfers
          </Text>
          {isFetching && (
            <ActivityIndicator
              color={Colors.green}
              size="small"
              style={{ marginLeft: "auto" }}
            />
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.ivory,
            borderRadius: Radius.md,
            paddingHorizontal: 12,
            paddingVertical: 11,
            borderWidth: 1,
            borderColor: Colors.border,
          }}
        >
          <Search color={Colors.textMuted} size={15} strokeWidth={1.8} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 15,
              color: Colors.textPrimary,
            }}
            placeholder="Search by name or club…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
          />
        </View>
      </View>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {isLoading && !data ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <Search color={Colors.textMuted} size={44} strokeWidth={1.4} />
          <Text
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: Colors.textPrimary,
              marginTop: 16,
            }}
          >
            Couldn't load golfers
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
            Check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={{
              marginTop: 20,
              backgroundColor: Colors.green,
              borderRadius: Radius.sm,
              paddingVertical: 10,
              paddingHorizontal: 20,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: Colors.ivory,
                letterSpacing: 0.5,
              }}
            >
              TRY AGAIN
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(u) => `user-${u.id}`}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 16,
            paddingBottom: insets.bottom + 100,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            users.length > 0 ? (
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  color: Colors.textMuted,
                  marginBottom: 12,
                }}
              >
                {debouncedQuery
                  ? `RESULTS FOR "${debouncedQuery.toUpperCase()}"`
                  : "SUGGESTED FOR YOU"}
              </Text>
            ) : null
          }
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
              <Search color={Colors.textMuted} size={44} strokeWidth={1.4} />
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginTop: 16,
                }}
              >
                {debouncedQuery
                  ? "No golfers found"
                  : "Find your golfing network"}
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
                {debouncedQuery
                  ? "Try a different name or home club."
                  : "Search for golfers by name, home club or location."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
