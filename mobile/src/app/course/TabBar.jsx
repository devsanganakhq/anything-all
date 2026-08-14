import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Colors, Spacing } from "@/constants/theme";
import { TABS } from "@/constants/courseConstants";

export function TabBar({ activeTab, setActiveTab, hasRankings, rankings }) {
  return (
    <View
      style={{
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.screenH - 4 }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderBottomWidth: 2,
                borderBottomColor: active ? Colors.green : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: active ? Colors.green : Colors.textMuted,
                }}
              >
                {tab}
                {tab === "RANKINGS" && hasRankings && (
                  <Text
                    style={{
                      color: active ? Colors.green : Colors.textMuted,
                    }}
                  >
                    {" "}
                    ({rankings.length})
                  </Text>
                )}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
