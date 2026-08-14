import React from "react";
import { View, Text, Animated } from "react-native";
import { Image } from "expo-image";
import { Award } from "lucide-react-native";
import { HERO_HEIGHT } from "@/constants/courseConstants";
import { styles, StyleSheet_absoluteFill } from "./styles";
import { Spacing } from "@/constants/theme";
import { CourseImagePlaceholder } from "@/components/CourseImagePlaceholder";

export function CourseHero({
  heroImage,
  heroParallax,
  heroOverlayOpacity,
  courseType,
  hasRankings,
  rankings,
  RANKING_ACCENTS,
  RANKING_DEFAULT,
  // Optional — used by placeholder when no photo is available
  courseName,
  county,
  country,
}) {
  return (
    <View style={{ height: HERO_HEIGHT, overflow: "hidden" }}>
      {heroImage ? (
        /* ── Parallax photo ─────────────────────────────────────────────── */
        <Animated.View
          style={{
            transform: [{ translateY: heroParallax }],
            height: HERO_HEIGHT + 80,
          }}
        >
          <Image
            source={{ uri: heroImage }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
            transition={300}
          />
        </Animated.View>
      ) : (
        /* ── Branded placeholder (no approved photos) ───────────────────── */
        <CourseImagePlaceholder
          courseName={courseName}
          county={county}
          country={country}
          height={HERO_HEIGHT + 80}
        />
      )}

      {/* Dark overlay — only meaningful over a photo */}
      {heroImage && (
        <Animated.View
          style={{
            ...StyleSheet_absoluteFill,
            backgroundColor: "#000",
            opacity: heroOverlayOpacity,
          }}
        />
      )}

      {/* Bottom pills */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 16,
          paddingTop: 60,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={styles.heroPill}>
            <Text style={styles.heroPillText}>
              {courseType?.toUpperCase() || "GOLF COURSE"}
            </Text>
          </View>
          {hasRankings && (
            <View
              style={[
                styles.heroPill,
                { backgroundColor: "rgba(201,168,76,0.9)" },
              ]}
            >
              <Award color="#FFF" size={9} />
              <Text style={styles.heroPillText}>
                {rankings.length > 1
                  ? `${rankings.length} RANKINGS`
                  : `#${rankings[0].position} ${RANKING_ACCENTS[rankings[0].ranking_name]?.short || "RANKED"}`}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
