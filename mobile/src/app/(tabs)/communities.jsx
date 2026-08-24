/**
 * Communities Tab — MY GROUPS + DISCOVER
 * Premium Heathland Links visual system
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Plus,
  Search,
  Users,
  MessageCircle,
  Lock,
  Globe,
  ChevronRight,
  Star,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "", label: "All" },
  { key: "Golf Travel", label: "Travel", emoji: "✈️" },
  { key: "Top 100 Chasers", label: "Top 100", emoji: "🏆" },
  { key: "Regional Golf", label: "Regional", emoji: "📍" },
  { key: "Golf Societies", label: "Societies", emoji: "👥" },
  { key: "Course Recommendations", label: "Courses", emoji: "⭐" },
  { key: "Golf Photography", label: "Photography", emoji: "📸" },
  { key: "Golf Architecture", label: "Architecture", emoji: "🏗️" },
  { key: "Club Communities", label: "Clubs", emoji: "🏌️" },
];

const ROLE_CONFIG = {
  admin: { label: "Owner", bg: Colors.green, text: Colors.ivory },
  moderator: { label: "Moderator", bg: Colors.purple, text: Colors.ivory },
  member: { label: "Member", bg: Colors.ivoryDeep, text: Colors.textSecondary },
};

const EMPTY_FILTERS = { query: "", debouncedQuery: "", category: "" };

export default function CommunitiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [tab, setTab] = useState("my");
  // Each tab keeps its own search + category so a filter applied in one tab
  // never silently narrows the other tab's results.
  const [filtersByTab, setFiltersByTab] = useState({
    my: EMPTY_FILTERS,
    discover: EMPTY_FILTERS,
  });
  const debounceRef = useRef(null);

  const { query, debouncedQuery, category } = filtersByTab[tab];
  const hasActiveFilters = Boolean(query || category);

  const patchFilters = useCallback((tabKey, patch) => {
    setFiltersByTab((prev) => ({
      ...prev,
      [tabKey]: { ...prev[tabKey], ...patch },
    }));
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const handleSearch = (text) => {
    const tabKey = tab;
    patchFilters(tabKey, { query: text });
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => patchFilters(tabKey, { debouncedQuery: text }),
      350,
    );
  };

  const clearFilters = () => {
    clearTimeout(debounceRef.current);
    patchFilters(tab, EMPTY_FILTERS);
  };

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["communities", tab, debouncedQuery, category],
    queryFn: async () => {
      const params = new URLSearchParams({ filter: tab });
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (category) params.set("category", category);
      const r = await fetch(`/api/communities/list?${params}`);
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const communities = data?.communities ?? [];

  const joinMutation = useMutation({
    mutationFn: async ({ communityId, communityType }) => {
      const action =
        communityType === "private" ? "request_access" : "join";
      const r = await fetch("/api/communities/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, action }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communities"] }),
  });

  // ── Render card ───────────────────────────────────────────────────────────
  const renderCard = useCallback(
    ({ item: c }) => (
      <TouchableOpacity
        onPress={() => router.push(`/communities/${c.id}`)}
        style={{
          marginBottom: 14,
          borderRadius: Radius.lg,
          overflow: "hidden",
          ...Shadow.card,
        }}
        activeOpacity={0.9}
      >
        {/* Cover image + gradient */}
        <View style={{ height: 130, backgroundColor: Colors.green }}>
          {c.cover_photo_url ? (
            <Image
              source={{ uri: c.cover_photo_url }}
              style={{ ...fill }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                ...fill,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Users color="rgba(245,241,235,0.3)" size={48} strokeWidth={1} />
            </View>
          )}
          {/* Gradient overlay */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: undefined,
              backgroundColor: "transparent",
            }}
          >
            <View
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                top: 0,
                backgroundColor: "rgba(27,56,40,0.72)",
              }}
            />
          </View>
          {/* Name + category on cover */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: Colors.ivory,
                    lineHeight: 20,
                  }}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
                {c.category && (
                  <Text
                    style={{
                      fontSize: 10,
                      color: "rgba(245,241,235,0.75)",
                      letterSpacing: 0.6,
                      marginTop: 2,
                    }}
                  >
                    {c.category.toUpperCase()}
                  </Text>
                )}
              </View>
              {/* Private badge */}
              {c.community_type === "private" && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: "rgba(0,0,0,0.4)",
                    borderRadius: Radius.pill,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Lock color={Colors.ivory} size={10} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 9,
                      color: Colors.ivory,
                      fontWeight: "700",
                    }}
                  >
                    PRIVATE
                  </Text>
                </View>
              )}
            </View>
          </View>
          {/* Role badge for MY tab */}
          {tab === "my" && c.role && ROLE_CONFIG[c.role] && (
            <View
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                backgroundColor: ROLE_CONFIG[c.role].bg,
                paddingHorizontal: 9,
                paddingVertical: 4,
                borderRadius: Radius.pill,
              }}
            >
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  color: ROLE_CONFIG[c.role].text,
                }}
              >
                {ROLE_CONFIG[c.role].label.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Card body */}
        <View
          style={{
            backgroundColor: Colors.white,
            padding: 14,
            borderWidth: 1,
            borderTopWidth: 0,
            borderColor: Colors.border,
            borderBottomLeftRadius: Radius.lg,
            borderBottomRightRadius: Radius.lg,
          }}
        >
          {c.description && (
            <Text
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                lineHeight: 19,
                marginBottom: 10,
              }}
              numberOfLines={2}
            >
              {c.description}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Users color={Colors.textMuted} size={12} strokeWidth={1.8} />
                <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                  {(c.member_count || 0).toLocaleString()} members
                </Text>
              </View>
              {(c.recent_posts || 0) > 0 && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <MessageCircle
                    color={Colors.green}
                    size={12}
                    strokeWidth={1.8}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.green,
                      fontWeight: "600",
                    }}
                  >
                    {c.recent_posts} this week
                  </Text>
                </View>
              )}
            </View>

            {tab === "discover" && !c.is_member ? (
              c.join_request_pending ? (
                <View
                  style={{
                    backgroundColor: Colors.ivoryDeep,
                    borderRadius: Radius.pill,
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    minWidth: 56,
                    minHeight: 28,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: Colors.textMuted,
                    }}
                  >
                    REQUESTED
                  </Text>
                </View>
              ) : (
              <TouchableOpacity
                onPress={(e) => {
                  e?.stopPropagation?.();
                  joinMutation.mutate({
                    communityId: c.id,
                    communityType: c.community_type,
                  });
                }}
                style={{
                  backgroundColor: Colors.green,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  minWidth: 56,
                  minHeight: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity:
                    joinMutation.isPending &&
                    joinMutation.variables?.communityId !== c.id
                      ? 0.6
                      : 1,
                }}
                disabled={joinMutation.isPending}
              >
                {joinMutation.isPending &&
                joinMutation.variables?.communityId === c.id ? (
                  <ActivityIndicator size="small" color={Colors.ivory} />
                ) : (
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: Colors.ivory,
                    }}
                  >
                    {c.community_type === "private" ? "REQUEST" : "JOIN"}
                  </Text>
                )}
              </TouchableOpacity>
              )
            ) : tab === "my" ? (
              <ChevronRight
                color={Colors.textMuted}
                size={16}
                strokeWidth={1.8}
              />
            ) : (
              <View
                style={{
                  backgroundColor: Colors.greenLight,
                  borderRadius: Radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: Colors.greenBorder,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 1,
                    color: Colors.green,
                  }}
                >
                  MEMBER
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [tab, router, joinMutation],
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: insets.top + 14,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 0,
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
            marginBottom: 12,
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
            Communities
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/communities/create")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.green,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Plus color={Colors.ivory} size={18} strokeWidth={2} />
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
            placeholder="Search communities…"
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={handleSearch}
          />
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
          {[
            { key: "my", label: "MY GROUPS" },
            { key: "discover", label: "DISCOVER" },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.pill,
                backgroundColor: tab === t.key ? Colors.green : "transparent",
                borderWidth: 1,
                borderColor: tab === t.key ? Colors.green : Colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.2,
                  color: tab === t.key ? Colors.ivory : Colors.textSecondary,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Category filter — scoped to the active tab */}
      <View
        style={{
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingVertical: 10,
            gap: 6,
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = category === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                onPress={() =>
                  patchFilters(tab, { category: active ? "" : cat.key })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: Radius.pill,
                  backgroundColor: active ? Colors.green : Colors.ivoryDeep,
                  borderWidth: 1,
                  borderColor: active ? Colors.green : Colors.border,
                }}
              >
                {cat.emoji && <Text style={{ fontSize: 11 }}>{cat.emoji}</Text>}
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 0.6,
                    color: active ? Colors.ivory : Colors.textSecondary,
                  }}
                >
                  {cat.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
          data={communities}
          renderItem={renderCard}
          keyExtractor={(c) => `community-${c.id}`}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 16,
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
                paddingTop: 60,
                paddingHorizontal: 24,
              }}
            >
              <Users color={Colors.textMuted} size={48} strokeWidth={1.3} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginTop: 16,
                  textAlign: "center",
                }}
              >
                {tab === "my" && !hasActiveFilters
                  ? "No communities yet"
                  : "No communities found"}
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
                {hasActiveFilters
                  ? "Try a different search or category."
                  : tab === "my"
                    ? "Discover and join golf communities to connect with like-minded golfers."
                    : "There are no communities to show right now."}
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity
                  onPress={clearFilters}
                  style={{
                    marginTop: 20,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: Colors.green,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      letterSpacing: 1.2,
                      color: Colors.green,
                    }}
                  >
                    CLEAR FILTERS
                  </Text>
                </TouchableOpacity>
              )}
              {tab === "my" && !hasActiveFilters && (
                <TouchableOpacity
                  onPress={() => setTab("discover")}
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
                    DISCOVER COMMUNITIES
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const fill = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };
