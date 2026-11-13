import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius } from "@/constants/theme";
export function CuratedLists({ userId, passport = false, scrollable = false }) {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["curated-lists", userId],
    queryFn: async () => {
      const r = await fetch(`/api/lists${userId ? `?userId=${userId}` : ""}`);
      if (!r.ok) throw Error();
      return r.json();
    },
  });
  if (isError)
    return (
      <TouchableOpacity onPress={refetch} style={{ padding: Spacing.screenH }}>
        <Text style={{ color: Colors.textSecondary }}>
          Unable to load lists. Tap to retry.
        </Text>
      </TouchableOpacity>
    );
  if (isLoading && scrollable) return <ActivityIndicator color={Colors.green} accessibilityLabel="Loading lists" />;
  if (!data?.lists?.length) return scrollable ? <Text style={{ padding: Spacing.screenH, color: Colors.textSecondary }}>No lists are available yet.</Text> : null;
  const content = (
    <View style={{ paddingHorizontal: Spacing.screenH, marginBottom: 22 }}>
      <Text
        style={{
          color: Colors.textSecondary,
          fontSize: 10,
          letterSpacing: 1.5,
          marginBottom: 12,
        }}
      >
        {"HEATHLAND LINKS LISTS"}
      </Text>
      {data.lists.map((list) => (
        <TouchableOpacity
          key={list.id}
          onPress={() => router.push(`/lists/${list.id}`)}
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: passport ? 12 : 14,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: Colors.textPrimary, fontSize: passport ? 13 : 15, fontWeight: passport ? "600" : "400" }}>
            {list.title}
          </Text>
          <Text style={{ color: Colors.textSecondary, marginTop: 6, fontSize: passport ? 11 : 12 }}>
            {list.played} / {list.total} courses played
          </Text>
          {!passport && <Text style={{ color: Colors.green, marginTop: 6, fontSize: 11 }}>
            {list.started} golfers started
          </Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
  return scrollable ? <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>{content}</ScrollView> : content;
}
