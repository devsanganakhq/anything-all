import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Megaphone } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";

export function ClubUpdateBlock({ post, md }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: Colors.greenLight,
          borderRadius: Radius.md,
          padding: 10,
          marginBottom: 12,
        }}
      >
        <Megaphone color={Colors.green} size={13} strokeWidth={1.8} />
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1,
            color: Colors.green,
          }}
        >
          {(post.club_name || md.club_name || "CLUB").toUpperCase()}
        </Text>
        <View style={{ flex: 1 }} />
        <Text
          style={{
            fontSize: 9,
            fontWeight: "700",
            color: Colors.green,
            backgroundColor: Colors.green + "22",
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}
        >
          OFFICIAL
        </Text>
      </View>
      {md.title && (
        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: Colors.textPrimary,
            lineHeight: 24,
            marginBottom: 6,
          }}
        >
          {md.title}
        </Text>
      )}
      {post.caption && (
        <Text
          style={{ fontSize: 14, color: Colors.textPrimary, lineHeight: 22 }}
        >
          {post.caption}
        </Text>
      )}
      {md.cta_label && md.cta_url && (
        <TouchableOpacity
          style={{
            marginTop: 12,
            backgroundColor: Colors.green,
            borderRadius: Radius.md,
            paddingVertical: 10,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "800",
              letterSpacing: 1,
              color: Colors.ivory,
            }}
          >
            {md.cta_label.toUpperCase()}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
