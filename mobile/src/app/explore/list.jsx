/**
 * Explore — full course list for a ranking collection, community list, or country.
 * Map mode reuses the Explore map pins + map style.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Map as MapIcon, List } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { CourseListRow } from "@/components/CourseListRow";
import {
  CourseMarker,
  ClusterMarker,
  MAP_PROVIDER,
  MAP_STYLE,
  MARKER,
} from "@/components/ExploreMapShared";
import { getClusterZoomRegion, normalizeMapRegion } from "@/utils/mapClustering";
import { useMapClusters } from "@/utils/useMapClusters";
import {
  MapCoursePreviewCard,
  markPlayedHref,
} from "@/components/MapCoursePreviewCard";
import { courseDisplayName } from "@/utils/courseDisplayName";

function sortCoursesByName(rows) {
  return [...rows].sort((a, b) => {
    const titleA = courseDisplayName(a).title;
    const titleB = courseDisplayName(b).title;
    return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
  });
}

function hasCoords(course) {
  const lat = Number(course?.latitude);
  const lng = Number(course?.longitude);
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}

function regionForCourses(courses) {
  const points = courses.filter(hasCoords).map((c) => ({
    latitude: Number(c.latitude),
    longitude: Number(c.longitude),
  }));
  if (!points.length) {
    return {
      latitude: 54.0,
      longitude: -2.5,
      latitudeDelta: 12,
      longitudeDelta: 12,
    };
  }
  if (points.length === 1) {
    return {
      latitude: points[0].latitude,
      longitude: points[0].longitude,
      latitudeDelta: 0.6,
      longitudeDelta: 0.6,
    };
  }
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.35, 0.35),
    longitudeDelta: Math.max((maxLng - minLng) * 1.35, 0.35),
  };
}

export default function ExploreCourseListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef(null);
  const { kind, id, title, country } = useLocalSearchParams();
  const heading = title || country || "Courses";
  const [viewMode, setViewMode] = useState("list");
  const [selected, setSelected] = useState(null);
  const qc = useQueryClient();

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
      if (selected?.id === courseId) {
        setSelected((prev) =>
          prev ? { ...prev, user_wishlisted: result.wishlisted } : prev,
        );
      }
      qc.invalidateQueries({ queryKey: ["courses-map"] });
      qc.invalidateQueries({ queryKey: ["passport-stats"] });
      qc.invalidateQueries({ queryKey: ["passport-wishlist"] });
      qc.invalidateQueries({ queryKey: ["explore-list", kind, id, country] });
    },
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["explore-list", kind, id, country],
    queryFn: async () => {
      if (kind === "country") {
        const res = await fetch(
          `/api/courses/list?country=${encodeURIComponent(country || "")}&limit=200&sort=name`,
        );
        if (!res.ok) throw new Error("Failed to load courses");
        const rows = await res.json();
        return sortCoursesByName(Array.isArray(rows) ? rows : []);
      }
      const res = await fetch(
        `/api/rankings/collections?id=${encodeURIComponent(id || "")}&preview=200`,
      );
      if (!res.ok) throw new Error("Failed to load courses");
      const json = await res.json();
      return json.collections?.[0]?.courses ?? [];
    },
  });

  // Merge played / wishlist status from the main map feed so pins match Explore.
  const { data: mapStatusData } = useQuery({
    queryKey: ["courses-map", "ALL"],
    queryFn: async () => {
      const res = await fetch("/api/courses/map?filter=ALL");
      if (!res.ok) return { courses: [] };
      return res.json();
    },
    staleTime: 60_000,
  });

  const statusById = useMemo(() => {
    const map = new Map();
    for (const c of mapStatusData?.courses ?? []) {
      map.set(String(c.id), {
        user_played: !!c.user_played,
        user_wishlisted: !!c.user_wishlisted,
        resolved_thumbnail_url: c.resolved_thumbnail_url,
        media_display_type: c.media_display_type,
      });
    }
    return map;
  }, [mapStatusData]);

  const courses = useMemo(() => {
    const rows = data ?? [];
    return rows.map((c) => {
      const status = statusById.get(String(c.id));
      return status ? { ...c, ...status } : c;
    });
  }, [data, statusById]);

  const mappedCourses = useMemo(() => courses.filter(hasCoords), [courses]);
  const fitRegion = useMemo(
    () => regionForCourses(mappedCourses),
    [mappedCourses],
  );
  const [mapViewport, setMapViewport] = useState(fitRegion);
  const { clusters, clusterIndex, courseById } = useMapClusters(
    mappedCourses,
    mapViewport,
  );

  useEffect(() => {
    setMapViewport(fitRegion);
  }, [fitRegion]);

  useEffect(() => {
    if (viewMode !== "map") return;
    const t = setTimeout(() => {
      mapRef.current?.animateToRegion(fitRegion, 350);
    }, 80);
    return () => clearTimeout(t);
  }, [viewMode, fitRegion]);

  const handleRegionChangeComplete = useCallback((region) => {
    setMapViewport(normalizeMapRegion(region));
  }, []);

  const handleClusterPress = useCallback(
    (feature) => {
      setSelected(null);
      const region = getClusterZoomRegion(clusterIndex, feature);
      mapRef.current?.animateToRegion(region, 400);
      setMapViewport(region);
    },
    [clusterIndex],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <CourseListRow
        item={item}
        onPress={() => router.push(`/course/${item.id}`)}
      />
    ),
    [router],
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          zIndex: 2,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <ChevronLeft color={Colors.green} size={24} strokeWidth={1.8} />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: "700",
            color: Colors.textPrimary,
          }}
          numberOfLines={1}
        >
          {heading}
        </Text>

        {viewMode === "list" ? (
          <TouchableOpacity
            onPress={() => {
              setSelected(null);
              setViewMode("map");
            }}
            disabled={isLoading || !mappedCourses.length}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: Colors.green,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: Radius.pill,
              opacity: isLoading || !mappedCourses.length ? 0.45 : 1,
            }}
          >
            <MapIcon color={Colors.ivory} size={14} strokeWidth={2} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: Colors.ivory,
              }}
            >
              MAP
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => {
              setSelected(null);
              setViewMode("list");
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: Colors.greenLight,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: Radius.pill,
              borderWidth: 1,
              borderColor: Colors.green,
            }}
          >
            <List color={Colors.green} size={14} strokeWidth={2} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: Colors.green,
              }}
            >
              LIST
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : isError ? (
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ padding: 32, alignItems: "center" }}
        >
          <Text style={{ color: Colors.green, fontWeight: "700" }}>
            Couldn’t load this list. Tap to retry.
          </Text>
        </TouchableOpacity>
      ) : viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            provider={MAP_PROVIDER}
            style={{ flex: 1 }}
            initialRegion={fitRegion}
            customMapStyle={
              MAP_PROVIDER === PROVIDER_GOOGLE ? MAP_STYLE : undefined
            }
            onPress={() => setSelected(null)}
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
                  key={String(course.id)}
                  course={course}
                  onPress={setSelected}
                />
              );
            })}
          </MapView>

          <View
            style={{
              position: "absolute",
              top: 12,
              left: Spacing.screenH,
              right: Spacing.screenH,
              backgroundColor: "rgba(255,255,255,0.94)",
              borderRadius: Radius.md,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: Colors.border,
              ...Shadow.card,
            }}
          >
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
              Showing {mappedCourses.length} of {courses.length} courses with
              map locations
            </Text>
          </View>

          {/* Legend — same colours as Explore map */}
          <View
            style={{
              position: "absolute",
              left: Spacing.screenH,
              bottom: selected ? insets.bottom + 268 : insets.bottom + 16,
              backgroundColor: "rgba(255,255,255,0.94)",
              borderRadius: Radius.md,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: Colors.border,
              gap: 6,
            }}
          >
            {[
              { label: "Unplayed", ...MARKER.unplayed },
              { label: "Wishlist", ...MARKER.wishlisted },
              { label: "Played", ...MARKER.played },
            ].map((item) => (
              <View
                key={item.label}
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: item.bg,
                    borderWidth: 1.5,
                    borderColor: item.border,
                  }}
                />
                <Text style={{ fontSize: 10, color: Colors.textSecondary }}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>

          {selected ? (
            <View
              style={{
                position: "absolute",
                left: Spacing.screenH,
                right: Spacing.screenH,
                bottom: insets.bottom + 16,
              }}
            >
              <MapCoursePreviewCard
                course={selected}
                onClose={() => setSelected(null)}
                onWishlist={(courseId) => wishlistMutation.mutate(courseId)}
                wishlistPending={wishlistMutation.isPending}
                onMarkPlayed={(course) => router.push(markPlayedHref(course))}
                onViewCourse={(course) => {
                  setSelected(null);
                  router.push(`/course/${course.id}`);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item, index) => String(item.id ?? index)}
          renderItem={renderItem}
          contentContainerStyle={{
            padding: Spacing.screenH,
            paddingBottom: insets.bottom + 24,
          }}
          ListEmptyComponent={
            <Text
              style={{
                textAlign: "center",
                color: Colors.textSecondary,
                marginTop: 40,
              }}
            >
              No courses in this list yet.
            </Text>
          }
        />
      )}
    </View>
  );
}
