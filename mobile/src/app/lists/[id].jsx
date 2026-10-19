import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Colors, Spacing, Radius } from "@/constants/theme";
import { CourseListRow } from "@/components/CourseListRow";
export default function ListDetail() {
  const { id } = useLocalSearchParams(),
    router = useRouter(),
    insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["curated-list", id],
    queryFn: async () => {
      const r = await fetch(`/api/lists/${id}`);
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
      return j;
    },
  });
  return (
    <View
      style={{ flex: 1, backgroundColor: Colors.ivory, paddingTop: insets.top }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: Spacing.screenH }}
      >
        <Text style={{ color: Colors.green }}>‹ Back</Text>
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.screenH,
          paddingBottom: insets.bottom + 35,
        }}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.green} />
        ) : isError ? (
          <TouchableOpacity onPress={refetch}>
            <Text>Unable to load this list. Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text
              style={{
                color: Colors.textPrimary,
                fontSize: 26,
                fontStyle: "italic",
              }}
            >
              {data.list.title}
            </Text>
            <Text
              style={{
                color: Colors.textSecondary,
                lineHeight: 22,
                marginVertical: 16,
              }}
            >
              {data.list.description}
            </Text>
            <Text style={{ color: Colors.textSecondary, marginBottom: 12 }}>
              {data.list.started} golfers started · {data.list.completed}{" "}
              completed
            </Text>
            <Text style={{ color: Colors.green, marginBottom: 20 }}>
              {data.played} / {data.total} courses played
              {data.rating ? ` · ${Number(data.rating).toFixed(1)}/5` : ""}
            </Text>
            {data.courses.map((c) => (
              <View key={c.entry_id || c.id}>
                <Text style={{ color: Colors.green, marginBottom: 5 }}>
                  {!c.counts_for_completion
                    ? "Historical venue · excluded from completion"
                    : c.user_played
                      ? "✓ Played"
                      : "Yet to play"}
                </Text>
                {c.source_metadata?.price_rank ? (
                  <Text
                    style={{ color: Colors.textSecondary, marginBottom: 6 }}
                  >
                    Rank {c.source_metadata.price_rank} ·{" "}
                    {c.source_metadata.fee_currency}{" "}
                    {c.source_metadata.fee_amount_native} (2026)
                  </Text>
                ) : null}
                {c.id ? (
                  <CourseListRow
                    item={c}
                    onPress={() => router.push(`/course/${c.id}`)}
                  />
                ) : (
                  <Text
                    style={{
                      color: Colors.textPrimary,
                      fontSize: 16,
                      marginBottom: 12,
                    }}
                  >
                    {c.entry_display_name}
                  </Text>
                )}
                {c.source_metadata?.notes ? (
                  <Text
                    style={{
                      color: Colors.textSecondary,
                      fontSize: 12,
                      lineHeight: 18,
                      marginBottom: 16,
                    }}
                  >
                    {c.source_metadata.notes}
                  </Text>
                ) : null}
              </View>
            ))}
            {data.canReview ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/activity/mark-played",
                    params: {
                      listId: id,
                      courseName: data.list.title,
                      mode: "review",
                    },
                  })
                }
                style={{
                  padding: 16,
                  backgroundColor: Colors.green,
                  borderRadius: Radius.sm,
                  marginVertical: 20,
                }}
              >
                <Text style={{ color: Colors.ivory, textAlign: "center" }}>
                  Review this list
                </Text>
              </TouchableOpacity>
            ) : !data.completed ? (
              <Text style={{ color: Colors.textSecondary, marginVertical: 20 }}>
                Complete every course to review the list.
              </Text>
            ) : null}
            {data.reviews.map((review) => (
              <View
                key={review.id}
                style={{
                  padding: 16,
                  backgroundColor: Colors.white,
                  borderRadius: Radius.md,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: Colors.textPrimary, fontWeight: "600" }}>
                  {review.name} · {Number(review.rating).toFixed(1)}/5
                </Text>
                <Text style={{ color: Colors.textSecondary, marginTop: 10 }}>
                  {review.review_text}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
                  {review.photos.map((uri) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={{ width: 80, height: 80, borderRadius: 6 }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
