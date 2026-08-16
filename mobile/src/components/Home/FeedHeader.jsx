import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Bell } from "lucide-react-native";
import { Colors, Spacing, Radius } from "@/constants/theme";
import { FILTERS } from "./constants";

export function FeedHeader({
  insets,
  greeting,
  firstName,
  filter,
  onFilterChange,
  onNotificationsPress,
  hasUnread,
}) {
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        backgroundColor: Colors.white,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}
    >
      {/* Greeting row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: "#C9952A",
              marginBottom: 2,
            }}
          >
            HEATHLAND LINKS
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              lineHeight: 28,
            }}
          >
            {greeting},
          </Text>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              fontStyle: "italic",
              color: Colors.green,
              lineHeight: 28,
            }}
          >
            {firstName}.
          </Text>
        </View>
        <TouchableOpacity
          onPress={onNotificationsPress}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F5F1EB",
            borderWidth: 1,
            borderColor: Colors.border,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Bell color={Colors.green} size={19} strokeWidth={1.8} />
          {hasUnread ? (
            <View
              style={{
                position: "absolute",
                top: 9,
                right: 9,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#6B4F8A",
                borderWidth: 1.5,
                borderColor: Colors.white,
              }}
            />
          ) : null}
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 12,
          gap: 6,
        }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => onFilterChange(f.key)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: Radius.pill,
                backgroundColor: active ? Colors.green : "transparent",
                borderWidth: 1.5,
                borderColor: active ? Colors.green : Colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  color: active ? Colors.ivory : Colors.textSecondary,
                }}
              >
                {f.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
