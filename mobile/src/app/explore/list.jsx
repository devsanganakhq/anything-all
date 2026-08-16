/**
 * Explore — full course list for a ranking collection, community list, or country.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, MapPin, Star } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
} from "@/utils/courseDisplayName";

export default function ExploreCourseListScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { kind, id, title, country } = useLocalSearchParams();
  const heading = title || country || "Courses";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["explore-list", kind, id, country],
    queryFn: async () => {
      if (kind === "country") {
        const res = await fetch(
          `/api/courses/list?country=${encodeURIComponent(country || "")}&limit=200`,
        );
        if (!res.ok) throw new Error("Failed to load courses");
        const rows = await res.json();
        return Array.isArray(rows) ? rows : [];
      }
      const res = await fetch(
        `/api/rankings/collections?id=${encodeURIComponent(id || "")}&preview=200`,
      );
      if (!res.ok) throw new Error("Failed to load courses");
      const json = await res.json();
      return json.collections?.[0]?.courses ?? [];
    },
  });

  const courses = data ?? [];

  const renderItem = useCallback(
    ({ item }) => {
      const { title: clubTitle, subtitle } = courseDisplayName(item);
      const location = formatCourseLocation(item);
      return (
        <TouchableOpacity
          onPress={() => router.push(`/course/${item.id}`)}
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.md,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 14,
            ...Shadow.card,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {item.position ? (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "800",
                  color: Colors.gold,
                  width: 36,
                }}
              >
                #{item.position}
              </Text>
            ) : null}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
                numberOfLines={1}
              >
                {clubTitle}
              </Text>
              {subtitle ? (
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.textSecondary,
                    marginTop: 2,
                  }}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              ) : null}
              {location ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    marginTop: 4,
                  }}
                >
                  <MapPin
                    color={Colors.textMuted}
                    size={11}
                    strokeWidth={1.8}
                  />
                  <Text
                    style={{ fontSize: 11, color: Colors.textSecondary }}
                    numberOfLines={1}
                  >
                    {location}
                  </Text>
                </View>
              ) : null}
            </View>
            {item.community_rating > 0 ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Star color={Colors.gold} size={11} fill={Colors.gold} />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                >
                  {Number(item.community_rating).toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    },
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
