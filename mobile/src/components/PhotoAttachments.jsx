import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import useUpload from "@/utils/useUpload";
import { Colors, Radius } from "@/constants/theme";
export function PhotoAttachments({
  photos,
  onChange,
  disabled = false,
  onBusy,
}) {
  const [upload] = useUpload(),
    [busy, setBusy] = useState(false);
  async function pick() {
    if (busy || disabled || photos.length >= 3) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Photo access required",
        "Allow photo access in Settings to attach pictures.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 3 - photos.length,
      quality: 0.8,
      exif: false,
    });
    if (result.canceled) return;
    setBusy(true);
    onBusy?.(true);
    const urls = [...photos];
    try {
      for (const asset of result.assets.slice(0, 3 - photos.length)) {
        const response = await upload({ reactNativeAsset: { uri: asset.uri } });
        if (response.error || !response.url)
          throw Error(response.error || "Upload failed");
        urls.push(response.url);
        onChange([...urls]);
      }
    } catch (e) {
      Alert.alert("Photo upload failed", e.message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingVertical: 8,
      }}
    >
      {photos.map((uri, i) => (
        <TouchableOpacity
          disabled={busy || disabled}
          key={uri + i}
          onPress={() => onChange(photos.filter((_, j) => j !== i))}
          accessibilityLabel="Remove attachment"
        >
          <Image
            source={{ uri }}
            style={{ width: 56, height: 56, borderRadius: Radius.sm }}
          />
          <Text
            style={{
              position: "absolute",
              right: 1,
              backgroundColor: Colors.white,
              paddingHorizontal: 4,
            }}
          >
            ×
          </Text>
        </TouchableOpacity>
      ))}
      {photos.length < 3 && (
        <TouchableOpacity
          disabled={busy || disabled}
          onPress={pick}
          style={{
            padding: 12,
            justifyContent: "center",
            backgroundColor: Colors.ivoryDeep,
            borderRadius: Radius.sm,
          }}
        >
          {busy ? (
            <ActivityIndicator color={Colors.green} />
          ) : (
            <Text style={{ color: Colors.green }}>
              + Photo ({photos.length}/3)
            </Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}
export function AttachedPhotos({ photos = [] }) {
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 }}
    >
      {photos.map((uri, i) => (
        <Image
          key={uri + i}
          source={{ uri }}
          style={{ width: 90, height: 90, borderRadius: 6 }}
          contentFit="cover"
        />
      ))}
    </View>
  );
}
