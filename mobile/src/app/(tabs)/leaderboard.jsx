import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Trophy } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Colors, Spacing, Radius } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";
import { PressableUser } from "@/components/PressableUser";

const podiumColors = { 1: Colors.gold, 2: "#B8BEC6", 3: "#C4965A" };

const TAB_TO_SCOPE = {
  OVERALL: "overall",
  "THIS YEAR": "year",
  "BY COUNTRY": "country",
  FRIENDS: "friends",
};

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("OVERALL");
  const tabs = ["OVERALL", "THIS YEAR", "BY COUNTRY", "FRIENDS"];
  const scope = TAB_TO_SCOPE[activeTab] || "overall";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: async () => {
      const r = await fetch(`/api/user/leaderboard?scope=${scope}`);
      if (!r.ok) throw new Error("Failed to fetch leaderboard");
      return r.json();
    },
  });

  const leaderboard = data?.leaderboard ?? [];
  const top3 = [
    leaderboard.find((p) => p.rank === 1),
    leaderboard.find((p) => p.rank === 2),
    leaderboard.find((p) => p.rank === 3),
  ];
  const rest = leaderboard.filter((p) => p.rank > 3);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            color: Colors.textPrimary,
            fontWeight: "300",
            fontStyle: "italic",
            marginBottom: 14,
          }}
        >
          Leaderboard
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ gap: 6 }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: Radius.pill,
                backgroundColor:
                  activeTab === tab ? Colors.green : "transparent",
                borderWidth: 1,
                borderColor: activeTab === tab ? Colors.green : Colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color:
                    activeTab === tab ? Colors.ivory : Colors.textSecondary,
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading && leaderboard.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : isError && leaderboard.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Trophy color={Colors.textMuted} size={32} strokeWidth={1.5} />
          <Text
            style={{
              marginTop: 12,
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: "center",
            }}
          >
            Couldn’t load the leaderboard. Try again shortly.
          </Text>
        </View>
      ) : leaderboard.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              textAlign: "center",
            }}
          >
            No players yet for this view. Mark courses as played to appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item, index) => `${item.id || item.rank}-${index}`}
          ListHeaderComponent={() => (
            <>
              {top3.some(Boolean) && (
                <View
                  style={{
                    backgroundColor: Colors.white,
                    paddingVertical: 28,
                    paddingHorizontal: Spacing.screenH,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.border,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      gap: 20,
                    }}
                  >
                    <PodiumItem player={top3[1]} rank={2} size={60} />
                    <PodiumItem player={top3[0]} rank={1} size={76} />
                    <PodiumItem player={top3[2]} rank={3} size={60} />
                  </View>
                </View>
              )}
              <View style={{ height: 12, backgroundColor: Colors.ivory }} />
            </>
          )}
          renderItem={({ item }) => (
            <PressableUser
              userId={item.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 14,
                paddingHorizontal: Spacing.screenH,
                backgroundColor: item.isUser ? Colors.greenLight : Colors.white,
                borderBottomWidth: 1,
                borderBottomColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  width: 28,
                  fontSize: 13,
                  fontWeight: "700",
                  color: item.isUser ? Colors.green : Colors.textMuted,
                }}
              >
                {item.rank}
              </Text>
              <UserAvatar
                uri={item.avatar}
                name={item.name}
                size={38}
                style={{ marginRight: 12 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: item.isUser ? "700" : "600",
                    color: item.isUser ? Colors.green : Colors.textPrimary,
                  }}
                >
                  {item.name}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: Colors.textSecondary,
                    marginTop: 1,
                  }}
                >
                  {item.isUser ? "Your position" : item.country || "—"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: item.isUser ? Colors.green : Colors.textPrimary,
                  }}
                >
                  {item.courses}
                </Text>
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                    color: Colors.textMuted,
                  }}
                >
                  COURSES
                </Text>
              </View>
            </PressableUser>
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ListEmptyComponent={
            top3.some(Boolean) ? null : (
              <View style={{ padding: 32 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                    textAlign: "center",
                  }}
                >
                  Only a few players so far — keep playing to climb the ranks.
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

function PodiumItem({ player, rank, size }) {
  if (!player) {
    return <View style={{ width: size + 16, height: size + 60 }} />;
  }
  const color = podiumColors[rank];
  const displayName = player.isUser
    ? "You"
    : (player.name || "Golfer").split(" ")[0];
  return (
    <PressableUser userId={player.id} style={{ alignItems: "center" }}>
      <UserAvatar
        uri={player.avatar}
        name={player.name}
        size={size}
        borderWidth={2.5}
        borderColor={color}
        style={{ marginBottom: 8 }}
      />
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: Radius.pill,
          marginBottom: 6,
        }}
      >
        <Text style={{ fontSize: 10, fontWeight: "700", color: Colors.white }}>
          {rank}
        </Text>
      </View>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: Colors.textPrimary,
          textAlign: "center",
          maxWidth: 80,
        }}
        numberOfLines={2}
      >
        {displayName}
      </Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: "700",
          color: Colors.green,
          marginTop: 2,
        }}
      >
        {player.courses}
      </Text>
    </PressableUser>
  );
}
