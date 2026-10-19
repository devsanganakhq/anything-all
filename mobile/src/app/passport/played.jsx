import { useLocalSearchParams } from "expo-router";
/**
 * Passport — Played Courses
 * Full list of every course the signed-in user has marked as played.
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  CheckCircle,
  Star,
  MapPin,
  Calendar,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
} from "@/utils/courseDisplayName";

const COURSE_TYPE_COLOR = {
  Links: Colors.green,
  Heathland: "#8B6914",
  Parkland: "#2E7D32",
  Moorland: "#5D4037",
};

export default function PlayedCoursesScreen() {
  const { userId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["passport-played", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/user/played-courses?page=${pageParam}${userId ? `&userId=${userId}` : ""}`,
      );
      if (!res.ok) throw new Error("Failed to fetch played courses");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const courses = data?.pages.flatMap((p) => p.courses) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  const renderItem = useCallback(
    ({ item }) => (
      <TouchableOpacity
        onPress={() => router.push(`/course/${item.course_id}`)}
        style={{
          backgroundColor: Colors.white,
          borderRadius: Radius.md,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: Colors.border,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          ...Shadow.card,
        }}
      >
        {/* Green tick */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.greenLight,
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <CheckCircle color={Colors.green} size={20} strokeWidth={1.8} />
        </View>

        <View style={{ flex: 1 }}>
          {(() => {
            const { title, subtitle } = courseDisplayName(item);
            const location = formatCourseLocation(item, {
              includeCounty: true,
            });
            return (
              <>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                  numberOfLines={1}
                >
                  {title}
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
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    marginTop: 3,
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
              </>
            );
          })()}

          {/* Date + rating row */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 5,
            }}
          >
            {item.date_played && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Calendar
                  color={Colors.textMuted}
                  size={10}
                  strokeWidth={1.8}
                />
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                  {new Date(item.date_played).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            )}
            {item.rating > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
              >
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={10}
                    color={Colors.gold}
                    fill={s <= item.rating ? Colors.gold : "transparent"}
                    strokeWidth={1.5}
                  />
                ))}
              </View>
            )}
            {item.course_type && (
              <View
                style={{
                  backgroundColor: Colors.ivoryDeep,
                  borderRadius: Radius.sm,
                  paddingHorizontal: 5,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "700",
                    letterSpacing: 0.5,
                    color:
                      COURSE_TYPE_COLOR[item.course_type] || Colors.textMuted,
                  }}
                >
                  {item.course_type.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [router],
  );

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
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
            }}
          >
            Played Courses
          </Text>
          {total > 0 && (
            <Text
              style={{
                fontSize: 11,
                color: Colors.textSecondary,
                marginTop: 1,
              }}
            >
              {total} course{total !== 1 ? "s" : ""} played
            </Text>
          )}
        </View>
        {/* Count badge */}
        <View
          style={{
            backgroundColor: Colors.green,
            borderRadius: Radius.pill,
            paddingHorizontal: 12,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "700", color: Colors.ivory }}
          >
            {total}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={Colors.green} size="large" />
          <Text
            style={{ marginTop: 12, fontSize: 13, color: Colors.textMuted }}
          >
            Loading your rounds…
          </Text>
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: "center",
            }}
          >
            Couldn't load played courses. Pull to retry.
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderItem}
          keyExtractor={(item) => `played-${item.id}`}
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 16,
            paddingBottom: insets.bottom + 40,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.green}
            />
          }
          onEndReached={() =>
            hasNextPage && !isFetchingNextPage && fetchNextPage()
          }
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                color={Colors.green}
                style={{ paddingVertical: 16 }}
              />
            ) : null
          }
          ListEmptyComponent={
            <View
              style={{
                flex: 1,
                alignItems: "center",
                paddingTop: 60,
                paddingHorizontal: 24,
              }}
            >
              <CheckCircle color={Colors.border} size={48} strokeWidth={1.2} />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "300",
                  fontStyle: "italic",
                  color: Colors.textPrimary,
                  textAlign: "center",
                  marginTop: 16,
                  marginBottom: 8,
                }}
              >
                No rounds recorded yet
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Visit a course page and tap "Mark as Played" to add your first
                round to your Golf Passport.
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/explore")}
                style={{
                  marginTop: 24,
                  backgroundColor: Colors.green,
                  paddingHorizontal: 24,
                  paddingVertical: 13,
                  borderRadius: Radius.pill,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    color: Colors.ivory,
                  }}
                >
                  EXPLORE COURSES
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}
