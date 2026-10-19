import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Radius } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";
export function RoundsTab({ rounds = [], courseId, courseName }) {
  const router = useRouter();
  return (
    <View>
      {rounds.map((r) => (
        <View
          key={r.id}
          style={{
            backgroundColor: Colors.white,
            padding: 16,
            borderRadius: Radius.md,
            marginBottom: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <UserAvatar
              uri={r.profile_photo_url}
              name={`${r.first_name || ""} ${r.last_name || ""}`}
              size={34}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.textPrimary }}>
                {`${r.first_name || ""} ${r.last_name || ""}`.trim() ||
                  "Golfer"}
              </Text>
              <Text
                style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4 }}
              >
                {String(r.date_played).slice(0, 10)}
              </Text>
            </View>
          </View>
          <Text
            style={{
              color: Colors.textSecondary,
              marginTop: 10,
              lineHeight: 20,
            }}
          >
            {r.comments}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            {r.photos.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={{ width: 80, height: 80, borderRadius: 6 }}
              />
            ))}
          </View>
        </View>
      ))}
      {!rounds.length && (
        <Text style={{ color: Colors.textSecondary, marginBottom: 20 }}>
          No visible rounds recorded yet.
        </Text>
      )}
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/activity/mark-played",
            params: { courseId, courseName, mode: "round" },
          })
        }
        style={{
          padding: 16,
          backgroundColor: Colors.green,
          borderRadius: Radius.sm,
          marginBottom: 20,
        }}
      >
        <Text style={{ color: Colors.ivory, textAlign: "center" }}>
          Record a round
        </Text>
      </TouchableOpacity>
    </View>
  );
}
