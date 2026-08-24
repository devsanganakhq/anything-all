/**
 * Heathland Links — Explore / Golf Course Discovery
 *
 * Toggle between:
 *   MAP  — Google Maps with status-coloured markers (unplayed/wishlisted/played)
 *   LIST — Discovery view (ranking collections, community lists, destinations)
 *
 * Markers:
 *   ● Dark green  — unplayed course
 *   ♥ Gold        — wishlisted (not yet played)
 *   ✓ Bright green — already played
 */
import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Animated,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CourseMarker,
  ClusterMarker,
  MAP_PROVIDER,
  MAP_STYLE,
  MARKER,
} from "@/components/ExploreMapShared";
import { UK_OVERVIEW_REGION, getClusterZoomRegion, normalizeMapRegion } from "@/utils/mapClustering";
import { useMapClusters } from "@/utils/useMapClusters";
import {
  Search,
  MapPin,
  Crosshair,
  Star,
  ChevronRight,
  List,
  Map as MapIcon,
  SlidersHorizontal,
  Info,
  Heart,
  CheckCircle,
  X,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Colors,
  Spacing,
  Radius,
  Shadow,
  TAB_BAR_CLEARANCE,
} from "@/constants/theme";
import { RANKING_COLLECTIONS, ACCENT_HEX } from "@/data/rankingCollections";
import { CourseImagePlaceholder } from "@/components/CourseImagePlaceholder";
import { CourseListRow } from "@/components/CourseListRow";
import { MapCoursePreviewCard, markPlayedHref } from "@/components/MapCoursePreviewCard";
import {
  courseDisplayName,
  formatCourseLocation,
  formatCourseShareLabel,
} from "@/utils/courseDisplayName";

// Keep COURSE_IMAGES as an empty fallback array so existing ref sites degrade gracefully
// while we migrate to CourseThumbnail below
const COURSE_IMAGES = [];

const FALLBACK_DEST = [
  { country: "England", course_count: 1800, flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { country: "Scotland", course_count: 550, flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { country: "Ireland", course_count: 420, flag: "🇮🇪" },
  { country: "Wales", course_count: 180, flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
];

const COUNTRY_FLAGS = {
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  ireland: "🇮🇪",
  "northern ireland": "🇬🇧",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  australia: "🇦🇺",
  "new zealand": "🇳🇿",
  spain: "🇪🇸",
  portugal: "🇵🇹",
  turkey: "🇹🇷",
  france: "🇫🇷",
  canada: "🇨🇦",
  netherlands: "🇳🇱",
  "the netherlands": "🇳🇱",
  holland: "🇳🇱",
  "isle of man": "🇮🇲",
};

function countryFlagEmoji(country) {
  if (!country) return null;
  return COUNTRY_FLAGS[String(country).trim().toLowerCase()] || null;
}

// ─── Map filters ─────────────────────────────────────────────────────────────
const MAP_FILTERS = [
  { key: "ALL", label: "ALL" },
  { key: "MINE", label: "MY COURSES" },
  { key: "PLAYED", label: "✓ PLAYED" },
  { key: "WISHLIST", label: "♥ SAVED" },
];

const MAP_EMPTY_COPY = {
  MINE: {
    title: "Your golf map is empty",
    body: "Courses you mark as played or save to your wish list will appear here.",
  },
  PLAYED: {
    title: "No played courses yet",
    body: "Mark a course as played and it will show up on your map.",
  },
  WISHLIST: {
    title: "No saved courses yet",
    body: "Save courses to your wish list to plan your next round.",
  },
};

// ─── Status badge used on course cards ───────────────────────────────────────
function StatusBadge({ played, wishlisted }) {
  if (played)
    return (
      <View
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          backgroundColor: MARKER.played.bg,
          borderRadius: Radius.pill,
          paddingHorizontal: 7,
          paddingVertical: 3,
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
        }}
      >
        <CheckCircle size={9} color="#fff" strokeWidth={2.5} />
        <Text
          style={{
            fontSize: 8,
            fontWeight: "800",
            color: "#fff",
            letterSpacing: 0.5,
          }}
        >
          PLAYED
        </Text>
      </View>
    );
  if (wishlisted)
    return (
      <View
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          backgroundColor: MARKER.wishlisted.bg,
          borderRadius: Radius.pill,
          paddingHorizontal: 7,
          paddingVertical: 3,
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
        }}
      >
        <Heart size={9} color="#fff" fill="#fff" strokeWidth={2} />
        <Text
          style={{
            fontSize: 8,
            fontWeight: "800",
            color: "#fff",
            letterSpacing: 0.5,
          }}
        >
          SAVED
        </Text>
      </View>
    );
  return null;
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const mapRef = useRef(null);

  const {
    view: paramView,
    filter: paramFilter,
    open: paramOpen,
  } = useLocalSearchParams();

  const [viewMode, setViewMode] = useState(
    paramView === "MAP" ? "MAP" : "LIST",
  );
  const [mapFilter, setMapFilter] = useState(() =>
    MAP_FILTERS.some((f) => f.key === paramFilter) ? paramFilter : "ALL",
  );
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [mapRegion, setMapRegion] = useState(UK_OVERVIEW_REGION);
  const slideAnim = useRef(new Animated.Value(300)).current;

  // This tab stays mounted, so incoming params have to be applied on every
  // navigation. `open` is a nonce the caller changes to force a re-apply.
  useEffect(() => {
    if (paramView === "MAP" || paramView === "LIST") setViewMode(paramView);
    if (MAP_FILTERS.some((f) => f.key === paramFilter)) setMapFilter(paramFilter);
  }, [paramView, paramFilter, paramOpen]);

  // ── Search state ─────────────────────────────────────────────────────────
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(text), 350);
  }, []);
  const openSearch = useCallback(() => {
    setSearchActive(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }, []);
  const closeSearch = useCallback(() => {
    clearTimeout(debounceRef.current);
    setSearchActive(false);
    setSearchQuery("");
    setDebouncedQ("");
  }, []);

  // ── Search results ───────────────────────────────────────────────────────
  const {
    data: searchResults = [],
    isFetching: searchFetching,
    isError: searchError,
  } = useQuery({
    queryKey: ["course-search", debouncedQ],
    queryFn: async () => {
      if (!debouncedQ || debouncedQ.trim().length < 2) return [];
      const res = await fetch(
        `/api/courses/list?q=${encodeURIComponent(debouncedQ)}&limit=30`,
      );
      if (!res.ok) throw new Error("Search failed");
      const json = await res.json();
      // API returns an array; guard against error-shaped payloads
      return Array.isArray(json) ? json : [];
    },
    enabled: debouncedQ.trim().length >= 2,
  });

  // ── Map data (courses + user status) ────────────────────────────────────
  const {
    data: mapData,
    refetch: refetchMap,
    isFetching: mapFetching,
  } = useQuery({
    queryKey: ["courses-map", mapFilter],
    queryFn: async () => {
      const res = await fetch(`/api/courses/map?filter=${mapFilter}`);
      if (!res.ok) throw new Error("Failed to fetch map data");
      return res.json();
    },
    staleTime: 1000 * 30, // 30 s
  });
  const mapCourses = mapData?.courses ?? [];
  const { clusters, clusterIndex, courseById } = useMapClusters(
    mapCourses,
    mapRegion,
  );

  // ── Discover data (ranking collections) ─────────────────────────────────
  const { data: coursesData = [], isLoading: coursesLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const res = await fetch("/api/courses/list");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const { data: collectionsData, isLoading: collectionsLoading } = useQuery({
    queryKey: ["ranking-collections"],
    queryFn: async () => {
      const res = await fetch("/api/rankings/collections?preview=8");
      if (!res.ok) throw new Error("Failed to fetch collections");
      return res.json();
    },
  });

  const discoverLoading = collectionsLoading || coursesLoading;

  // Merge static metadata with live API data
  const collections = RANKING_COLLECTIONS.map((meta) => {
    const live = collectionsData?.collections?.find(
      (c) => c.id === meta.id || c.ranking_name === meta.ranking_name,
    );
    const verifiedCount = live?.verified_count ?? meta.verified_count;
    const courseCount =
      live?.course_count ??
      verifiedCount ??
      meta.course_count ??
      live?.courses?.length ??
      0;
    return {
      ...meta,
      verified_count: verifiedCount,
      missing_count: live?.missing_count ?? meta.missing_count,
      is_complete: live?.is_complete ?? meta.is_complete,
      is_sample_data: live?.is_sample_data ?? meta.is_sample_data,
      course_count: courseCount,
      courses: live?.courses ?? [],
    };
  });

  // Named external ranking collections (not community-computed lists)
  const namedCollections = collections.filter(
    (c) =>
      c.ranking_source !== "HEATHLAND_LINKS_COMMUNITY" && !c.is_destinations,
  );
  const topRatedCol = collections.find((c) => c.id === "community-top-rated");
  const mostPlayedCol = collections.find((c) => c.id === "most-played");
  const trendingCol = collections.find((c) => c.id === "trending");
  const hiddenGemsCol = collections.find((c) => c.id === "hidden-gems");
  const destinationsCol = collections.find((c) => c.id === "golf-destinations");
  const fallbackCourses = coursesData.slice(0, 8);
  const destinationList =
    destinationsCol?.courses?.length > 0
      ? destinationsCol.courses.map((d) => ({
          country: d.country,
          course_count: d.course_count,
          flag: countryFlagEmoji(d.country),
        }))
      : FALLBACK_DEST;

  // ── Wishlist mutation (toggle) ───────────────────────────────────────────
  const wishlistMutation = useMutation({
    mutationFn: async (courseId) => {
      const res = await fetch("/api/activity/add-wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (result, courseId) => {
      // Update selected course preview immediately
      if (selectedCourse?.id === courseId) {
        setSelectedCourse((prev) =>
          prev ? { ...prev, user_wishlisted: result.wishlisted } : prev,
        );
      }
      qc.invalidateQueries({ queryKey: ["courses-map"] });
      qc.invalidateQueries({ queryKey: ["passport-stats"] });
      qc.invalidateQueries({ queryKey: ["passport-wishlist"] });
    },
  });

  // ── Mark as played mutation ─────────────────────────────────────────────
  const playedMutation = useMutation({
    mutationFn: async (courseId) => {
      const res = await fetch("/api/activity/mark-played", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          datePlayed: new Date().toISOString().split("T")[0],
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (_, courseId) => {
      if (selectedCourse?.id === courseId) {
        setSelectedCourse((prev) =>
          prev ? { ...prev, user_played: true, user_wishlisted: false } : prev,
        );
      }
      qc.invalidateQueries({ queryKey: ["courses-map"] });
      qc.invalidateQueries({ queryKey: ["passport-stats"] });
      qc.invalidateQueries({ queryKey: ["passport-played"] });
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  // ── Map interactions ─────────────────────────────────────────────────────
  const handleMarkerPress = useCallback(
    (course) => {
      setSelectedCourse(course);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    },
    [slideAnim],
  );

  const closePreview = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedCourse(null));
  }, [slideAnim]);

  const handleClusterPress = useCallback(
    (feature) => {
      closePreview();
      const region = getClusterZoomRegion(clusterIndex, feature);
      mapRef.current?.animateToRegion(region, 400);
      setMapRegion(region);
    },
    [clusterIndex, closePreview],
  );

  const handleRegionChangeComplete = useCallback((region) => {
    setMapRegion(normalizeMapRegion(region));
  }, []);

  const frameMapToCoords = useCallback((coords) => {
    const map = mapRef.current;
    if (!map || !coords.length) return;
    if (coords.length === 1) {
      map.animateToRegion(
        {
          ...coords[0],
          latitudeDelta: 1.2,
          longitudeDelta: 1.2,
        },
        500,
      );
      return;
    }
    map.fitToCoordinates(coords, {
      edgePadding: { top: 120, right: 56, bottom: 140, left: 56 },
      animated: true,
    });
  }, []);

  // Frame markers when map data arrives. Personal filters follow the user's
  // pins (played first); All Courses still prefers the UK/Ireland overview.
  useEffect(() => {
    if (viewMode !== "MAP" || mapCourses.length === 0) return;
    const withCoords = (courses) =>
      courses
        .map((c) => ({
          latitude: Number(c.latitude),
          longitude: Number(c.longitude),
        }))
        .filter(
          (c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
        );

    let fitCoords;
    if (mapFilter === "ALL") {
      const UK_BBOX = {
        minLat: 49.5,
        maxLat: 61,
        minLng: -11,
        maxLng: 2.2,
      };
      const all = withCoords(mapCourses);
      const localCoords = all.filter(
        (c) =>
          c.latitude >= UK_BBOX.minLat &&
          c.latitude <= UK_BBOX.maxLat &&
          c.longitude >= UK_BBOX.minLng &&
          c.longitude <= UK_BBOX.maxLng,
      );
      fitCoords = localCoords.length ? localCoords : all;
    } else {
      const played = withCoords(mapCourses.filter((c) => c.user_played));
      fitCoords = played.length ? played : withCoords(mapCourses);
    }
    if (!fitCoords.length) return;
    const t = setTimeout(() => frameMapToCoords(fitCoords), 400);
    return () => clearTimeout(t);
  }, [viewMode, mapFilter, mapCourses, paramOpen, frameMapToCoords]);

  // ── Map legend ───────────────────────────────────────────────────────────
  const MapLegend = () => (
    <View
      style={{
        position: "absolute",
        bottom: insets.bottom + TAB_BAR_CLEARANCE + (selectedCourse ? 248 : 0),
        left: Spacing.screenH,
        backgroundColor: "rgba(255,255,255,0.95)",
        borderRadius: Radius.md,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: "row",
        gap: 10,
        alignItems: "center",
        ...Shadow.card,
      }}
    >
      {[
        { color: MARKER.unplayed.bg, label: "Unplayed" },
        { color: MARKER.wishlisted.bg, label: "Saved" },
        { color: MARKER.played.bg, label: "Played" },
      ].map((item) => (
        <View
          key={item.label}
          style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
        >
          <View
            style={{
              width: 9,
              height: 9,
              borderRadius: 5,
              backgroundColor: item.color,
            }}
          />
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              color: Colors.textSecondary,
            }}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );

  // ── Shared header (JSX element — not a nested component, or TextInput remounts) ─
  const searchHeader = (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: Spacing.screenH,
        paddingBottom: 12,
        backgroundColor: Colors.white,
        borderBottomWidth: viewMode === "LIST" ? 1 : 0,
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
        {searchActive ? (
          <TouchableOpacity onPress={closeSearch} style={{ marginRight: 10 }}>
            <Text
              style={{ fontSize: 13, fontWeight: "700", color: Colors.green }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        ) : (
          <Text
            style={{
              fontSize: 22,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            Explore
          </Text>
        )}
        {!searchActive && (
          <View
            style={{
              flexDirection: "row",
              backgroundColor: Colors.ivoryDeep,
              borderRadius: Radius.md,
              padding: 3,
            }}
          >
            <ToggleBtn
              icon={MapIcon}
              label="MAP"
              active={viewMode === "MAP"}
              onPress={() => setViewMode("MAP")}
            />
            <ToggleBtn
              icon={List}
              label="LIST"
              active={viewMode === "LIST"}
              onPress={() => setViewMode("LIST")}
            />
          </View>
        )}
      </View>

      {searchActive ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.ivoryDeep,
            borderRadius: Radius.md,
            paddingHorizontal: 14,
            height: 44,
            borderWidth: 1,
            borderColor: Colors.green,
          }}
        >
          <Search color={Colors.green} size={16} strokeWidth={1.8} />
          <TextInput
            ref={searchInputRef}
            style={{
              flex: 1,
              marginLeft: 10,
              fontSize: 14,
              color: Colors.textPrimary,
            }}
            placeholder="Search courses, clubs, regions…"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            blurOnSubmit={false}
          />
          {searchFetching ? (
            <ActivityIndicator size="small" color={Colors.green} />
          ) : searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setDebouncedQ("");
                clearTimeout(debounceRef.current);
                searchInputRef.current?.focus();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X color={Colors.textMuted} size={16} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <TouchableOpacity
          onPress={openSearch}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor:
              viewMode === "MAP" ? Colors.white : Colors.ivoryDeep,
            borderRadius: Radius.md,
            paddingHorizontal: 14,
            height: 44,
            borderWidth: 1,
            borderColor: Colors.border,
            ...(viewMode === "MAP" ? Shadow.float : {}),
          }}
        >
          <Search color={Colors.textMuted} size={16} strokeWidth={1.8} />
          <Text
            style={{
              flex: 1,
              color: Colors.textMuted,
              marginLeft: 10,
              fontSize: 14,
            }}
          >
            Search courses, regions, clubs…
          </Text>
          <SlidersHorizontal
            color={Colors.textSecondary}
            size={16}
            strokeWidth={1.8}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Search overlay ────────────────────────────────────────────────────────
  if (searchActive) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
        {searchHeader}
        <FlatList
          data={searchResults}
          keyExtractor={(item) => `search-${item.id}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 12,
            paddingBottom: insets.bottom + TAB_BAR_CLEARANCE + 16,
            flexGrow: 1,
          }}
          ListEmptyComponent={
            debouncedQ.trim().length < 2 ? (
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
                  Type at least 2 characters to search
                </Text>
              </View>
            ) : searchFetching ? null : searchError ? (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.textMuted,
                    textAlign: "center",
                    paddingHorizontal: 24,
                  }}
                >
                  Couldn't reach the server. Check that the web app is running
                  and EXPO_PUBLIC_BASE_URL matches your machine IP.
                </Text>
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingTop: 48 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.textMuted,
                    textAlign: "center",
                  }}
                >
                  No courses found for "{debouncedQ}"
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <CourseListRow
              item={item}
              showRating
              onPress={() => {
                closeSearch();
                router.push(`/course/${item.id}`);
              }}
            />
          )}
        />
      </View>
    );
  }

  // ── MAP VIEW ──────────────────────────────────────────────────────────────
  if (viewMode === "MAP") {
    const mapFilterDefs = [
      { key: "ALL", label: "ALL" },
      { key: "PLAYED", label: "✓ PLAYED" },
      { key: "WISHLIST", label: "♥ SAVED" },
    ];
    return (
      <View style={{ flex: 1 }}>
        {/* Header overlay */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
          }}
        >
          {searchHeader}
          {/* Filter chips */}
          <View
            style={{
              paddingHorizontal: Spacing.screenH,
              paddingTop: 8,
              paddingBottom: 6,
              flexDirection: "row",
              gap: 8,
            }}
          >
            {mapFilterDefs.map((f) => (
              <TouchableOpacity
                key={f.key}
                onPress={() => setMapFilter(f.key)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: Radius.pill,
                  backgroundColor:
                    mapFilter === f.key ? Colors.green : Colors.white,
                  ...Shadow.card,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color:
                      mapFilter === f.key ? Colors.ivory : Colors.textPrimary,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Map */}
        <MapView
          ref={mapRef}
          provider={MAP_PROVIDER}
          style={{ flex: 1 }}
          initialRegion={UK_OVERVIEW_REGION}
          customMapStyle={
            MAP_PROVIDER === PROVIDER_GOOGLE ? MAP_STYLE : undefined
          }
          onPress={closePreview}
          onRegionChangeComplete={handleRegionChangeComplete}
        >
          {clusters.map((feature) => {
            if (feature.properties.cluster) {
              return (
                <ClusterMarker
                  key={`cluster-${feature.id}`}
                  feature={feature}
                  onPress={handleClusterPress}
                />
              );
            }
            const course =
              courseById.get(feature.properties.courseId) ??
              courseById.get(String(feature.properties.courseId));
            if (!course) return null;
            return (
              <CourseMarker
                key={course.id}
                course={course}
                onPress={handleMarkerPress}
              />
            );
          })}
        </MapView>

        {/* Locate button — personal maps go to your pins; All Courses stays on UK */}
        <TouchableOpacity
          onPress={() => {
            if (mapFilter !== "ALL") {
              const played = mapCourses.filter(
                (c) =>
                  c.user_played &&
                  Number.isFinite(Number(c.latitude)) &&
                  Number.isFinite(Number(c.longitude)),
              );
              const source = played.length ? played : mapCourses;
              const coords = source
                .map((c) => ({
                  latitude: Number(c.latitude),
                  longitude: Number(c.longitude),
                }))
                .filter(
                  (c) =>
                    Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
                );
              if (coords.length) {
                frameMapToCoords(coords);
                return;
              }
            }
            mapRef.current?.animateToRegion(UK_OVERVIEW_REGION, 600);
            setMapRegion(UK_OVERVIEW_REGION);
          }}
          style={{
            position: "absolute",
            right: Spacing.screenH,
            bottom:
              insets.bottom + TAB_BAR_CLEARANCE + (selectedCourse ? 258 : 0),
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: Colors.white,
            justifyContent: "center",
            alignItems: "center",
            ...Shadow.float,
          }}
        >
          <Crosshair color={Colors.green} size={20} strokeWidth={1.8} />
        </TouchableOpacity>

        {/* Legend */}
        <MapLegend />

        {/* Course preview panel */}
        {selectedCourse && (
          <Animated.View
            style={{
              position: "absolute",
              bottom: insets.bottom + TAB_BAR_CLEARANCE,
              left: Spacing.screenH,
              right: Spacing.screenH,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <MapCoursePreviewCard
              course={selectedCourse}
              onClose={closePreview}
              onWishlist={(courseId) => wishlistMutation.mutate(courseId)}
              wishlistPending={wishlistMutation.isPending}
              onMarkPlayed={(course) => router.push(markPlayedHref(course))}
              playedPending={playedMutation.isPending}
              onViewCourse={(course) => {
                closePreview();
                router.push(`/course/${course.id}`);
              }}
            />
          </Animated.View>
        )}
      </View>
    );
  }

  // ── LIST / DISCOVER VIEW ──────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {searchHeader}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* ── RANKING COLLECTIONS ── */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
            }}
          >
            RANKING COLLECTIONS
          </Text>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              marginTop: 2,
            }}
          >
            Curated lists of the finest courses
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            gap: 10,
            paddingBottom: 4,
          }}
        >
          {discoverLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <RankingCollectionCardSkeleton key={`rank-skel-${i}`} />
              ))
            : namedCollections.map((col) => (
                <RankingCollectionCard
                  key={col.id}
                  col={col}
                  onPress={() => {
                    router.push({
                      pathname: "/explore/list",
                      params: {
                        kind: "ranking",
                        id: col.id,
                        title: col.display_name || col.ranking_name,
                      },
                    });
                  }}
                />
              ))}
        </ScrollView>

        {/* Disclaimer */}
        <View
          style={{
            marginHorizontal: Spacing.screenH,
            marginTop: 10,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          <Info
            color={Colors.textMuted}
            size={11}
            strokeWidth={1.8}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              fontSize: 10,
              color: Colors.textMuted,
              flex: 1,
              lineHeight: 15,
            }}
          >
            Ranking collections show verified positions from published sources.
            Incomplete lists display only confirmed courses — missing spots are
            awaiting verification.
          </Text>
        </View>

        {/* ── COMMUNITY TOP RATED ── */}
        <CourseSection
          label="COMMUNITY TOP RATED"
          subtitle="Highest rated by our members"
          courses={
            topRatedCol?.courses?.length > 0
              ? topRatedCol.courses
              : fallbackCourses
          }
          loading={discoverLoading}
          onViewAll={() => {
            router.push({
              pathname: "/explore/list",
              params: {
                kind: "community",
                id: "community-top-rated",
                title: "Highest rated by members",
              },
            });
          }}
          router={router}
          offset={0}
        />

        {/* ── MOST PLAYED ── */}
        <CourseSection
          label="MOST PLAYED"
          subtitle="The courses members keep returning to"
          courses={
            mostPlayedCol?.courses?.length > 0
              ? mostPlayedCol.courses
              : fallbackCourses
          }
          loading={discoverLoading}
          onViewAll={() => {
            router.push({
              pathname: "/explore/list",
              params: {
                kind: "community",
                id: "most-played",
                title: "Most played",
              },
            });
          }}
          router={router}
          offset={1}
        />

        {/* ── TRENDING ── */}
        <CourseSection
          label="TRENDING"
          subtitle="Most played in the last 7 days"
          courses={
            trendingCol?.courses?.length > 0
              ? trendingCol.courses
              : fallbackCourses
          }
          loading={discoverLoading}
          onViewAll={() => {
            router.push({
              pathname: "/explore/list",
              params: {
                kind: "community",
                id: "trending",
                title: "Trending this week",
              },
            });
          }}
          router={router}
          offset={2}
        />

        {/* ── HIDDEN GEMS ── */}
        {/* <CourseSection
          label="HIDDEN GEMS"
          subtitle="Highly rated, waiting to be discovered"
          courses={
            hiddenGemsCol?.courses?.length > 0
              ? hiddenGemsCol.courses
              : fallbackCourses
          }
          loading={discoverLoading}
          onViewAll={() => {
            setViewMode("MAP");
            setMapFilter("ALL");
          }}
          router={router}
          offset={3}
        /> */}

        {/* ── GOLF DESTINATIONS ── */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginTop: 28 }}>
          <SectionLabel
            label="GOLF DESTINATIONS"
            subtitle="Explore by country"
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {discoverLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <DestinationCardSkeleton key={`dest-skel-${i}`} />
                ))
              : destinationList.map((dest) => (
                  <DestinationCard
                    key={dest.country}
                    dest={dest}
                    onPress={() => {
                      router.push({
                        pathname: "/explore/list",
                        params: {
                          kind: "country",
                          country: dest.country,
                          title: dest.country,
                        },
                      });
                    }}
                  />
                ))}
          </View>
        </View>

        {/* ── Community note ── */}
        <View
          style={{
            marginHorizontal: Spacing.screenH,
            marginTop: 24,
            padding: 16,
            backgroundColor: Colors.greenLight,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: Colors.greenBorder,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.2,
              color: Colors.green,
              marginBottom: 4,
            }}
          >
            ABOUT HEATHLAND LINKS COLLECTIONS
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: Colors.textSecondary,
              lineHeight: 18,
            }}
          >
            Community Top Rated, Most Played, Trending and Hidden Gems lists are
            generated from member activity on Heathland Links. Ranking
            Collections marked with a sample badge are illustrative positions
            only and do not represent any official external ranking.
          </Text>
        </View>

        {/* ── MAP SHORTCUT ── */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => setViewMode("MAP")}
            style={{
              backgroundColor: Colors.green,
              borderRadius: Radius.md,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              ...Shadow.float,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.15)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MapIcon color={Colors.ivory} size={20} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, fontWeight: "700", color: Colors.ivory }}
              >
                View Courses on Map
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(245,241,235,0.7)",
                  marginTop: 2,
                }}
              >
                See all courses with your played & saved status
              </Text>
            </View>
            <ChevronRight color={Colors.ivory} size={18} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ToggleBtn({ icon: Icon, label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: Radius.sm,
        backgroundColor: active ? Colors.white : "transparent",
        ...(active ? Shadow.card : {}),
      }}
    >
      <Icon
        color={active ? Colors.green : Colors.textMuted}
        size={14}
        strokeWidth={2}
      />
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 0.8,
          color: active ? Colors.green : Colors.textMuted,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ label, subtitle, onViewAll }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 14,
      }}
    >
      <View>
        <Text
          style={{
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.5,
            color: Colors.textSecondary,
          }}
        >
          {label}
        </Text>
        {subtitle && (
          <Text
            style={{
              fontSize: 15,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {onViewAll && (
        <TouchableOpacity
          onPress={onViewAll}
          style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
        >
          <Text
            style={{ fontSize: 11, fontWeight: "600", color: Colors.green }}
          >
            View all
          </Text>
          <ChevronRight color={Colors.green} size={12} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CourseSection({
  label,
  subtitle,
  courses,
  onViewAll,
  router,
  offset,
  loading = false,
}) {
  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ paddingHorizontal: Spacing.screenH }}>
        <SectionLabel
          label={label}
          subtitle={subtitle}
          onViewAll={loading ? undefined : onViewAll}
        />
      </View>
      {loading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            gap: 12,
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={`${label}-skel-${i}`} />
          ))}
        </ScrollView>
      ) : (
        <FlatList
          data={courses.slice(0, 8)}
          renderItem={({ item, index }) => (
            <CourseCard
              item={item}
              imgIndex={(index + offset * 2) % COURSE_IMAGES.length}
              onPress={() => router.push(`/course/${item.id}`)}
            />
          )}
          keyExtractor={(item) => `${label}-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            gap: 12,
          }}
        />
      )}
    </View>
  );
}

function RankingCollectionCard({ col, onPress }) {
  const accentHex = ACCENT_HEX[col.accentColor] || Colors.green;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 152,
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
      activeOpacity={0.8}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: `${accentHex}18`,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18 }}>{col.icon}</Text>
        </View>
        {col.is_sample_data && (
          <View
            style={{
              backgroundColor: Colors.ivoryDeep,
              paddingHorizontal: 5,
              paddingVertical: 2,
              borderRadius: Radius.sm,
            }}
          >
            <Text
              style={{
                fontSize: 7,
                fontWeight: "700",
                letterSpacing: 0.5,
                color: Colors.textMuted,
              }}
            >
              SAMPLE
            </Text>
          </View>
        )}
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: Colors.textPrimary,
          marginBottom: 3,
          lineHeight: 17,
        }}
        numberOfLines={2}
      >
        {col.ranking_name}
      </Text>
      <Text
        style={{ fontSize: 10, color: Colors.textSecondary, marginBottom: 8 }}
      >
        {col.ranking_region}
        {col.ranking_year ? ` · ${col.ranking_year}` : ""}
      </Text>
      {col.course_count > 0 ? (
        <View
          style={{
            backgroundColor: `${accentHex}12`,
            borderRadius: Radius.sm,
            paddingHorizontal: 8,
            paddingVertical: 3,
            alignSelf: "flex-start",
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              color: accentHex,
              letterSpacing: 0.5,
            }}
          >
            {col.course_count} courses
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function CourseCard({ item, imgIndex, onPress }) {
  const [imgErr, setImgErr] = React.useState(false);
  const thumbUrl =
    item.media_display_type === "club_logo" && !item.is_claimed
      ? null
      : item.resolved_thumbnail_url;
  const isLogo = item.media_display_type === "club_logo";
  const { title, subtitle } = courseDisplayName(item);
  const location = formatCourseLocation(item);

  return (
    <TouchableOpacity style={{ width: 210 }} onPress={onPress}>
      <View
        style={{
          height: 144,
          borderRadius: Radius.lg,
          overflow: "hidden",
          backgroundColor: Colors.ivoryDeep,
          position: "relative",
        }}
      >
        {thumbUrl && !imgErr ? (
          <Image
            source={{ uri: thumbUrl }}
            style={{ width: "100%", height: "100%" }}
            contentFit={isLogo ? "contain" : "cover"}
            onError={() => setImgErr(true)}
          />
        ) : (
          <CourseImagePlaceholder
            courseName={title}
            county={item.county}
            country={item.country}
            height={144}
            compact
          />
        )}
        {item.position && (
          <View
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              backgroundColor: "rgba(0,0,0,0.52)",
              borderRadius: Radius.sm,
              paddingHorizontal: 7,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#FFFFFF" }}>
              #{item.position}
            </Text>
          </View>
        )}
        <StatusBadge
          played={item.user_played}
          wishlisted={item.user_wishlisted}
        />
      </View>
      <View style={{ paddingTop: 8, paddingHorizontal: 2 }}>
        <Text
          style={{ fontSize: 13, fontWeight: "700", color: Colors.textPrimary }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontSize: 11,
              color: Colors.textSecondary,
              marginTop: 2,
            }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 3,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MapPin color={Colors.textMuted} size={10} strokeWidth={1.8} />
            <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
              {location || item.county || item.city || item.country}
            </Text>
          </View>
          {item.par ? (
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: Colors.textMuted,
              }}
            >
              Par {item.par}
            </Text>
          ) : item.community_rating > 0 ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Star color={Colors.gold} size={10} fill={Colors.gold} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                {Number(item.community_rating).toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DestinationCard({ dest, onPress }) {
  const flag = dest.flag || countryFlagEmoji(dest.country);
  const initials = (dest.country || "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: "47%",
        height: 90,
        borderRadius: Radius.lg,
        overflow: "hidden",
        backgroundColor: Colors.green,
        justifyContent: "flex-end",
        padding: 12,
      }}
      activeOpacity={0.8}
    >
      <View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{flag || initials}</Text>
          <Text
            style={{ fontSize: 14, fontWeight: "700", color: Colors.ivory }}
          >
            {dest.country}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 10,
            color: "rgba(245,241,235,0.7)",
            fontWeight: "600",
            marginTop: 2,
          }}
        >
          {dest.course_count?.toLocaleString()} courses
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonBone({ style, opacity }) {
  return (
    <Animated.View
      style={[
        {
          backgroundColor: Colors.border,
          borderRadius: Radius.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

function RankingCollectionCardSkeleton() {
  const opacity = useSkeletonPulse();
  return (
    <View
      style={{
        width: 152,
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
    >
      <SkeletonBone
        opacity={opacity}
        style={{ width: 38, height: 38, borderRadius: 19, marginBottom: 10 }}
      />
      <SkeletonBone
        opacity={opacity}
        style={{ width: "90%", height: 14, marginBottom: 6 }}
      />
      <SkeletonBone
        opacity={opacity}
        style={{ width: "65%", height: 14, marginBottom: 10 }}
      />
      <SkeletonBone
        opacity={opacity}
        style={{ width: "50%", height: 10, marginBottom: 10 }}
      />
      <SkeletonBone
        opacity={opacity}
        style={{ width: 72, height: 20, borderRadius: Radius.sm }}
      />
    </View>
  );
}

function CourseCardSkeleton() {
  const opacity = useSkeletonPulse();
  return (
    <View style={{ width: 210 }}>
      <SkeletonBone
        opacity={opacity}
        style={{
          width: "100%",
          height: 144,
          borderRadius: Radius.lg,
        }}
      />
      <View style={{ paddingTop: 8, paddingHorizontal: 2 }}>
        <SkeletonBone
          opacity={opacity}
          style={{ width: "80%", height: 13, marginBottom: 8 }}
        />
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <SkeletonBone
            opacity={opacity}
            style={{ width: "45%", height: 11 }}
          />
          <SkeletonBone opacity={opacity} style={{ width: 36, height: 11 }} />
        </View>
      </View>
    </View>
  );
}

function DestinationCardSkeleton() {
  const opacity = useSkeletonPulse();
  return (
    <SkeletonBone
      opacity={opacity}
      style={{
        width: "47%",
        height: 90,
        borderRadius: Radius.lg,
      }}
    />
  );
}
