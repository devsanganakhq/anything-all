import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Radius, Spacing } from "@/constants/theme";
export function PassportFavourites({ userId, editable = false }) {
  const router = useRouter(),
    qc = useQueryClient(),
    insets = useSafeAreaInsets(),
    [slot, setSlot] = useState(null),
    [search, setSearch] = useState("");
  const { data } = useQuery({
    queryKey: ["passport-favourites", userId],
    queryFn: async () => {
      const r = await fetch(
        `/api/user/favourites${userId ? `?userId=${userId}` : ""}`,
      );
      if (!r.ok) throw Error();
      return r.json();
    },
  });
  const { data: played } = useQuery({
    queryKey: ["favourite-choices", search],
    enabled: editable && slot !== null,
    queryFn: async () => {
      const r = await fetch(
        `/api/user/played-courses?limit=50&q=${encodeURIComponent(search)}`,
      );
      if (!r.ok) throw Error();
      return r.json();
    },
  });
  const favourites = data?.favourites || [];
  const mutation = useMutation({
    mutationFn: async (courseId) => {
      const items = favourites
        .filter((i) => i.position !== slot && i.id !== courseId)
        .map((i) => ({ position: i.position, courseId: i.id }));
      if (courseId) items.push({ position: slot, courseId });
      const r = await fetch("/api/user/favourites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favourites: items }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["passport-favourites"] });
      setSlot(null);
    },
    onError: (e) => Alert.alert("Unable to save", e.message),
  });
  if (!editable && !favourites.length) return null;
  return (
    <View style={{ marginHorizontal: Spacing.screenH, marginBottom: 20 }}>
      <Text
        style={{
          color: Colors.textSecondary,
          fontSize: 10,
          letterSpacing: 1.5,
          marginVertical: 12,
        }}
      >
        FAVOURITE THREE
      </Text>
      {[1, 2, 3].map((position) => {
        const f = favourites.find((i) => i.position === position);
        return (
          <View
            key={position}
            style={{
              padding: 15,
              marginBottom: 8,
              backgroundColor: Colors.white,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: Colors.border,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                f
                  ? router.push(`/course/${f.id}`)
                  : editable && (setSearch(""), setSlot(position))
              }
              style={{ flex: 1 }}
            >
              <Text style={{ color: Colors.textPrimary }}>
                {position}.{" "}
                {f
                  ? [f.club_name, f.name]
                      .filter(Boolean)
                      .filter((x, i, a) => a.indexOf(x) === i)
                      .join(", ")
                  : editable
                    ? "Choose a played course"
                    : "Not selected"}
              </Text>
            </TouchableOpacity>
            {editable && (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  setSlot(position);
                }}
              >
                <Text style={{ color: Colors.green }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
      <Modal
        visible={slot !== null}
        animationType="slide"
        onRequestClose={() => setSlot(null)}
      >
        <View
          style={{
            flex: 1,
            paddingTop: insets.top,
            paddingHorizontal: Spacing.screenH,
            backgroundColor: Colors.ivory,
          }}
        >
          <TouchableOpacity
            onPress={() => setSlot(null)}
            style={{ paddingVertical: 20 }}
          >
            <Text style={{ color: Colors.green }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, color: Colors.textPrimary }}>
            Favourite {slot}
          </Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search your played courses"
            style={{
              padding: 15,
              backgroundColor: Colors.white,
              marginVertical: 16,
            }}
          />
          <TouchableOpacity
            disabled={mutation.isPending}
            onPress={() => mutation.mutate(null)}
          >
            <Text style={{ color: Colors.green, paddingVertical: 14 }}>
              Clear this position
            </Text>
          </TouchableOpacity>
          <FlatList
            data={played?.courses || []}
            keyExtractor={(i) => String(i.course_id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                disabled={mutation.isPending}
                onPress={() => mutation.mutate(item.course_id)}
                style={{
                  paddingVertical: 18,
                  borderBottomWidth: 1,
                  borderColor: Colors.border,
                }}
              >
                <Text style={{ color: Colors.textPrimary }}>
                  {item.club_name || item.course_name}
                  {item.club_name && item.club_name !== item.course_name
                    ? `, ${item.course_name}`
                    : ""}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}
