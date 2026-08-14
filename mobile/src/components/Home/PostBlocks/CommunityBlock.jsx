import React from "react";
import { View, Text } from "react-native";
import { Users } from "lucide-react-native";
import { Colors } from "@/constants/theme";

export function CommunityBlock({ post, md }) {
  const communityName = post.community_name || md.community_name;
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      {communityName && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <Users color={Colors.purple} size={13} strokeWidth={1.8} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 0.8,
              color: Colors.purple,
            }}
          >
            {communityName.toUpperCase()}
          </Text>
        </View>
      )}
      {md.title && (
        <Text
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: Colors.textPrimary,
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
    </View>
  );
}
