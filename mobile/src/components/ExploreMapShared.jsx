/**
 * Shared Explore map pieces — provider, styled map, status pins.
 */
import React, { useEffect, useState } from "react";
import { View, Platform } from "react-native";
import { Marker, PROVIDER_GOOGLE } from "react-native-maps";

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

/**
 * Status-coloured map pin used on Explore map and filtered list maps.
 * Android only snapshots custom marker views while tracksViewChanges is true.
 */
export function CourseMarker({ course, onPress }) {
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
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: Math.max(4, size - 6),
            height: Math.max(4, size - 6),
            borderRadius: Math.max(2, (size - 6) / 2),
            backgroundColor: style.bg,
          }}
        />
      </View>
    </Marker>
  );
}
