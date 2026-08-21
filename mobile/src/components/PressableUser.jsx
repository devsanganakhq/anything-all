import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useIsSelfUser, useOpenUserProfile } from "@/utils/openUserProfile";

/**
 * Tapping another golfer opens their social profile (request / follow).
 * Tapping your own avatar or name does nothing.
 */
export function PressableUser({ userId, children, style, disabled, ...rest }) {
  const openProfile = useOpenUserProfile();
  const isSelf = useIsSelfUser(userId);
  const id = Number(userId);
  const canOpen = Number.isFinite(id) && id > 0 && !isSelf && !disabled;

  if (!canOpen) {
    return <View style={style}>{children}</View>;
  }

  return (
    <TouchableOpacity
      onPress={() => openProfile(id)}
      activeOpacity={0.75}
      style={style}
      accessibilityRole="button"
      accessibilityLabel="View golfer profile"
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}
