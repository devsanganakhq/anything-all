import { PassportActivitySections } from "@/components/PassportActivitySections";
import { CuratedLists } from "@/components/CuratedLists";
import { PassportFavourites } from "@/components/PassportFavourites";
/**
 * Golf Passport — Lifetime Journey
 * A premium, visual record of every course played, ranked and reviewed.
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle,
  Heart,
  Star,
  Award,
  ChevronRight,
  Trophy,
  Globe,
  MapPin,
  MessageSquare,
  Users,
  Flag,
  Settings,
  TrendingUp,
  BookOpen,
  Map,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { SHOW_RANKINGS } from "@/constants/courseConstants";
import { HomeClubIcon, MemberClubIcon } from "@/components/ClubIcons";
import { Alert } from "react-native";
import { UserAvatar } from "@/components/UserAvatar";
import { useOpenUserProfile } from "@/utils/openUserProfile";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W * 0.72;

// ── Ranking card accent colours (ids match COLLECTION_CONFIG) ─────────────────
const RANKING_ACCENTS = {
  "top-100-bi": {
    color: "#C9952A",
    bg: "#FDF7EC",
    label: "Top 100 B&I",
    flag: null,
  },
  "top-100-england": {
    color: "#1B5E35",
    bg: "#EEF5F0",
    label: "Top 100 England",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  },
  "top-50-scotland": {
    color: "#6B4F8A",
    bg: "#F5F1FA",
    label: "Top 50 Scotland",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  },
  "top-50-wales": {
    color: "#C0392B",
    bg: "#FDF0EE",
    label: "Top 50 Wales",
    flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  },
  "top-25-ireland": {
    color: "#0D7A3C",
    bg: "#EBF6EF",
    label: "Top 25 Island of Ireland",
    flag: "🇮🇪",
  },
};

const PODIUM_COLORS = { 1: Colors.gold, 2: "#B8BEC6", 3: "#C4965A" };

// ── Country flag helper ───────────────────────────────────────────────────────
const COUNTRY_FLAGS = {
  England: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  Scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  Wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  Ireland: "🇮🇪",
  "Northern Ireland": "🇬🇧",
  France: "🇫🇷",
  Spain: "🇪🇸",
  Portugal: "🇵🇹",
  USA: "🇺🇸",
  Australia: "🇦🇺",
};

function passportLevel(playedCount) {
  return Math.max(1, Math.floor(Number(playedCount || 0) / 5) + 1);
}

function memberSinceLabel(profile) {
  if (profile?.member_since) {
    const raw = String(profile.member_since);
    const year = raw.match(/\d{4}/)?.[0] || raw;
    return `MEMBER SINCE ${year}`;
  }
  if (profile?.created_at) {
    return `MEMBER SINCE ${new Date(profile.created_at).getFullYear()}`;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PassportScreen() {
  const insets = useRef(useSafeAreaInsets()).current;
  const router = useRouter();
  const openUserProfile = useOpenUserProfile();
  const [lbTab, setLbTab] = useState("OVERALL");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["passport-stats"],
    queryFn: async () => {
      const r = await fetch("/api/user/passport-stats");
      if (!r.ok) throw new Error("Failed to fetch passport stats");
      return r.json();
    },
  });

  // Real profile data for the hero
  const { data: profileData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const r = await fetch("/api/user/profile");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const lbScope =
    lbTab === "THIS YEAR"
      ? "year"
      : lbTab === "FRIENDS"
        ? "friends"
        : "overall";

  const { data: leaderboardData, isLoading: lbLoading } = useQuery({
    queryKey: ["leaderboard", lbScope],
    queryFn: async () => {
      const r = await fetch(`/api/user/leaderboard?scope=${lbScope}`);
      if (!r.ok) throw new Error("Failed to fetch leaderboard");
      return r.json();
    },
  });

  const profile = profileData?.profile;
  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      profile.email?.split("@")[0] ||
      "Golfer"
    : "Golfer";
  const avatarUri = profile?.profile_photo_url || null;

  const stats = data?.stats ?? {
    played_count: 0,
    wishlist_count: 0,
    top100_bi_completed: 0,
    countries_played: 0,
    counties_played: 0,
    reviews_count: 0,
    achievements_unlocked: 0,
    friends_count: 0,
  };
  const byCountry = data?.byCountry ?? [];
  const rankingProgress = data?.rankingProgress ?? [];
  const achievements = data?.achievements ?? [];
  const memberships = data?.memberships ?? [];
  const leaderboard = leaderboardData?.leaderboard ?? [];
  const podium = [
    leaderboard.find((p) => p.rank === 1),
    leaderboard.find((p) => p.rank === 2),
    leaderboard.find((p) => p.rank === 3),
  ];
  const lbRows = leaderboard.filter((p) => p.rank > 3);

  const homeClub = memberships.find((m) => m.membership_type === "home");
  const extraClubs = memberships.filter(
    (m) => m.membership_type === "additional",
  );

  const totalAchievements = achievements.length;
  const unlockedCount = achievements.filter((a) => a.unlocked_at).length;
  const level = passportLevel(stats.played_count);
  const sinceLabel = memberSinceLabel(profile);

  // ── Section nav items ────────────────────────────────────────────────────
  const SECTIONS = [
    {
      label: "Played Courses",
      icon: CheckCircle,
      count: stats.played_count,
      color: Colors.green,
      route: "/passport/played",
    },
    {
      label: "Wish List",
      icon: Heart,
      count: stats.wishlist_count,
      color: "#C9952A",
      route: "/passport/wishlist",
    },
    ...(SHOW_RANKINGS
      ? [
          {
            label: "Ranking Progress",
            icon: TrendingUp,
            count: rankingProgress.length,
            color: Colors.purple,
            route: null,
            comingSoon: true,
          },
        ]
      : []),
    {
      label: "Reviews",
      icon: MessageSquare,
      count: stats.reviews_count,
      color: Colors.green,
      route: "/passport/played",
    },
    {
      label: "Achievements",
      icon: Award,
      count: `${unlockedCount}/${totalAchievements}`,
      color: Colors.purple,
      route: null,
      comingSoon: true,
    },
    {
      label: "My Clubs",
      icon: HomeClubIcon,
      count: memberships.length,
      color: Colors.green,
      route: "/profile/edit-memberships",
      isCustom: true,
    },
    {
      label: "Friends",
      icon: Users,
      count: stats.friends_count,
      color: Colors.green,
      route: "/friends",
    },
  ];

  if (isLoading && !data) {
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
        <ActivityIndicator size="large" color={Colors.green} />
        <Text
          style={{
            marginTop: 12,
            fontSize: 13,
            color: Colors.textSecondary,
          }}
        >
          Loading your passport…
        </Text>
      </View>
    );
  }

  if (isError && !data) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
          paddingTop: insets.top,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: Colors.textPrimary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Couldn’t load your passport
        </Text>
        <Text
          style={{
            fontSize: 13,
            color: Colors.textSecondary,
            textAlign: "center",
          }}
        >
          Check your connection and try again.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 110,
        }}
      >
        {/* ── Page title ─────────────────────────────────────────────────── */}
        <View
          style={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 16,
            paddingBottom: 6,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              color: Colors.textSecondary,
            }}
          >
            MY GOLF PASSPORT
          </Text>
          <TouchableOpacity>
            <Settings
              color={Colors.textSecondary}
              size={19}
              strokeWidth={1.6}
            />
          </TouchableOpacity>
        </View>

        {/* ── Profile hero ───────────────────────────────────────────────── */}
        <View
          style={{
            alignItems: "center",
            paddingHorizontal: Spacing.screenH,
            paddingTop: 12,
            paddingBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => router.push("/profile/edit")}
            style={{ marginBottom: 13 }}
          >
            <UserAvatar
              uri={avatarUri}
              name={displayName}
              size={82}
              borderWidth={2.5}
              borderColor={Colors.green}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            {displayName}
          </Text>
          {homeClub && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginTop: 5,
              }}
            >
              <HomeClubIcon size={12} color={Colors.textSecondary} />
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                {homeClub.club_name}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <View
              style={{
                backgroundColor: Colors.green,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: Radius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  color: Colors.ivory,
                }}
              >
                {`LEVEL ${level}`}
              </Text>
            </View>
            {sinceLabel && (
              <View
                style={{
                  backgroundColor: Colors.ivoryDeep,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: Radius.pill,
                  borderWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1,
                    color: Colors.textSecondary,
                  }}
                >
                  {sinceLabel}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Headline stats — dark green hero card ──────────────────────── */}
        <View
          style={{
            marginHorizontal: Spacing.screenH,
            backgroundColor: Colors.green,
            borderRadius: Radius.lg,
            paddingVertical: 22,
            paddingHorizontal: 18,
            marginBottom: 10,
          }}
        >
          {/* Top row — 3 primary */}
          <View style={{ flexDirection: "row", marginBottom: 18 }}>
            <HeroStat label="COURSES PLAYED" value={stats.played_count} large />
            <View
              style={{ width: 1, backgroundColor: "rgba(245,241,235,0.15)" }}
            />
            <HeroStat label="WISH LIST" value={stats.wishlist_count} large />
            <View
              style={{ width: 1, backgroundColor: "rgba(245,241,235,0.15)" }}
            />
            <HeroStat
              label={SHOW_RANKINGS ? "TOP 100 B&I" : "REVIEWS"}
              value={
                SHOW_RANKINGS ? stats.top100_bi_completed : stats.reviews_count
              }
              large
              gold={SHOW_RANKINGS}
            />
          </View>

          {/* Divider */}
          <View
            style={{
              height: 1,
              backgroundColor: "rgba(245,241,235,0.12)",
              marginBottom: 18,
            }}
          />

          {/* Bottom row — 4 secondary */}
          <View style={{ flexDirection: "row" }}>
            <HeroStat label="COUNTRIES" value={stats.countries_played} />
            <View
              style={{ width: 1, backgroundColor: "rgba(245,241,235,0.12)" }}
            />
            <HeroStat
              label="LISTS COMPLETED"
              value={stats.lists_completed || 0}
            />
            <View
              style={{ width: 1, backgroundColor: "rgba(245,241,235,0.12)" }}
            />
            <HeroStat
              label="ACHIEVEMENTS"
              value={`${stats.achievements_unlocked}`}
            />
          </View>
        </View>

        <PassportActivitySections />
        <PassportFavourites editable />
        <CuratedLists passport />
        {/* ── Courses by country mini-bar ──────────────────────────────────── */}
        {byCountry.length > 0 && (
          <View style={{ marginHorizontal: Spacing.screenH, marginBottom: 22 }}>
            <CountryBar countries={byCountry} total={stats.played_count} />
          </View>
        )}

        {/* ── RANKING PROGRESS header ─────────────────────────────────────── */}
        {SHOW_RANKINGS && (
          <>
            <SectionHeader label="RANKING PROGRESS" icon={TrendingUp} />

            {/* ── Ranking cards — horizontal scroll ──────────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{
                paddingLeft: Spacing.screenH,
                paddingRight: 10,
                paddingBottom: 6,
                gap: 12,
              }}
            >
              {rankingProgress.map((r) => (
                <RankingProgressCard
                  key={r.id}
                  data={r}
                  onPress={() =>
                    Alert.alert(
                      "Coming Soon",
                      "Ranking progress detail is coming in a future update.",
                    )
                  }
                />
              ))}
            </ScrollView>
          </>
        )}

        {/* ── MAP teaser ──────────────────────────────────────────────────── */}
        <View
          style={{
            marginHorizontal: Spacing.screenH,
            marginTop: 28,
            marginBottom: 4,
          }}
        >
          <SectionRow
            label="My Golf Map"
            icon={Map}
            detail="Played and saved courses on the map"
            onPress={() =>
              router.push({
                pathname: "/(tabs)/explore",
                params: {
                  view: "MAP",
                  filter: "MINE",
                  open: String(Date.now()),
                },
              })
            }
          />
        </View>

        {/* ── PASSPORT SECTIONS ───────────────────────────────────────────── */}
        <View style={{ marginHorizontal: Spacing.screenH, marginTop: 22 }}>
          <SectionHeader label="MY PASSPORT" icon={BookOpen} inline />
          <View style={{ gap: 9, marginTop: 10 }}>
            {SECTIONS.map((s) => (
              <PassportSectionRow
                key={s.label}
                section={s}
                onPress={() => s.route && router.push(s.route)}
              />
            ))}
          </View>
        </View>

        {/* ── BY COUNTRY breakdown ─────────────────────────────────────────── */}
        <View style={{ marginHorizontal: Spacing.screenH, marginTop: 28 }}>
          <SectionHeader label="BY COUNTRY" icon={Globe} inline />
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: Radius.lg,
              marginTop: 10,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: "hidden",
              ...Shadow.card,
            }}
          >
            {byCountry.length === 0 ? (
              <View style={{ padding: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Mark courses as played to build your country breakdown.
                </Text>
              </View>
            ) : (
              byCountry.map((c, i, arr) => {
                const maxCount = arr[0]?.count ?? 1;
                const barPct = Math.round((c.count / maxCount) * 100);
                return (
                  <View
                    key={c.country}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                      borderBottomColor: Colors.divider,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 7,
                      }}
                    >
                      <Text style={{ fontSize: 16, marginRight: 8 }}>
                        {COUNTRY_FLAGS[c.country] ?? "🌍"}
                      </Text>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 13,
                          fontWeight: "600",
                          color: Colors.textPrimary,
                        }}
                      >
                        {c.country}
                      </Text>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "700",
                          color: Colors.green,
                        }}
                      >
                        {c.count}
                      </Text>
                      <Text
                        style={{
                          fontSize: 10,
                          color: Colors.textMuted,
                          marginLeft: 4,
                          fontWeight: "600",
                        }}
                      >
                        courses
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: Colors.ivoryDeep,
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${barPct}%`,
                          height: "100%",
                          backgroundColor: Colors.green,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* ── ACHIEVEMENTS ─────────────────────────────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <View style={{ paddingHorizontal: Spacing.screenH }}>
            <SectionHeader
              label="ACHIEVEMENTS"
              icon={Award}
              inline
              extra={`${unlockedCount}/${totalAchievements}`}
            />
          </View>
          {achievements.length === 0 ? (
            <View style={{ paddingHorizontal: Spacing.screenH, marginTop: 12 }}>
              <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                Achievements will appear here as you play.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginTop: 12 }}
              contentContainerStyle={{
                paddingLeft: Spacing.screenH,
                paddingRight: 10,
                gap: 12,
              }}
            >
              {achievements.slice(0, 8).map((a, i) => (
                <AchievementBadge key={a.slug || i} achievement={a} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── LEADERBOARD ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginTop: 32 }}>
          <SectionHeader label="LEADERBOARD" icon={Trophy} gold inline />

          {/* Filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0, marginTop: 12, marginBottom: 14 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {["OVERALL", "THIS YEAR", "FRIENDS"].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setLbTab(tab)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: Radius.pill,
                  backgroundColor: lbTab === tab ? Colors.green : Colors.white,
                  borderWidth: 1,
                  borderColor: lbTab === tab ? Colors.green : Colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color: lbTab === tab ? Colors.ivory : Colors.textSecondary,
                  }}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {lbLoading && leaderboard.length === 0 ? (
            <View
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                paddingVertical: 40,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: "center",
              }}
            >
              <ActivityIndicator color={Colors.green} />
            </View>
          ) : leaderboard.length === 0 ? (
            <View
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                padding: 24,
                borderWidth: 1,
                borderColor: Colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  textAlign: "center",
                }}
              >
                No leaderboard entries yet. Mark courses as played to appear
                here.
              </Text>
            </View>
          ) : (
            <>
              {podium.some(Boolean) && (
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: Radius.lg,
                    paddingVertical: 22,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    marginBottom: 10,
                    ...Shadow.card,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      gap: 20,
                    }}
                  >
                    <PodiumItem
                      player={podium[1]}
                      rank={2}
                      size={58}
                      onPress={() => openUserProfile(podium[1]?.id)}
                    />
                    <PodiumItem
                      player={podium[0]}
                      rank={1}
                      size={74}
                      onPress={() => openUserProfile(podium[0]?.id)}
                    />
                    <PodiumItem
                      player={podium[2]}
                      rank={3}
                      size={58}
                      onPress={() => openUserProfile(podium[2]?.id)}
                    />
                  </View>
                </View>
              )}

              {lbRows.length > 0 && (
                <View
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: Radius.lg,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: Colors.border,
                    ...Shadow.card,
                  }}
                >
                  {lbRows.map((player, idx) => (
                    <TouchableOpacity
                      key={`${player.id || player.rank}-${idx}`}
                      onPress={() => openUserProfile(player.id)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 13,
                        paddingHorizontal: 16,
                        backgroundColor: player.isUser
                          ? Colors.greenLight
                          : Colors.white,
                        borderTopWidth: idx === 0 ? 0 : 1,
                        borderTopColor: Colors.divider,
                      }}
                    >
                      <Text
                        style={{
                          width: 24,
                          fontSize: 12,
                          fontWeight: "700",
                          color: player.isUser
                            ? Colors.green
                            : Colors.textMuted,
                        }}
                      >
                        {player.rank}
                      </Text>
                      <UserAvatar
                        uri={player.avatar}
                        name={player.isUser ? displayName : player.name}
                        size={34}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: player.isUser ? "700" : "600",
                            color: player.isUser
                              ? Colors.green
                              : Colors.textPrimary,
                          }}
                        >
                          {player.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: Colors.textSecondary,
                            marginTop: 1,
                          }}
                        >
                          {player.isUser
                            ? "Your position"
                            : player.country || "—"}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: "700",
                            color: player.isUser
                              ? Colors.green
                              : Colors.textPrimary,
                          }}
                        >
                          {player.courses}
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
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroStat({ label, value, large, gold }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text
        style={{
          fontSize: large ? 26 : 20,
          fontWeight: "700",
          color: gold ? Colors.gold : Colors.ivory,
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          fontSize: 7,
          fontWeight: "700",
          letterSpacing: 0.8,
          color: "rgba(245,241,235,0.5)",
          marginTop: 3,
          textAlign: "center",
          lineHeight: 10,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionHeader({ label, icon: Icon, inline, gold, extra }) {
  return (
    <View
      style={
        inline
          ? { flexDirection: "row", alignItems: "center", gap: 7 }
          : {
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: Spacing.screenH,
              gap: 7,
            }
      }
    >
      <Icon
        color={gold ? Colors.gold : Colors.textSecondary}
        size={13}
        strokeWidth={1.8}
      />
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: Colors.textSecondary,
          flex: 1,
        }}
      >
        {label}
      </Text>
      {extra && (
        <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.green }}>
          {extra}
        </Text>
      )}
    </View>
  );
}

// ─── Ranking Progress Card ────────────────────────────────────────────────────
function RankingProgressCard({ data, onPress }) {
  const accent = RANKING_ACCENTS[data.id] ?? {
    color: Colors.green,
    bg: Colors.greenLight,
    flag: null,
  };
  const playedPct = data.total > 0 ? data.played / data.total : 0;
  const wishlistPct = data.total > 0 ? data.wishlist / data.total : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        width: CARD_W,
        borderRadius: Radius.lg,
        overflow: "hidden",
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
    >
      {/* Accent top bar */}
      <View style={{ height: 4, backgroundColor: accent.color }} />

      <View style={{ padding: 18 }}>
        {/* Title row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          {accent.flag && (
            <Text style={{ fontSize: 18, marginRight: 8 }}>{accent.flag}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: Colors.textPrimary,
                lineHeight: 18,
              }}
            >
              {data.name}
            </Text>
            <Text
              style={{ fontSize: 10, color: Colors.textMuted, marginTop: 1 }}
            >
              {data.ranking_year
                ? `${data.ranking_year} Edition · ${data.total} courses`
                : `${data.total} courses`}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 9,
              paddingVertical: 4,
              backgroundColor: accent.bg,
              borderRadius: Radius.pill,
              borderWidth: 1,
              borderColor: accent.color + "40",
            }}
          >
            <Text
              style={{ fontSize: 11, fontWeight: "800", color: accent.color }}
            >
              {data.pct}%
            </Text>
          </View>
        </View>

        {/* Big number */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 42,
              fontWeight: "700",
              color: accent.color,
              letterSpacing: -1,
              lineHeight: 46,
            }}
          >
            {data.played}
          </Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "300",
              color: Colors.textMuted,
              marginBottom: 6,
              marginLeft: 3,
            }}
          >
            /{data.total}
          </Text>
        </View>

        {/* Progress bar — stacked: played | wishlist | unplayed */}
        <View
          style={{
            height: 8,
            borderRadius: 4,
            backgroundColor: Colors.ivoryDeep,
            flexDirection: "row",
            overflow: "hidden",
            marginBottom: 10,
          }}
        >
          {/* Played */}
          <View
            style={{
              flex: playedPct,
              backgroundColor: accent.color,
              minWidth: data.played > 0 ? 3 : 0,
            }}
          />
          {/* Wish List */}
          <View
            style={{
              flex: wishlistPct,
              backgroundColor: accent.color + "44",
              minWidth: data.wishlist > 0 ? 3 : 0,
            }}
          />
          {/* Unplayed fills the rest automatically */}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: "row", gap: 14 }}>
          <LegendDot color={accent.color} label="Played" count={data.played} />
          <LegendDot
            color={accent.color + "66"}
            label="Wish List"
            count={data.wishlist}
          />
          <LegendDot
            color={Colors.ivoryDeep}
            label="Unplayed"
            count={data.unplayed}
            border
          />
        </View>
      </View>

      {/* Footer tap affordance */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 5,
          paddingVertical: 11,
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 0.8,
            color: accent.color,
          }}
        >
          VIEW COLLECTION
        </Text>
        <ChevronRight size={12} color={accent.color} strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
}

function LegendDot({ color, label, count, border }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          borderWidth: border ? 1 : 0,
          borderColor: Colors.border,
        }}
      />
      <Text style={{ fontSize: 10, color: Colors.textMuted }}>{label}</Text>
      <Text
        style={{ fontSize: 10, fontWeight: "700", color: Colors.textSecondary }}
      >
        {count}
      </Text>
    </View>
  );
}

// ─── Passport Section Row ─────────────────────────────────────────────────────
function PassportSectionRow({ section, onPress }) {
  const { label, icon: Icon, count, color, isCustom, comingSoon } = section;
  const countStr = typeof count === "number" ? count.toString() : count;

  const handlePress = () => {
    if (comingSoon) {
      Alert.alert(
        "Coming Soon",
        `${label} will be available in a future update.`,
      );
      return;
    }
    if (onPress) onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.md,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
    >
      {/* Icon bubble */}
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: color + "18",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 13,
        }}
      >
        {isCustom ? (
          <Icon size={17} color={color} />
        ) : (
          <Icon color={color} size={17} strokeWidth={1.8} />
        )}
      </View>

      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "500",
          color: Colors.textPrimary,
        }}
      >
        {label}
      </Text>

      {/* Coming soon badge */}
      {comingSoon && (
        <View
          style={{
            backgroundColor: Colors.ivoryDeep,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: Radius.pill,
            marginRight: 8,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              color: Colors.textMuted,
              letterSpacing: 0.5,
            }}
          >
            SOON
          </Text>
        </View>
      )}

      {/* Count badge */}
      {!comingSoon && countStr != null && countStr !== "0" && (
        <View
          style={{
            backgroundColor: color + "18",
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: Radius.pill,
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: "800", color }}>
            {countStr}
          </Text>
        </View>
      )}
      <ChevronRight color={Colors.textMuted} size={15} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

// ─── Section navigation row ───────────────────────────────────────────────────
function SectionRow({ label, icon: Icon, detail, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.md,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
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
        <Icon color={Colors.green} size={17} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary }}
        >
          {label}
        </Text>
        {detail && (
          <Text
            style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 1 }}
          >
            {detail}
          </Text>
        )}
      </View>
      <ChevronRight color={Colors.textMuted} size={15} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}

// ─── Achievement Badge ────────────────────────────────────────────────────────
function AchievementBadge({ achievement: a }) {
  const unlocked = !!a.unlocked_at;
  return (
    <View style={{ width: 78, alignItems: "center" }}>
      <View
        style={{
          width: 62,
          height: 62,
          borderRadius: 31,
          borderWidth: 2,
          borderColor: unlocked ? Colors.purple : Colors.border,
          backgroundColor: unlocked ? Colors.purpleLight : Colors.ivoryDeep,
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 7,
          opacity: unlocked ? 1 : 0.38,
        }}
      >
        <Award
          color={unlocked ? Colors.purple : Colors.textMuted}
          size={24}
          strokeWidth={1.5}
        />
      </View>
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          textAlign: "center",
          color: unlocked ? Colors.textPrimary : Colors.textMuted,
          letterSpacing: 0.3,
          lineHeight: 13,
        }}
        numberOfLines={2}
      >
        {a.name?.toUpperCase()}
      </Text>
      {unlocked && (
        <View
          style={{
            marginTop: 4,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: Colors.purple,
          }}
        />
      )}
    </View>
  );
}

// ─── Country bar (compact stacked bar under hero) ─────────────────────────────
function CountryBar({ countries, total }) {
  if (!countries || countries.length === 0) return null;
  const COLORS = [
    "#1B5E35",
    "#C9952A",
    "#6B4F8A",
    "#C0392B",
    "#0D7A3C",
    "#2980B9",
  ];
  return (
    <View style={{ marginTop: 0 }}>
      {/* Stacked bar */}
      <View
        style={{
          height: 5,
          borderRadius: 3,
          flexDirection: "row",
          overflow: "hidden",
          backgroundColor: Colors.ivoryDeep,
        }}
      >
        {countries.slice(0, 5).map((c, i) => (
          <View
            key={c.country}
            style={{
              flex: c.count / total,
              backgroundColor: COLORS[i % COLORS.length],
            }}
          />
        ))}
      </View>
      {/* Legend */}
      <View
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 7 }}
      >
        {countries.slice(0, 5).map((c, i) => (
          <View
            key={c.country}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 3.5,
                backgroundColor: COLORS[i % COLORS.length],
              }}
            />
            <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
              {COUNTRY_FLAGS[c.country] ?? ""} {c.country} {c.count}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Podium ───────────────────────────────────────────────────────────────────
function PodiumItem({ player, rank, size, onPress }) {
  if (!player) {
    return <View style={{ width: size + 16, height: size + 60 }} />;
  }
  const color = PODIUM_COLORS[rank];
  const displayName = player.isUser
    ? "You"
    : (player.name || "Golfer").split(" ")[0];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{ alignItems: "center" }}
    >
      <UserAvatar
        uri={player.avatar}
        name={player.name}
        size={size}
        borderWidth={2.5}
        borderColor={color}
        style={{ marginBottom: 7 }}
      />
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: Radius.pill,
          marginBottom: 5,
        }}
      >
        <Text style={{ fontSize: 9, fontWeight: "700", color: Colors.white }}>
          {rank}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: Colors.textPrimary,
          textAlign: "center",
          maxWidth: 72,
        }}
        numberOfLines={2}
      >
        {displayName}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: Colors.green,
          marginTop: 1,
        }}
      >
        {player.courses}
      </Text>
    </TouchableOpacity>
  );
}
