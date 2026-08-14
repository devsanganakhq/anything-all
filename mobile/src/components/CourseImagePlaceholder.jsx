/**
 * CourseImagePlaceholder — Heathland Links
 *
 * Premium branded placeholder shown whenever a course has no approved image.
 * Used consistently across: course detail, search, rankings, map cards,
 * passport, wishlist, social feed, club discovery screens.
 *
 * Props:
 *   courseName    string   — displayed course name
 *   county        string?  — county / region
 *   country       string?  — country
 *   width         number   — container width  (default fills parent)
 *   height        number   — container height (default 220)
 *   style         object?  — additional View style overrides
 *   compact       boolean  — minimal layout for small cards / thumbnails
 */
import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Colors } from "@/constants/theme";

// ── Subtle dot-pattern SVG rendered as a background tint ─────────────────────
// We replicate it with a pure-RN layered approach for zero external deps

const BRAND_GREENS = [
  "#1B3828", // primary brand green
  "#162D20",
  "#1E4030",
];

export function CourseImagePlaceholder({
  courseName = "Golf Course",
  county,
  country,
  height = 220,
  style,
  compact = false,
}) {
  // Pick a deterministic tint shade based on course name length so siblings
  // look gently varied without being random on re-render
  const bgIndex = useMemo(
    () => (courseName?.length ?? 0) % BRAND_GREENS.length,
    [courseName],
  );
  const bg = BRAND_GREENS[bgIndex];

  const locationStr = [county, country].filter(Boolean).join(", ");

  return (
    <View
      style={[
        {
          height,
          backgroundColor: bg,
          overflow: "hidden",
          justifyContent: "flex-end",
          alignItems: "flex-start",
        },
        style,
      ]}
    >
      {/* ── Decorative concentric arc lines (top-right) ─────────────────── */}
      <ArcDecoration />

      {/* ── Subtle dot grid overlay ──────────────────────────────────────── */}
      <DotGrid />

      {/* ── Bottom gradient block ────────────────────────────────────────── */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: compact ? 12 : 18,
          paddingTop: compact ? 20 : 36,
          paddingBottom: compact ? 10 : 16,
        }}
      >
        {/* Brand mark */}
        {!compact && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginBottom: 10,
            }}
          >
            <HeatherMark size={12} />
            <Text
              style={{
                fontSize: 8,
                fontWeight: "700",
                letterSpacing: 2,
                color: "rgba(245,241,235,0.55)",
              }}
            >
              HEATHLAND LINKS
            </Text>
          </View>
        )}

        {/* Course name */}
        <Text
          style={{
            fontSize: compact ? 13 : 22,
            fontWeight: "300",
            fontStyle: "italic",
            color: "rgba(245,241,235,0.95)",
            lineHeight: compact ? 17 : 28,
            marginBottom: compact ? 2 : 5,
          }}
          numberOfLines={compact ? 2 : 3}
        >
          {courseName}
        </Text>

        {/* Location */}
        {locationStr.length > 0 && (
          <Text
            style={{
              fontSize: compact ? 9 : 11,
              fontWeight: "600",
              letterSpacing: 0.5,
              color: "rgba(245,241,235,0.5)",
            }}
            numberOfLines={1}
          >
            {locationStr}
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Internal decorative elements ──────────────────────────────────────────────

function ArcDecoration() {
  // Three concentric quarter-circle arcs in the top-right corner
  return (
    <View
      style={{ position: "absolute", top: -20, right: -20 }}
      pointerEvents="none"
    >
      {[120, 80, 44].map((size, i) => (
        <View
          key={size}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 1,
            borderColor: `rgba(245,241,235,${0.06 + i * 0.03})`,
          }}
        />
      ))}
    </View>
  );
}

function DotGrid() {
  // 5×4 grid of tiny dots
  const dots = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      dots.push(
        <View
          key={`${row}-${col}`}
          style={{
            width: 3,
            height: 3,
            borderRadius: 1.5,
            backgroundColor: "rgba(245,241,235,0.07)",
            margin: 5,
          }}
        />,
      );
    }
  }
  return (
    <View
      style={{
        position: "absolute",
        top: 24,
        left: 18,
        flexDirection: "row",
        flexWrap: "wrap",
        width: 80,
      }}
      pointerEvents="none"
    >
      {dots}
    </View>
  );
}

function HeatherMark({ size = 14 }) {
  // Simple stylised diamond/flag mark as pure View
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.2,
        backgroundColor: "rgba(201,168,76,0.7)",
        transform: [{ rotate: "45deg" }],
      }}
    />
  );
}

export default CourseImagePlaceholder;
