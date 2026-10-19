import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, Radius } from "@/constants/theme";
import { SHOW_RANKINGS } from "@/constants/courseConstants";
export default function CourseLists() {
  const { id } = useLocalSearchParams(),
    router = useRouter(),
    insets = useSafeAreaInsets();
  const { data, isError } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const r = await fetch(`/api/courses/${id}`);
      if (!r.ok) throw Error();
      return r.json();
    },
  });
  return (
    <View
      style={{ flex: 1, backgroundColor: Colors.ivory, paddingTop: insets.top }}
    >
      <TouchableOpacity
        style={{ padding: Spacing.screenH }}
        onPress={() => router.back()}
      >
        <Text style={{ color: Colors.green }}>‹ Course</Text>
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{ padding: Spacing.screenH }}>
        <Text
          style={{ fontSize: 24, color: Colors.textPrimary, marginBottom: 20 }}
        >
          On lists
        </Text>
        {isError ? (
          <Text>Unable to load lists.</Text>
        ) : (
          <>
            {data?.curatedLists?.map((l) => (
              <TouchableOpacity
                key={`curated-${l.id}`}
                onPress={() => router.push(`/lists/${l.id}`)}
                style={{
                  backgroundColor: Colors.white,
                  borderRadius: Radius.md,
                  padding: 18,
                  marginBottom: 10,
                }}
              >
                <Text style={{ color: Colors.textPrimary }}>{l.title} ›</Text>
              </TouchableOpacity>
            ))}
            {SHOW_RANKINGS &&
              data?.rankings?.map((l) => (
                <View
                  key={`ranking-${l.id}`}
                  style={{
                    padding: 18,
                    backgroundColor: Colors.white,
                    marginBottom: 10,
                  }}
                >
                  <Text style={{ color: Colors.textPrimary }}>
                    {l.ranking_name} · #{l.position}
                  </Text>
                </View>
              ))}
            {data &&
              !data.curatedLists?.length &&
              (!SHOW_RANKINGS || !data.rankings?.length) && (
                <Text style={{ color: Colors.textSecondary }}>
                  This course has no published lists yet.
                </Text>
              )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
