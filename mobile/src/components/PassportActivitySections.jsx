import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { courseDisplayName, formatCourseLocation } from "@/utils/courseDisplayName";

export function PassportActivitySection({ kind, label, userId, renderHeader }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const history = kind === "rounds" || kind === "reviews";
  const query = useInfiniteQuery({
    queryKey: ["passport-inline", kind, userId],
    enabled: open,
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
    <View style={{ marginBottom: renderHeader ? 0 : 16 }}>
      {renderHeader ? renderHeader({ open, toggle: () => setOpen(!open) }) : <TouchableOpacity onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ paddingVertical: 12 }}>
        <Text style={{ color: Colors.green, fontSize: 13, fontWeight: "600" }}>{label} {open ? "⌃" : "⌄"}</Text>
      </TouchableOpacity>}
      {open && <>
        {query.isLoading && <ActivityIndicator color={Colors.green} />}
        {query.isError && <TouchableOpacity onPress={() => query.refetch()}><Text style={{ color: Colors.textSecondary }}>Unable to load. Tap to retry.</Text></TouchableOpacity>}
        {!query.isLoading && !query.isError && rows.length === 0 && <Text style={{ color: Colors.textSecondary }}>No {label.toLowerCase()} yet.</Text>}
        {rows.map(item => <View key={item.id || item.course_id} style={{ backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 8, ...Shadow.card }}>
          <TouchableOpacity onPress={() => router.push(`/course/${item.course_id}`)}>
            <Text style={{ color: Colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{courseDisplayName({ ...item, name: item.course_name || item.name }).title}</Text>
            <Text style={{ color: Colors.textSecondary, fontSize: 11, marginTop: 4 }}>{history ? String(item.date_played || "").slice(0, 10) : formatCourseLocation(item)}</Text>
          </TouchableOpacity>
          {history && <Text style={{ color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 8 }}>{item.review_text || item.comments}</Text>}
          {history && (!userId || Number(userId) === query.data?.pages[0]?.currentUserId) && <TouchableOpacity onPress={() => router.push({ pathname: "/activity/mark-played", params: { courseId: item.course_id, courseName: item.course_name, mode: kind === "reviews" ? "review" : "round", activityId: item.id } })} style={{ paddingVertical: 10 }}><Text style={{ color: Colors.green, fontSize: 13 }}>Edit {kind === "reviews" ? "review" : "round"}</Text></TouchableOpacity>}
        </View>)}
        {query.hasNextPage && <TouchableOpacity disabled={query.isFetchingNextPage} onPress={() => query.fetchNextPage()} style={{ paddingVertical: 12 }}><Text style={{ color: Colors.green }}>{query.isFetchingNextPage ? "Loading…" : "Show more"}</Text></TouchableOpacity>}
      </>}
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
