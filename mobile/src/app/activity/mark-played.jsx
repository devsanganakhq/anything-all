import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Star, Camera, ImageIcon, CheckCircle } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePickerLib from "expo-image-picker";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import useUpload from "@/utils/useUpload";

const MAX_PHOTOS = 10;
const TERMS_VERSION = "1.0";
const TERMS_TEXT =
  "I confirm that I took these photos or have permission to upload them, and I grant " +
  "Heathland Links permission to display them within the app and related promotional " +
  "services under the platform terms.";

export default function MarkPlayedScreen() {
  const { courseId, courseName } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [datePlayed, setDatePlayed] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Photo upload state
  const [selectedPhotos, setSelectedPhotos] = useState([]); // [{uri, caption}]
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [photoError, setPhotoError] = useState(null);
  const [upload, { loading: uploading }] = useUpload();

  const pickPhotos = useCallback(async () => {
    const { status } =
      await ImagePickerLib.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "Allow photo library access in Settings.",
      );
      return;
    }
    const result = await ImagePickerLib.launchImageLibraryAsync({
      mediaTypes: ImagePickerLib.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      exif: false,
      selectionLimit: MAX_PHOTOS - selectedPhotos.length,
    });
    if (!result.canceled) {
      setSelectedPhotos((p) =>
        [
          ...p,
          ...result.assets.map((a) => ({ uri: a.uri, caption: "" })),
        ].slice(0, MAX_PHOTOS),
      );
    }
  }, [selectedPhotos.length]);

  const removePhoto = (i) =>
    setSelectedPhotos((p) => p.filter((_, j) => j !== i));

  const mutation = useMutation({
    mutationFn: async () => {
      setPhotoError(null);

      // 1. Create the played_courses record
      const response = await fetch("/api/activity/mark-played", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, rating, reviewText, datePlayed }),
      });
      if (!response.ok) throw new Error("Failed to record activity");
      const { reviewId } = await response.json();

      // 2. Upload photos if any (and terms accepted)
      if (selectedPhotos.length > 0 && termsAccepted) {
        const uploaded = [];
        for (const p of selectedPhotos) {
          const r = await upload({ reactNativeAsset: { uri: p.uri } });
          if (r.error) throw new Error(`Photo upload failed: ${r.error}`);
          uploaded.push({ imageUrl: r.url, caption: p.caption || null });
        }
        const photoRes = await fetch("/api/course-photos/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId,
            photos: uploaded,
            reviewId: reviewId || null,
            termsAccepted: true,
            termsVersion: TERMS_VERSION,
          }),
        });
        if (!photoRes.ok) {
          const err = await photoRes.json().catch(() => ({}));
          throw new Error(err.error || "Photo submission failed");
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-photos", courseId] });
      queryClient.invalidateQueries({ queryKey: ["passport-stats"] });
      queryClient.invalidateQueries({ queryKey: ["passport-played"] });
      queryClient.invalidateQueries({ queryKey: ["courses-map"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });

      const photoMsg =
        selectedPhotos.length > 0 && termsAccepted
          ? "\n\nYour photos have been submitted for approval."
          : "";
      Alert.alert(
        "Round Recorded",
        `${courseName} added to your Golf Passport.${photoMsg}`,
        [{ text: "Great", onPress: () => router.back() }],
      );
    },
    onError: (err) => {
      setPhotoError(err.message || "Something went wrong. Please try again.");
    },
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.ivory }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar style="dark" />
      <View style={{ flex: 1, paddingTop: insets.top }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: Spacing.screenH,
            paddingVertical: 16,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              color: Colors.textSecondary,
            }}
          >
            MARK AS PLAYED
          </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <X color={Colors.textSecondary} size={20} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: Spacing.screenH + 8,
            paddingBottom: insets.bottom + 40,
          }}
        >
          {/* Course name */}
          <Text
            style={{
              fontSize: 24,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              marginBottom: 6,
              marginTop: 8,
            }}
          >
            {courseName}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              marginBottom: 30,
            }}
          >
            How was your round? Add a rating and review to your Passport.
          </Text>

          {/* Star Rating */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 14,
            }}
          >
            YOUR RATING
          </Text>
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 30 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Star
                  size={30}
                  color={star <= rating ? Colors.gold : Colors.border}
                  fill={star <= rating ? Colors.gold : "transparent"}
                  strokeWidth={1.5}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Date Played */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 10,
            }}
          >
            DATE PLAYED
          </Text>
          <TextInput
            style={{
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              paddingVertical: 12,
              fontSize: 15,
              color: Colors.textPrimary,
              marginBottom: 28,
            }}
            value={datePlayed}
            onChangeText={setDatePlayed}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
          />

          {/* Review */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 10,
            }}
          >
            PERSONAL REVIEW
          </Text>
          <TextInput
            style={{
              backgroundColor: Colors.white,
              padding: 14,
              borderRadius: Radius.md,
              borderWidth: 1,
              borderColor: Colors.border,
              color: Colors.textPrimary,
              height: 110,
              textAlignVertical: "top",
              fontSize: 14,
              marginBottom: 28,
              lineHeight: 21,
            }}
            multiline
            numberOfLines={4}
            placeholder="How were the conditions? Any standout holes or moments?"
            placeholderTextColor={Colors.textMuted}
            value={reviewText}
            onChangeText={setReviewText}
          />

          {/* Photos section */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 12,
            }}
          >
            ADD PHOTOS (OPTIONAL)
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: Colors.textSecondary,
              marginBottom: 14,
              lineHeight: 18,
            }}
          >
            Share your photos from this round. Up to {MAX_PHOTOS} photos ·
            reviewed before appearing publicly.
          </Text>

          {/* Photo previews + picker */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {selectedPhotos.map((p, i) => (
              <View key={i} style={{ position: "relative" }}>
                <Image
                  source={{ uri: p.uri }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: Radius.sm,
                    backgroundColor: Colors.ivoryDeep,
                  }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  onPress={() => removePhoto(i)}
                  style={{
                    position: "absolute",
                    top: 3,
                    right: 3,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "rgba(0,0,0,0.55)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <X size={11} color="#FFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
            {selectedPhotos.length < MAX_PHOTOS && (
              <TouchableOpacity
                onPress={pickPhotos}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: Radius.sm,
                  backgroundColor: Colors.white,
                  borderStyle: "dashed",
                  borderWidth: 1.5,
                  borderColor: Colors.border,
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Camera color={Colors.textMuted} size={20} strokeWidth={1.5} />
                <Text
                  style={{
                    fontSize: 8,
                    color: Colors.textMuted,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                  }}
                >
                  ADD
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Terms consent — only shown if photos are selected */}
          {selectedPhotos.length > 0 && (
            <TouchableOpacity
              onPress={() => setTermsAccepted((v) => !v)}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 12,
                backgroundColor: Colors.white,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: Radius.md,
                padding: 14,
                marginBottom: 20,
                ...Shadow.card,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  marginTop: 1,
                  flexShrink: 0,
                  borderWidth: 1.5,
                  borderColor: termsAccepted ? Colors.green : Colors.border,
                  backgroundColor: termsAccepted ? Colors.green : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {termsAccepted && (
                  <Text
                    style={{
                      color: Colors.ivory,
                      fontSize: 12,
                      fontWeight: "800",
                    }}
                  >
                    ✓
                  </Text>
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: Colors.textSecondary,
                  lineHeight: 17,
                }}
              >
                {TERMS_TEXT}
              </Text>
            </TouchableOpacity>
          )}

          {/* Error */}
          {photoError && (
            <Text
              style={{
                fontSize: 12,
                color: Colors.error,
                marginBottom: 14,
                lineHeight: 18,
              }}
            >
              {photoError}
            </Text>
          )}

          {/* Photos-will-be-reviewed note */}
          {selectedPhotos.length > 0 && termsAccepted && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                backgroundColor: Colors.greenLight,
                borderRadius: Radius.sm,
                padding: 10,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: Colors.greenBorder,
              }}
            >
              <CheckCircle size={13} color={Colors.green} strokeWidth={2} />
              <Text
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: Colors.green,
                  lineHeight: 16,
                }}
              >
                {selectedPhotos.length} photo
                {selectedPhotos.length !== 1 ? "s" : ""} will be submitted for
                review after this round is recorded.
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={{
              backgroundColor: Colors.green,
              paddingVertical: 17,
              borderRadius: 6,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              opacity: mutation.isPending || uploading ? 0.6 : 1,
            }}
            disabled={mutation.isPending || uploading}
            onPress={() => {
              if (selectedPhotos.length > 0 && !termsAccepted) {
                Alert.alert(
                  "Terms required",
                  "Please accept the photo contribution terms before submitting.",
                );
                return;
              }
              mutation.mutate();
            }}
          >
            {(mutation.isPending || uploading) && (
              <ActivityIndicator color={Colors.ivory} size="small" />
            )}
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 2,
                color: Colors.ivory,
              }}
            >
              {mutation.isPending || uploading ? "SAVING…" : "CONFIRM ROUND"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
