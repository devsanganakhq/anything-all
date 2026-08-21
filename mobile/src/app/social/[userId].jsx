/**
 * Public golfer profile
 * Route: /social/:userId
 * Shows profile, stats, recent courses, achievements, mutual friends.
 * Handles all connection states: stranger, pending, friend, following, blocked.
 * Never exposes email or precise location.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  MapPin,
  Award,
  UserPlus,
  UserCheck,
  UserMinus,
  Rss,
  MoreHorizontal,
  Star,
  Lock,
  Users,
  CheckCircle,
  Trophy,
  Flag,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { HomeClubIcon, MemberClubIcon } from "@/components/ClubIcons";
import { UserAvatar } from "@/components/UserAvatar";

export default function GolferProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId } = useLocalSearchParams();
  const targetId = parseInt(userId, 10);
  const qc = useQueryClient();

  // ── Fetch profile ─────────────────────────────────────────────────────────
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["social", "profile", targetId],
    queryFn: async () => {
      const r = await fetch(`/api/social/profile/${targetId}`);
      if (!r.ok) throw new Error("Failed to load profile");
      return r.json();
    },
    enabled: !!targetId && !isNaN(targetId),
  });

  const profile = data?.profile ?? null;
  const isSelf = profile?.is_self === true;
  const achievements = data?.achievements ?? [];
  const recentCourses = data?.recentCourses ?? [];
  const mutualFriends = data?.mutualFriends ?? [];
  const clubMemberships = data?.clubMemberships ?? [];
  const homeClub = clubMemberships.find((m) => m.membership_type === "home");
  const additionals = clubMemberships
    .filter((m) => m.membership_type === "additional")
    .sort((a, b) => a.display_order - b.display_order);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const requestMutation = useMutation({
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
      qc.invalidateQueries({ queryKey: ["social", "profile", targetId] });
      qc.invalidateQueries({ queryKey: ["friends"] });
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
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["social", "profile", targetId] }),
  });

  const removeMutation = useMutation({
    mutationFn: async (friendId) => {
      await fetch("/api/friends/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["social", "profile", targetId] }),
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
      qc.invalidateQueries({ queryKey: ["social", "profile", targetId] }),
  });

  const blockMutation = useMutation({
    mutationFn: async (targetUserId) => {
      const r = await fetch("/api/social/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social", "profile", targetId] });
      qc.invalidateQueries({ queryKey: ["friends"] });
      router.back();
    },
  });

  // ── Action menu ───────────────────────────────────────────────────────────
  const handleMenu = useCallback(() => {
    Alert.alert(profile?.name ?? "Options", undefined, [
      {
        text: "Block User",
        style: "destructive",
        onPress: () =>
          Alert.alert(
            "Block User",
            `Block ${profile?.name}? They won't be able to see your profile or contact you.`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Block",
                style: "destructive",
                onPress: () => blockMutation.mutate(targetId),
              },
            ],
          ),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [profile, blockMutation, targetId]);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
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
          Profile unavailable
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: Colors.textSecondary,
            marginTop: 8,
            textAlign: "center",
          }}
        >
          This profile may be private or the user may have blocked you.
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
              letterSpacing: 1.2,
              color: Colors.ivory,
            }}
          >
            GO BACK
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Private profile (non-friend) ─────────────────────────────────────────
  if (profile.private) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
        <ProfileHeader
          onBack={() => router.back()}
          onMenu={!isSelf ? handleMenu : undefined}
        />
        <View
          style={{
            alignItems: "center",
            paddingTop: 60,
            paddingHorizontal: 32,
          }}
        >
          <UserAvatar
            uri={profile.avatar}
            name={profile.name}
            size={80}
            style={{ marginBottom: 14 }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            {profile.name}
          </Text>
          <View
            style={{
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: Colors.ivoryDeep,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: Radius.pill,
            }}
          >
            <Lock color={Colors.textMuted} size={13} strokeWidth={1.8} />
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
              Private profile
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              marginTop: 14,
              textAlign: "center",
              lineHeight: 21,
            }}
          >
            Send a friend request to see {profile.name}'s rounds, reviews and
            achievements.
          </Text>
          {profile.friendship_status !== "accepted" && (
            <TouchableOpacity
              onPress={() => requestMutation.mutate(targetId)}
              style={{
                marginTop: 20,
                backgroundColor: Colors.green,
                paddingHorizontal: 28,
                paddingVertical: 13,
                borderRadius: Radius.pill,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <UserPlus color={Colors.ivory} size={15} strokeWidth={2} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: Colors.ivory,
                }}
              >
                ADD FRIEND
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Connection state ──────────────────────────────────────────────────────
  const fs = profile.friendship_status;
  const isFriend = fs === "accepted";
  const isPending = fs === "pending";
  const outbound = isPending && profile.request_initiator_id !== targetId;
  const inbound = isPending && profile.request_initiator_id === targetId;
  const isFollowing = profile.is_following;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <ProfileHeader
        onBack={() => router.back()}
        onMenu={!isSelf ? handleMenu : undefined}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── Profile card ──────────────────────────────────────────────── */}
        <View
          style={{
            backgroundColor: Colors.white,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            paddingHorizontal: Spacing.screenH,
            paddingTop: 24,
            paddingBottom: 20,
            alignItems: "center",
          }}
        >
          {/* Avatar */}
          <UserAvatar
            uri={profile.avatar}
            name={profile.name}
            size={88}
            borderWidth={2}
            borderColor={Colors.border}
            style={{ marginBottom: 12 }}
          />

          <Text
            style={{
              fontSize: 22,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            {profile.name}
          </Text>

          {profile.location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 5,
              }}
            >
              <MapPin
                color={Colors.textSecondary}
                size={12}
                strokeWidth={1.8}
              />
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                {profile.location}
              </Text>
            </View>
          )}

          {profile.handicap != null && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: Colors.textMuted,
                }}
              >
                HCP
              </Text>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: Colors.green }}
              >
                {profile.handicap}
              </Text>
            </View>
          )}

          {/* ── Club memberships ────────────────────────────────────────── */}
          {(homeClub || additionals.length > 0) && (
            <View style={{ width: "100%", marginTop: 12, gap: 7 }}>
              {homeClub && (
                <TouchableOpacity
                  onPress={() =>
                    homeClub.course_id &&
                    router.push(`/course/${homeClub.course_id}`)
                  }
                  activeOpacity={homeClub.course_id ? 0.75 : 1}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 9,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: Colors.greenBorder,
                    backgroundColor: Colors.greenLight,
                  }}
                >
                  <HomeClubIcon size={17} color={Colors.green} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: Colors.green,
                      }}
                      numberOfLines={1}
                    >
                      {homeClub.club_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textSecondary,
                        marginTop: 1,
                      }}
                    >
                      Home Club
                      {homeClub.joined_year
                        ? ` · since ${homeClub.joined_year}`
                        : ""}
                    </Text>
                  </View>
                  {homeClub.verified_status && (
                    <CheckCircle
                      size={12}
                      color={Colors.green}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              )}
              {additionals.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() =>
                    m.course_id && router.push(`/course/${m.course_id}`)
                  }
                  activeOpacity={m.course_id ? 0.75 : 1}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 9,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    backgroundColor: Colors.white,
                  }}
                >
                  <MemberClubIcon size={17} color={Colors.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: Colors.textPrimary,
                      }}
                      numberOfLines={1}
                    >
                      {m.club_name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textMuted,
                        marginTop: 1,
                      }}
                    >
                      Member Club
                      {m.joined_year ? ` · since ${m.joined_year}` : ""}
                    </Text>
                  </View>
                  {m.verified_status && (
                    <CheckCircle
                      size={12}
                      color={Colors.green}
                      strokeWidth={2}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Fall back to legacy home_club field if no structured memberships */}
          {!homeClub && !additionals.length && profile.home_club && (
            <View
              style={{
                marginTop: 10,
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: Radius.pill,
                borderWidth: 1,
                borderColor: Colors.greenBorder,
                backgroundColor: Colors.greenLight,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <HomeClubIcon size={14} color={Colors.green} />
              <Text
                style={{ fontSize: 12, fontWeight: "700", color: Colors.green }}
              >
                {profile.home_club}
              </Text>
              {profile.member_since && (
                <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                  · {profile.member_since}
                </Text>
              )}
            </View>
          )}

          {profile.bio && (
            <Text
              style={{
                fontSize: 14,
                color: Colors.textSecondary,
                textAlign: "center",
                marginTop: 12,
                lineHeight: 21,
                paddingHorizontal: 16,
              }}
            >
              {profile.bio}
            </Text>
          )}

          {/* Stats row */}
          {(profile.courses_played != null ||
            profile.follower_count != null) && (
            <View
              style={{
                flexDirection: "row",
                marginTop: 18,
                borderTopWidth: 1,
                borderTopColor: Colors.divider,
                paddingTop: 16,
                width: "100%",
              }}
            >
              {profile.courses_played != null && (
                <StatPill label="COURSES" value={profile.courses_played} />
              )}
              {profile.countries_played != null &&
                profile.countries_played > 0 && (
                  <StatPill
                    label="COUNTRIES"
                    value={profile.countries_played}
                  />
                )}
              <StatPill label="FRIENDS" value={profile.friend_count ?? 0} />
              <StatPill label="FOLLOWERS" value={profile.follower_count ?? 0} />
            </View>
          )}

          {/* Connection actions */}
          {!isSelf && (
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 16,
                width: "100%",
              }}
            >
              {/* Friend button */}
              {isFriend ? (
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert(
                      "Remove Friend",
                      `Remove ${profile.name} from your friends?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => removeMutation.mutate(targetId),
                        },
                      ],
                    )
                  }
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    backgroundColor: Colors.greenLight,
                    borderRadius: Radius.sm,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: Colors.greenBorder,
                  }}
                >
                  <UserCheck color={Colors.green} size={15} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: Colors.green,
                      letterSpacing: 0.5,
                    }}
                  >
                    FRIENDS
                  </Text>
                </TouchableOpacity>
              ) : outbound ? (
                <TouchableOpacity
                  onPress={() => cancelRequestMutation.mutate(targetId)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    backgroundColor: Colors.ivoryDeep,
                    borderRadius: Radius.sm,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <CheckCircle color={Colors.green} size={15} strokeWidth={2} />
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
                <TouchableOpacity
                  onPress={() => router.push("/friends")}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    backgroundColor: Colors.green,
                    borderRadius: Radius.sm,
                    paddingVertical: 12,
                  }}
                >
                  <UserPlus color={Colors.ivory} size={15} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: Colors.ivory,
                      letterSpacing: 0.5,
                    }}
                  >
                    RESPOND TO REQUEST
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => requestMutation.mutate(targetId)}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                    backgroundColor: Colors.green,
                    borderRadius: Radius.sm,
                    paddingVertical: 12,
                  }}
                >
                  <UserPlus color={Colors.ivory} size={15} strokeWidth={2} />
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

              {/* Follow / unfollow */}
              <TouchableOpacity
                onPress={() => followMutation.mutate(targetId)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: Radius.sm,
                  borderWidth: 1,
                  borderColor: isFollowing ? Colors.green : Colors.border,
                  backgroundColor: isFollowing
                    ? Colors.greenLight
                    : "transparent",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Rss
                  color={isFollowing ? Colors.green : Colors.textSecondary}
                  size={14}
                  strokeWidth={1.8}
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                    color: isFollowing ? Colors.green : Colors.textSecondary,
                  }}
                >
                  {isFollowing ? "FOLLOWING" : "FOLLOW"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Mutual friends ───────────────────────────────────────────────── */}
        {mutualFriends.length > 0 && !isSelf && (
          <Section label={`MUTUAL FRIENDS (${profile.mutual_friends_count})`}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                  paddingHorizontal: Spacing.screenH,
                  paddingVertical: 4,
                }}
              >
                {mutualFriends.map((mf) => (
                  <TouchableOpacity
                    key={mf.id}
                    onPress={() => router.push(`/social/${mf.id}`)}
                    style={{ alignItems: "center", width: 60 }}
                  >
                    <UserAvatar
                      uri={mf.avatar}
                      name={mf.name}
                      size={48}
                      style={{ marginBottom: 5 }}
                    />
                    <Text
                      style={{
                        fontSize: 10,
                        color: Colors.textSecondary,
                        textAlign: "center",
                      }}
                      numberOfLines={1}
                    >
                      {mf.name.split(" ")[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Section>
        )}

        {/* ── Recent courses ───────────────────────────────────────────────── */}
        {recentCourses.length > 0 && (
          <Section label="RECENTLY PLAYED">
            <View style={{ gap: 8, paddingHorizontal: Spacing.screenH }}>
              {recentCourses.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => router.push(`/course/${c.id}`)}
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: Radius.md,
                    padding: 12,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: Colors.border,
                    ...Shadow.card,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: Colors.greenLight,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Flag color={Colors.green} size={15} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: Colors.textPrimary,
                      }}
                    >
                      {c.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: Colors.textSecondary,
                        marginTop: 1,
                      }}
                    >
                      {c.city}, {c.country} · {c.course_type}
                    </Text>
                  </View>
                  {c.rating && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 2,
                      }}
                    >
                      <Star
                        size={12}
                        color={Colors.gold}
                        fill={Colors.gold}
                        strokeWidth={1.5}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: Colors.gold,
                        }}
                      >
                        {c.rating}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        )}

        {/* ── Achievements ─────────────────────────────────────────────────── */}
        {achievements.length > 0 && (
          <Section label={`ACHIEVEMENTS (${achievements.length})`}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  paddingHorizontal: Spacing.screenH,
                  paddingBottom: 4,
                }}
              >
                {achievements.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      width: 110,
                      borderRadius: Radius.md,
                      padding: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: Colors.purpleBorder,
                      backgroundColor: Colors.purpleLight,
                    }}
                  >
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: "rgba(107,79,138,0.15)",
                        borderWidth: 2,
                        borderColor: Colors.purple,
                        justifyContent: "center",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <Trophy
                        color={Colors.purple}
                        size={19}
                        strokeWidth={1.6}
                      />
                    </View>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: Colors.purple,
                        textAlign: "center",
                        lineHeight: 15,
                      }}
                    >
                      {a.name}
                    </Text>
                    <Text
                      style={{
                        fontSize: 9,
                        color: Colors.textSecondary,
                        textAlign: "center",
                        marginTop: 3,
                        lineHeight: 13,
                      }}
                    >
                      {a.description}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Section>
        )}

        {/* Empty state when no activity */}
        {recentCourses.length === 0 &&
          achievements.length === 0 &&
          mutualFriends.length === 0 && (
            <View
              style={{
                alignItems: "center",
                paddingTop: 40,
                paddingHorizontal: 32,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textMuted,
                  textAlign: "center",
                }}
              >
                {profile.name}'s activity will appear here once visible.
              </Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ProfileHeader({ onBack, onMenu }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingHorizontal: Spacing.screenH,
        paddingBottom: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <TouchableOpacity
        onPress={onBack}
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
          fontSize: 12,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: Colors.textSecondary,
        }}
      >
        PROFILE
      </Text>
      {onMenu ? (
        <TouchableOpacity onPress={onMenu} style={{ padding: 6 }}>
          <MoreHorizontal
            color={Colors.textSecondary}
            size={20}
            strokeWidth={1.8}
          />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 36 }} />
      )}
    </View>
  );
}

function StatPill({ label, value }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{ fontSize: 20, fontWeight: "700", color: Colors.textPrimary }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 8,
          fontWeight: "700",
          letterSpacing: 1,
          color: Colors.textMuted,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Section({ label, children }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: Colors.textSecondary,
          paddingHorizontal: Spacing.screenH,
          marginBottom: 12,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}
