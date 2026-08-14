import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import {
  CheckCircle,
  Heart,
  Share2,
  Bell,
  BellOff,
  MapPin,
  Globe,
} from "lucide-react-native";
import { Colors, Spacing } from "@/constants/theme";

export function SecondaryAction({ icon: Icon, label, onPress, active, color }) {
  const c = color || Colors.green;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", gap: 3 }}
      activeOpacity={0.7}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: active ? c + "18" : Colors.ivoryDeep,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon
          size={16}
          color={active ? c : Colors.textSecondary}
          strokeWidth={1.8}
        />
      </View>
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: active ? c : Colors.textSecondary,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function BottomActionBar({
  insets,
  handleMarkPlayed,
  alreadyPlayed,
  wishlisted,
  wishlistMutation,
  handleShare,
  following,
  followMutation,
  handleMap,
  course,
}) {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingHorizontal: Spacing.screenH,
        paddingTop: 12,
        paddingBottom: insets.bottom + 12,
      }}
    >
      {/* Primary CTA row */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <TouchableOpacity
          onPress={handleMarkPlayed}
          style={{
            flex: 1,
            backgroundColor: alreadyPlayed ? Colors.success : Colors.green,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 7,
            opacity: alreadyPlayed ? 0.75 : 1,
          }}
          activeOpacity={0.8}
        >
          <CheckCircle color={Colors.ivory} size={16} strokeWidth={2} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1.2,
              color: Colors.ivory,
            }}
          >
            {alreadyPlayed ? "ROUND RECORDED" : "MARK AS PLAYED"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => !alreadyPlayed && wishlistMutation.mutate()}
          disabled={alreadyPlayed || wishlistMutation.isPending}
          style={{
            flex: 1,
            backgroundColor: wishlisted ? Colors.purple : Colors.white,
            paddingVertical: 14,
            borderRadius: 8,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 7,
            borderWidth: 1.5,
            borderColor: wishlisted ? Colors.purple : Colors.purpleBorder,
            opacity: alreadyPlayed ? 0.4 : 1,
          }}
          activeOpacity={0.8}
        >
          <Heart
            color={wishlisted ? Colors.ivory : Colors.purple}
            size={16}
            strokeWidth={2}
            fill={wishlisted ? Colors.ivory : "transparent"}
          />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1.2,
              color: wishlisted ? Colors.ivory : Colors.purple,
            }}
          >
            {wishlisted ? "SAVED" : "SAVE"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Secondary icon row */}
      <View style={{ flexDirection: "row" }}>
        <SecondaryAction icon={Share2} label="Share" onPress={handleShare} />
        <SecondaryAction
          icon={following ? BellOff : Bell}
          label={following ? "Following" : "Follow"}
          onPress={() => followMutation.mutate()}
          active={following}
          color={following ? Colors.purple : Colors.green}
        />
        <SecondaryAction icon={MapPin} label="Map" onPress={handleMap} />
        {course.website && (
          <SecondaryAction
            icon={Globe}
            label="Website"
            onPress={() => {
              const url = course.website.startsWith("http")
                ? course.website
                : `https://${course.website}`;
              Linking.openURL(url);
            }}
          />
        )}
      </View>
    </View>
  );
}
