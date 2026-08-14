/**
 * Edit Club Memberships
 * - Search & select Home Club
 * - Add / remove / reorder Additional Member Clubs
 * - Per-membership privacy controls
 * - Prevents duplicates
 * - Defaults: new memberships are private until user changes
 */
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Search,
  X,
  Plus,
  ChevronUp,
  ChevronDown,
  Globe,
  Users,
  EyeOff,
  CheckCircle,
  Info,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import {
  HomeClubIcon,
  MemberClubIcon,
  VISIBILITY_LABELS,
} from "@/components/ClubIcons";

// ── Visibility cycle order ────────────────────────────────────────────────────
const VISIBILITY_ORDER = ["private", "friends", "public"];
const VIS_ICON = { public: Globe, friends: Users, private: EyeOff };
const VIS_COLOR = {
  public: Colors.green,
  friends: Colors.purple,
  private: Colors.textMuted,
};

// ── Course search (uses existing courses API) ─────────────────────────────────
function useCourseSearch(query) {
  return useQuery({
    queryKey: ["course-search", query],
    queryFn: async () => {
      if (!query || query.trim().length < 2) return { courses: [] };
      const r = await fetch(
        `/api/courses/list?q=${encodeURIComponent(query)}&limit=20`,
      );
      if (!r.ok) throw new Error("Search failed");
      return r.json();
    },
    enabled: query.trim().length >= 2,
  });
}

export default function EditMembershipsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTarget, setSearchTarget] = useState(null); // 'home' | 'additional'
  const [searchVisible, setSearchVisible] = useState(false);
  const debounceRef = useRef(null);
  const [debouncedQ, setDebouncedQ] = useState("");

  const handleQueryChange = (text) => {
    setSearchQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(text), 350);
  };

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: membershipData, isLoading } = useQuery({
    queryKey: ["user-memberships"],
    queryFn: async () => {
      const r = await fetch("/api/user/memberships");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const { data: searchData, isFetching: searching } =
    useCourseSearch(debouncedQ);

  const memberships = membershipData?.memberships ?? [];
  const homeClub = memberships.find((m) => m.membership_type === "home");
  const additionals = memberships
    .filter((m) => m.membership_type === "additional")
    .sort((a, b) => a.display_order - b.display_order);
  const takenNames = memberships.map((m) => m.club_name.toLowerCase());
  const searchResults = (searchData?.courses ?? []).filter(
    (c) => !takenNames.includes(c.name.toLowerCase()),
  );

  // ── Mutations ───────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async ({ clubId, clubName, membershipType }) =>
      fetch("/api/user/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubId,
          clubName,
          membershipType,
          visibility: "private",
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) {
        Alert.alert("Error", data.error);
        return;
      }
      setSearchVisible(false);
      setSearchQuery("");
      setDebouncedQ("");
      qc.invalidateQueries({ queryKey: ["user-memberships"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (membershipId) =>
      fetch("/api/user/memberships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-memberships"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ membershipId, visibility }) =>
      fetch("/api/user/memberships", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, visibility }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-memberships"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reorder) =>
      fetch("/api/user/memberships", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reorder }),
      }).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-memberships"] }),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleCycleVisibility = (m) => {
    const idx = VISIBILITY_ORDER.indexOf(m.visibility);
    const next = VISIBILITY_ORDER[(idx + 1) % VISIBILITY_ORDER.length];
    updateMutation.mutate({ membershipId: m.id, visibility: next });
  };

  const handleDelete = (m) => {
    Alert.alert(
      m.membership_type === "home" ? "Remove Home Club" : "Remove Club",
      `Remove ${m.club_name} from your profile?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => deleteMutation.mutate(m.id),
        },
      ],
    );
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    const reordered = [...additionals];
    [reordered[idx - 1], reordered[idx]] = [reordered[idx], reordered[idx - 1]];
    reorderMutation.mutate(
      reordered.map((m, i) => ({ id: m.id, display_order: i })),
    );
  };

  const handleMoveDown = (idx) => {
    if (idx === additionals.length - 1) return;
    const reordered = [...additionals];
    [reordered[idx], reordered[idx + 1]] = [reordered[idx + 1], reordered[idx]];
    reorderMutation.mutate(
      reordered.map((m, i) => ({ id: m.id, display_order: i })),
    );
  };

  const openSearch = (target) => {
    setSearchTarget(target);
    setSearchQuery("");
    setDebouncedQ("");
    setSearchVisible(true);
  };

  const selectClub = (course) => {
    addMutation.mutate({
      clubId: course.id,
      clubName: course.name,
      membershipType: searchTarget,
    });
  };

  // ── Membership row ───────────────────────────────────────────────────────────
  const renderMembershipRow = (m, idx, isHome) => {
    const VisIcon = VIS_ICON[m.visibility] ?? Globe;
    const visColor = VIS_COLOR[m.visibility];
    const visInfo = VISIBILITY_LABELS[m.visibility];
    return (
      <View
        key={m.id}
        style={{
          backgroundColor: Colors.white,
          borderRadius: Radius.md,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: Colors.border,
          overflow: "hidden",
          ...Shadow.card,
        }}
      >
        {/* Main row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 14,
            gap: 12,
          }}
        >
          {/* Icon */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.greenLight,
              justifyContent: "center",
              alignItems: "center",
              borderWidth: 1,
              borderColor: Colors.greenBorder,
            }}
          >
            {isHome ? (
              <HomeClubIcon size={17} color={Colors.green} />
            ) : (
              <MemberClubIcon size={17} color={Colors.green} />
            )}
          </View>

          {/* Club name + location */}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
              numberOfLines={1}
            >
              {m.club_name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 2,
              }}
            >
              {m.club_city && (
                <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                  {m.club_city}
                  {m.club_country ? `, ${m.club_country}` : ""}
                </Text>
              )}
              {m.joined_year && (
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                  · since {m.joined_year}
                </Text>
              )}
              {m.verified_status && (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                >
                  <CheckCircle size={10} color={Colors.green} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: Colors.green,
                      letterSpacing: 0.5,
                    }}
                  >
                    VERIFIED
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Reorder arrows (additional only) */}
          {!isHome && (
            <View style={{ flexDirection: "column", gap: 2 }}>
              <TouchableOpacity
                onPress={() => handleMoveUp(idx)}
                disabled={idx === 0}
                style={{ padding: 2, opacity: idx === 0 ? 0.3 : 1 }}
              >
                <ChevronUp
                  size={14}
                  color={Colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveDown(idx)}
                disabled={idx === additionals.length - 1}
                style={{
                  padding: 2,
                  opacity: idx === additionals.length - 1 ? 0.3 : 1,
                }}
              >
                <ChevronDown
                  size={14}
                  color={Colors.textSecondary}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Delete */}
          <TouchableOpacity
            onPress={() => handleDelete(m)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: "rgba(192,57,43,0.08)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <X size={13} color={Colors.error} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Visibility control */}
        <TouchableOpacity
          onPress={() => handleCycleVisibility(m)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 9,
            borderTopWidth: 1,
            borderTopColor: Colors.divider,
            backgroundColor: Colors.ivoryDeep,
          }}
        >
          <VisIcon size={12} color={visColor} strokeWidth={2} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: visColor,
              flex: 1,
            }}
          >
            {visInfo.label.toUpperCase()}
          </Text>
          <Text style={{ fontSize: 10, color: Colors.textMuted }}>
            {visInfo.sub} · Tap to change
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Search overlay ────────────────────────────────────────────────────────
  if (searchVisible) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
        <View
          style={{
            paddingTop: insets.top + 10,
            paddingHorizontal: Spacing.screenH,
            paddingBottom: 12,
            backgroundColor: Colors.white,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <TouchableOpacity
              onPress={() => setSearchVisible(false)}
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
                fontSize: 16,
                fontWeight: "300",
                fontStyle: "italic",
                color: Colors.textPrimary,
                flex: 1,
              }}
            >
              {searchTarget === "home" ? "Select Home Club" : "Add Member Club"}
            </Text>
          </View>
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
            }}
          >
            <Search color={Colors.textMuted} size={14} strokeWidth={1.8} />
            <TextInput
              autoFocus
              style={{
                flex: 1,
                marginLeft: 8,
                fontSize: 14,
                color: Colors.textPrimary,
              }}
              placeholder="Search for a golf club or course…"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={handleQueryChange}
            />
            {searching && (
              <ActivityIndicator size="small" color={Colors.green} />
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 14,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {debouncedQ.length < 2 && (
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Search color={Colors.textMuted} size={36} strokeWidth={1.3} />
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textMuted,
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                Type at least 2 characters to search for a club.
              </Text>
            </View>
          )}
          {debouncedQ.length >= 2 &&
            searchResults.length === 0 &&
            !searching && (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.textMuted,
                    textAlign: "center",
                  }}
                >
                  No clubs found matching "{debouncedQ}".
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textMuted,
                    marginTop: 8,
                    textAlign: "center",
                    lineHeight: 18,
                  }}
                >
                  You can still add a club manually by name if it's not listed.
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    addMutation.mutate({
                      clubId: null,
                      clubName: debouncedQ,
                      membershipType: searchTarget,
                    })
                  }
                  style={{
                    marginTop: 16,
                    backgroundColor: Colors.green,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    borderRadius: Radius.pill,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Plus color={Colors.ivory} size={14} strokeWidth={2} />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      letterSpacing: 1,
                      color: Colors.ivory,
                    }}
                  >
                    ADD "{debouncedQ.toUpperCase()}"
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          {searchResults.map((course) => (
            <TouchableOpacity
              key={course.id}
              onPress={() => selectClub(course)}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                padding: 14,
                marginBottom: 8,
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
                {searchTarget === "home" ? (
                  <HomeClubIcon size={16} color={Colors.green} />
                ) : (
                  <MemberClubIcon size={16} color={Colors.green} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {course.name}
                </Text>
                {(course.city || course.country) && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textSecondary,
                      marginTop: 1,
                    }}
                  >
                    {[course.city, course.county, course.country]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                )}
              </View>
              <Plus color={Colors.green} size={16} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* Header */}
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
          gap: 12,
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
            flex: 1,
            fontSize: 18,
            fontWeight: "300",
            fontStyle: "italic",
            color: Colors.textPrimary,
          }}
        >
          Club Memberships
        </Text>
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 20,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Privacy note */}
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              backgroundColor: Colors.greenLight,
              borderRadius: Radius.md,
              padding: 12,
              borderWidth: 1,
              borderColor: Colors.greenBorder,
              marginBottom: 22,
            }}
          >
            <Info
              size={14}
              color={Colors.green}
              strokeWidth={1.8}
              style={{ flexShrink: 0, marginTop: 1 }}
            />
            <Text
              style={{
                flex: 1,
                fontSize: 12,
                color: Colors.green,
                lineHeight: 18,
              }}
            >
              New memberships are private by default. Tap the visibility bar on
              each club to choose who can see it. Membership is not officially
              verified unless the Verified badge is shown.
            </Text>
          </View>

          {/* ── HOME CLUB ───────────────────────────────────────────────── */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textMuted,
              marginBottom: 10,
            }}
          >
            HOME CLUB
          </Text>

          {homeClub ? (
            renderMembershipRow(homeClub, 0, true)
          ) : (
            <TouchableOpacity
              onPress={() => openSearch("home")}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                borderStyle: "dashed",
                padding: 16,
                alignItems: "center",
                marginBottom: 10,
                ...Shadow.card,
                flexDirection: "row",
                gap: 10,
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
                <HomeClubIcon size={17} color={Colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                >
                  Add Home Club
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginTop: 1,
                  }}
                >
                  Your primary club membership
                </Text>
              </View>
              <Plus color={Colors.green} size={16} strokeWidth={2} />
            </TouchableOpacity>
          )}

          <Text
            style={{
              fontSize: 11,
              color: Colors.textSecondary,
              lineHeight: 17,
              marginBottom: 24,
              marginTop: 2,
            }}
          >
            Your home club is the club you hold your primary membership at. Only
            one home club can be listed.
          </Text>

          {/* ── ADDITIONAL CLUBS ─────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: Colors.textMuted,
              }}
            >
              ADDITIONAL MEMBER CLUBS
            </Text>
            <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
              {additionals.length} clubs
            </Text>
          </View>

          {additionals.map((m, idx) => renderMembershipRow(m, idx, false))}

          {/* Add more button */}
          <TouchableOpacity
            onPress={() => openSearch("additional")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: Colors.white,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: Colors.border,
              borderStyle: "dashed",
              padding: 14,
              marginBottom: 10,
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
              <MemberClubIcon size={17} color={Colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                Add Member Club
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.textSecondary,
                  marginTop: 1,
                }}
              >
                Golf clubs where you hold membership
              </Text>
            </View>
            <Plus color={Colors.green} size={16} strokeWidth={2} />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 11,
              color: Colors.textSecondary,
              lineHeight: 17,
              marginTop: 2,
              marginBottom: 8,
            }}
          >
            Add any clubs where you hold full, associate, or social membership.
            Use the arrows to reorder. Unverified memberships are self-reported.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
