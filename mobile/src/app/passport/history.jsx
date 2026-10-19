import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Colors, Spacing, Radius } from "@/constants/theme";
export default function History() {
  const router = useRouter(),
    insets = useSafeAreaInsets(),
    { userId } = useLocalSearchParams();
  const [kind, setKind] = useState("rounds");
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["activity-history", kind, userId],
    initialPageParam: 0,
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    queryFn: async ({ pageParam }) => {
      const r = await fetch(
        `/api/activity/${kind}?offset=${pageParam}${userId ? `&userId=${userId}` : ""}`,
      );
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      return j;
    },
  });
  const rows = data?.pages.flatMap((page) => page[kind]) || [];
  const currentUserId = data?.pages[0]?.currentUserId;
  return (
    <View
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: Colors.ivory }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: Spacing.screenH }}
      >
        <Text style={{ color: Colors.green }}>‹ Passport</Text>
      </TouchableOpacity>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          paddingHorizontal: Spacing.screenH,
          marginBottom: 16,
        }}
      >
        {["rounds", "reviews"].map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setKind(k)}
            style={{
              padding: 14,
              backgroundColor: k === kind ? Colors.green : Colors.white,
              borderRadius: Radius.sm,
            }}
          >
            <Text style={{ color: k === kind ? Colors.ivory : Colors.green }}>
              {k === "rounds" ? "Rounds" : "Reviews"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? (
        <ActivityIndicator color={Colors.green} />
      ) : isError ? (
        <TouchableOpacity onPress={refetch}>
          <Text style={{ padding: 20 }}>
            Unable to load activity. Tap to retry.
          </Text>
        </TouchableOpacity>
      ) : (
        <FlatList
          data={rows}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={Colors.green} />
            ) : null
          }
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            padding: Spacing.screenH,
            paddingBottom: insets.bottom + 25,
          }}
          ListEmptyComponent={
            <Text style={{ color: Colors.textSecondary }}>
              No {kind} recorded yet.
            </Text>
          }
          renderItem={({ item }) => (
            <View
              style={{
                padding: 16,
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                marginBottom: 12,
              }}
            >
              <TouchableOpacity
                onPress={() => router.push(`/course/${item.course_id}`)}
              >
                <Text style={{ color: Colors.textPrimary, fontSize: 16 }}>
                  {[item.club_name, item.course_name]
                    .filter(Boolean)
                    .filter((x, i, a) => a.indexOf(x) === i)
                    .join(", ")}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
                {String(item.date_played).slice(0, 10)}
                {item.rating ? ` · ${Number(item.rating).toFixed(1)}/5` : ""}
              </Text>
              <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>
                {item.review_text || item.comments}
              </Text>
              {(!userId || Number(userId) === currentUserId) && (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/activity/mark-played",
                      params: {
                        courseId: item.course_id,
                        courseName: item.course_name,
                        mode: kind === "reviews" ? "review" : "round",
                        activityId: item.id,
                      },
                    })
                  }
                  style={{ paddingVertical: 12 }}
                >
                  <Text style={{ color: Colors.green }}>
                    Edit {kind === "reviews" ? "review" : "round"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}
