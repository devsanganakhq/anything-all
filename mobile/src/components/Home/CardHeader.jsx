import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";
import { PressableUser } from "@/components/PressableUser";

export function CardHeader({ post, meta, onMenu }) {
  const TypeIcon = meta.icon;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 8,
      }}
    >
      <PressableUser
        userId={post.author_id}
        style={{ flex: 1, flexDirection: "row", alignItems: "center" }}
      >
        <UserAvatar
          uri={post.author_avatar}
          name={post.author_name}
          size={46}
          borderWidth={2}
          borderColor={Colors.greenLight}
        />

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: Colors.textPrimary,
              lineHeight: 19,
            }}
          >
            {post.author_name}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 1 }}>
            {post.author_home_club
              ? `${post.author_home_club}  ·  ${post.time_ago}`
              : post.time_ago}
          </Text>
        </View>
      </PressableUser>

      {/* Type badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          backgroundColor: meta.bg,
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: Radius.pill,
          marginRight: 8,
        }}
      >
        <TypeIcon color={meta.color} size={11} strokeWidth={2} />
        <Text
          style={{
            fontSize: 9,
            fontWeight: "800",
            letterSpacing: 0.5,
            color: meta.color,
          }}
        >
          {meta.label.toUpperCase()}
        </Text>
      </View>

      <TouchableOpacity onPress={() => onMenu?.(post)} style={{ padding: 4 }}>
        <MoreHorizontal color={Colors.textMuted} size={19} strokeWidth={1.8} />
      </TouchableOpacity>
    </View>
  );
}
