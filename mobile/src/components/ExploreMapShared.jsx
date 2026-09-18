/**
 * Shared Explore map pieces — provider, styled map, status pins, clusters.
 */
import React, { useEffect, useState } from "react";
import { View, Text, Platform } from "react-native";
import { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Colors } from "@/constants/theme";
import { getClusterStyle } from "@/utils/mapClustering";

export const MAP_PROVIDER =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || Platform.OS === "android"
    ? PROVIDER_GOOGLE
    : undefined;

export const MARKER = {
  played: { bg: "#2C6E49", border: "#1B4D35" },
  wishlisted: { bg: "#C9A84C", border: "#A8843A" },
  unplayed: { bg: "#1B3828", border: "#0E1E15" },
};

export function getMarkerStyle(course) {
  if (course?.user_played) return MARKER.played;
  if (course?.user_wishlisted) return MARKER.wishlisted;
  return MARKER.unplayed;
}

export const MAP_STYLE = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "landscape",
    elementType: "geometry",
    stylers: [{ color: "#F0EBE0" }],
  },
  { featureType: "landscape.natural", stylers: [{ color: "#E8F0E4" }] },
  { featureType: "water", stylers: [{ color: "#C9D8E8" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7A8570" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#1B3828" }],
  },
];

function courseMarkerPropsEqual(prev, next) {
  const pc = prev.course;
  const nc = next.course;
  return (
    pc?.id === nc?.id &&
    pc?.latitude === nc?.latitude &&
    pc?.longitude === nc?.longitude &&
    pc?.user_played === nc?.user_played &&
    pc?.user_wishlisted === nc?.user_wishlisted &&
    prev.onPress === next.onPress
  );
}

function clusterMarkerPropsEqual(prev, next) {
  const pf = prev.feature;
  const nf = next.feature;
  return (
    pf?.id === nf?.id &&
    pf?.properties?.point_count === nf?.properties?.point_count &&
    pf?.geometry?.coordinates?.[0] === nf?.geometry?.coordinates?.[0] &&
    pf?.geometry?.coordinates?.[1] === nf?.geometry?.coordinates?.[1] &&
    pf?.properties?.played === nf?.properties?.played &&
    pf?.properties?.wishlisted === nf?.properties?.wishlisted &&
    prev.onPress === next.onPress
  );
}

/**
 * Status-coloured map pin used on Explore map and filtered list maps.
 * Android only snapshots custom marker views while tracksViewChanges is true.
 */
export const CourseMarker = React.memo(function CourseMarker({ course, onPress }) {
  const style = getMarkerStyle(course);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const size = course?.user_played ? 14 : course?.user_wishlisted ? 13 : 10;
  const lat = Number(course?.latitude);
  const lng = Number(course?.longitude);

  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 400);
    return () => clearTimeout(t);
  }, [course?.user_played, course?.user_wishlisted, course?.id]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={() => onPress?.(course)}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: style.bg,
          borderWidth: 2,
          borderColor: style.border,
        }}
      />
    </Marker>
  );
}, courseMarkerPropsEqual);

function clusterSize(pointCount) {
  if (pointCount >= 100) return 48;
  if (pointCount >= 25) return 40;
  if (pointCount >= 10) return 36;
  return 32;
}

/**
 * Cluster badge for grouped course pins at low zoom levels.
 * Android marker bitmaps clip edge/border pixels unless the snapshot
 * view is larger than the circle and marked non-collapsable.
 */
export const ClusterMarker = React.memo(function ClusterMarker({
  feature,
  onPress,
}) {
  const coords = feature?.geometry?.coordinates;
  if (!coords) return null;
  const [lng, lat] = coords;
  const pointCount = feature.properties.point_count ?? 0;
  const style = getClusterStyle(feature.properties);
  const size = clusterSize(pointCount);
  const pad = 6;
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true);
    const t = setTimeout(() => setTracksViewChanges(false), 400);
    return () => clearTimeout(t);
  }, [pointCount, lat, lng]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={() => onPress?.(feature)}
      tracksViewChanges={tracksViewChanges}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View
        collapsable={false}
        style={{
          width: size + pad * 2,
          height: size + pad * 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        }}
      >
        <View
          collapsable={false}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: style.bg,
            borderWidth: 2,
            borderColor: style.border,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <Text
            style={{
              fontSize: pointCount >= 100 ? 11 : 12,
              fontWeight: "700",
              color: Colors.ivory,
              textAlign: "center",
              includeFontPadding: false,
            }}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {pointCount >= 1000 ? "999+" : pointCount}
          </Text>
        </View>
      </View>
    </Marker>
  );
}, clusterMarkerPropsEqual);
