import { useLocalSearchParams } from "expo-router";
/**
 * Passport — Wish List
 * All courses the signed-in user has saved to their wishlist.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Heart, MapPin, Star } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
} from "@/utils/courseDisplayName";

export default function WishlistScreen() {
  const { userId } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();

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
    queryKey: ["passport-wishlist", userId],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await fetch(
        `/api/user/wishlist?page=${pageParam}${userId ? `&userId=${userId}` : ""}`,
      );
      if (!res.ok) throw new Error("Failed to fetch wishlist");
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const courses = data?.pages.flatMap((p) => p.courses) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Remove from wishlist (toggle)
  const removeMutation = useMutation({
    mutationFn: async (courseId) => {
      const res = await fetch("/api/activity/add-wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      if (!res.ok) throw new Error("Failed to update wishlist");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport-wishlist", userId] });
      qc.invalidateQueries({ queryKey: ["passport-stats"] });
    },
  });

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
        {/* Purple heart */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: Colors.purpleLight,
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <Heart
            color={Colors.purple}
            size={18}
            fill={Colors.purple}
            strokeWidth={1.8}
          />
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 5,
            }}
          >
            {item.community_rating > 0 && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <Star color={Colors.gold} size={10} fill={Colors.gold} />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: Colors.textPrimary,
                  }}
                >
                  {Number(item.community_rating).toFixed(1)}
                </Text>
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
                    color: Colors.textMuted,
                  }}
                >
                  {item.course_type.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Remove button */}
        <TouchableOpacity
          disabled={!!userId}
          onPress={() => removeMutation.mutate(item.course_id)}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: Colors.purpleLight,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: Colors.purpleBorder,
          }}
        >
          <Heart
            color={Colors.purple}
            size={14}
            fill={Colors.purple}
            strokeWidth={1.8}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    ),
    [router, removeMutation],
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
            Wish List
          </Text>
          {total > 0 && (
            <Text
              style={{
                fontSize: 11,
                color: Colors.textSecondary,
                marginTop: 1,
              }}
            >
              {total} course{total !== 1 ? "s" : ""} saved
            </Text>
          )}
        </View>
        <View
          style={{
            backgroundColor: Colors.purple,
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
            Loading your wish list…
          </Text>
        </View>
      ) : (
        <FlatList
          data={courses}
          renderItem={renderItem}
          keyExtractor={(item) => `wl-${item.id}`}
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
              <Heart color={Colors.border} size={48} strokeWidth={1.2} />
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
                Your wish list is empty
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Browse courses and tap the heart icon to save them to your wish
                list.
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
