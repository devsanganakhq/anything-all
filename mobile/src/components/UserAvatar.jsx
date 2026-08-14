import React, { useState } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Colors } from "@/constants/theme";

/** Known placeholder hosts we never treat as a real profile photo */
const FAKE_AVATAR_HOSTS = [
  "pravatar.cc",
  "i.pravatar.cc",
  "images.unsplash.com/photo-1500648767791",
];

function isRealPhotoUrl(uri) {
  if (!uri || typeof uri !== "string") return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;
  return !FAKE_AVATAR_HOSTS.some((h) => trimmed.includes(h));
}

/** First letter of the first word in a display name */
export function getNameInitial(name) {
  if (!name || typeof name !== "string") return "?";
  const first = name.trim().split(/\s+/)[0];
  if (!first) return "?";
  // Skip generic labels
  if (/^(you|golfer|a)$/i.test(first)) {
    const parts = name.trim().split(/\s+/);
    const next = parts.find((p) => !/^(you|golfer|a)$/i.test(p));
    return (next || first).charAt(0).toUpperCase();
  }
  return first.charAt(0).toUpperCase();
}

/**
 * UserAvatar — real photo when available, otherwise the first letter of their name.
 *
 * @param {string} [uri]       profile photo URL
 * @param {string} [name]      display name used for initials
 * @param {number} [size=46]
 * @param {object} [style]
 * @param {number} [borderWidth]
 * @param {string} [borderColor]
 * @param {string} [bgColor]   initials background
 * @param {string} [textColor] initials text color
 */
export function UserAvatar({
  uri,
  name,
  size = 46,
  style,
  borderWidth = 0,
  borderColor = Colors.greenLight,
  bgColor = Colors.green,
  textColor = Colors.ivory,
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = isRealPhotoUrl(uri) && !failed;
  const initial = getNameInitial(name);
  const fontSize = Math.max(12, Math.round(size * 0.38));

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: showPhoto ? Colors.ivoryDeep : bgColor,
          borderWidth,
          borderColor,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      {showPhoto ? (
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text
          style={{
            fontSize,
            fontWeight: "700",
            color: textColor,
            letterSpacing: 0.5,
          }}
        >
          {initial}
        </Text>
      )}
    </View>
  );
}

export default UserAvatar;
