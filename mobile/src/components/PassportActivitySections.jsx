import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { courseDisplayName, formatCourseLocation } from "@/utils/courseDisplayName";
import { ReviewPhotos } from "@/components/Home/ReviewPhotos";

export function PassportActivitySection({ kind, label, userId }) {
  const router = useRouter();
  const history = kind === "rounds" || kind === "reviews";
  const query = useInfiniteQuery({
    queryKey: ["passport-inline", kind, userId],
    initialPageParam: history ? 0 : 1,
    queryFn: async ({ pageParam }) => {
      const endpoint = history ? `/api/activity/${kind}?offset=${pageParam}` : `/api/user/${kind === "played" ? "played-courses" : "wishlist"}?page=${pageParam}`;
      const response = await fetch(`${endpoint}${userId ? `&userId=${encodeURIComponent(userId)}` : ""}`);
      if (!response.ok) throw new Error("Unable to load passport section");
      return response.json();
    },
    getNextPageParam: (last) => history ? last.nextOffset ?? undefined : last.hasMore ? last.page + 1 : undefined,
  });
  const rows = query.data?.pages.flatMap(page => history ? page[kind] || [] : page.courses || []) || [];
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.4, marginBottom: 10 }}>
        {label.toUpperCase()}
      </Text>
      {query.isLoading && <ActivityIndicator color={Colors.green} style={{ paddingVertical: 12 }} />}
      {query.isError && <TouchableOpacity onPress={() => query.refetch()} style={{ paddingVertical: 12 }}><Text style={{ color: Colors.textSecondary }}>Unable to load. Tap to retry.</Text></TouchableOpacity>}
      {!query.isLoading && !query.isError && rows.length === 0 && <Text style={{ color: Colors.textSecondary, fontSize: 13, paddingVertical: 8 }}>No {label.toLowerCase()} yet.</Text>}
      {rows.map(item => <View key={item.id || item.course_id} style={{ backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, marginTop: 10, marginBottom: 8, ...Shadow.card }}>
        <TouchableOpacity onPress={() => router.push(`/course/${item.course_id}`)} accessibilityRole="button">
          <Text style={{ color: Colors.textPrimary, fontSize: 14, fontWeight: "600" }}>{courseDisplayName({ ...item, name: item.course_name || item.name }).title}</Text>
          <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 4 }}>{history ? String(item.date_played || "").slice(0, 10) : formatCourseLocation(item)}</Text>
        </TouchableOpacity>
        {history && (item.review_text || item.comments) ? <Text style={{ color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{item.review_text || item.comments}</Text> : null}
        {kind === "reviews" && Array.isArray(item.photos) && item.photos.length > 0 ? <ReviewPhotos urls={item.photos} /> : null}
        {history && (!userId || Number(userId) === query.data?.pages[0]?.currentUserId) && <TouchableOpacity onPress={() => router.push({ pathname: "/activity/mark-played", params: { courseId: item.course_id, courseName: item.course_name, mode: kind === "reviews" ? "review" : "round", activityId: item.id } })} style={{ paddingTop: 10 }}><Text style={{ color: Colors.green, fontSize: 13 }}>Edit {kind === "reviews" ? "review" : "round"}</Text></TouchableOpacity>}
      </View>)}
      {query.hasNextPage && <TouchableOpacity disabled={query.isFetchingNextPage} onPress={() => query.fetchNextPage()} style={{ paddingVertical: 12 }}><Text style={{ color: Colors.green }}>{query.isFetchingNextPage ? "Loading…" : "Show more"}</Text></TouchableOpacity>}
    </View>
  );
}

export function PassportActivitySections({ userId }) {
  return <View style={{ marginHorizontal: Spacing.screenH }}>
    <PassportActivitySection kind="played" label="Played courses" userId={userId} />
    <PassportActivitySection kind="wishlist" label="Wish list" userId={userId} />
    <PassportActivitySection kind="rounds" label="Rounds" userId={userId} />
    <PassportActivitySection kind="reviews" label="Reviews" userId={userId} />
  </View>;
}
