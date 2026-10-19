import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import * as ImagePickerLib from "expo-image-picker";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import useUpload from "@/utils/useUpload";

import Slider from "@react-native-community/slider";
import {
  COURSE_CATEGORIES,
  LIST_CATEGORIES,
  FEE_BANDS,
} from "@/utils/reviewCriteria";
const MAX_PHOTOS = 3;
const TERMS_VERSION = "1.0";
const TERMS_TEXT =
  "I confirm that I took these photos or have permission to upload them, and I grant " +
  "Heathland Links permission to display them within the app and related promotional " +
  "services under the platform terms.";

export default function MarkPlayedScreen() {
  const {
    courseId,
    courseName,
    mode: initialMode,
    activityId,
    listId,
  } = useLocalSearchParams();
  const [mode, setMode] = useState(
    initialMode === "review" || listId ? "review" : "round",
  );
  const isList = !!listId;
  const isEdit = !!activityId;
  const categories = isList ? LIST_CATEGORIES : COURSE_CATEGORIES;
  const [scores, setScores] = useState(
    Object.fromEntries(categories.map((c) => [c.key, 5])),
  );
  const [feeBand, setFeeBand] = useState("");
  const requestId = useRef(
    `activity-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const endpoint = isList
    ? `/api/lists/${listId}/reviews`
    : `/api/activity/${mode === "review" ? "reviews" : "rounds"}${isEdit ? `/${activityId}` : ""}`;
  const {
    data: existing,
    isLoading: loadingExisting,
    isError: existingError,
  } = useQuery({
    queryKey: ["activity-edit", mode, activityId],
    enabled: isEdit,
    queryFn: async () => {
      const r = await fetch(endpoint);
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Unable to load activity");
      return data.review || data.round || data;
    },
  });
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

  useEffect(() => {
    if (!existing) return;
    setRating(Number(existing.rating) || 0);
    setReviewText(existing.review_text ?? existing.comments ?? "");
    setDatePlayed(String(existing.date_played).slice(0, 10));
    if (existing.scores) setScores(existing.scores);
    setFeeBand(existing.fee_band || "");
    setSelectedPhotos(
      (existing.photos || []).map((url) => ({
        uri: typeof url === "string" ? url : url.image_url,
        remote: true,
      })),
    );
    setTermsAccepted(true);
  }, [existing]);

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

      if (isEdit && !existing)
        throw Error("Wait for the saved activity to load");
      const photos = [];
      for (const p of selectedPhotos) {
        if (p.remote) {
          photos.push(p.uri);
          continue;
        }
        if (!p.uploadedUrl) {
          const r = await upload({ reactNativeAsset: { uri: p.uri } });
          if (r.error || !r.url) throw Error(r.error || "Photo upload failed");
          p.uploadedUrl = r.url;
        }
        photos.push(p.uploadedUrl);
      }
      const response = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          datePlayed,
          reviewText,
          photos,
          termsAccepted,
          scores:
            mode === "review" && !(isEdit && existing?.scores == null)
              ? scores
              : undefined,
          rating,
          feeBand,
          requestId: requestId.current,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Unable to save activity");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-photos", courseId] });
      queryClient.invalidateQueries({ queryKey: ["passport-stats"] });
      queryClient.invalidateQueries({ queryKey: ["passport-played"] });
      queryClient.invalidateQueries({ queryKey: ["courses-map"] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });

      queryClient.invalidateQueries({ queryKey: ["activity-history"] });
      queryClient.invalidateQueries({ queryKey: ["curated-lists"] });
      queryClient.invalidateQueries({ queryKey: ["curated-list"] });
      Alert.alert(
        isEdit
          ? "Changes saved"
          : mode === "review"
            ? "Review saved"
            : "Round recorded",
        `${courseName || "Your activity"} has been saved.`,
        [{ text: "Done", onPress: () => router.back() }],
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
            {isEdit
              ? "EDIT ACTIVITY"
              : isList
                ? "REVIEW LIST"
                : "RECORD ACTIVITY"}
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
            {isList
              ? "Review the experience of completing this list."
              : "Record a round or share a course review in your Passport."}
          </Text>

          {!isEdit && !isList && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
              {["round", "review"].map((value) => (
                <TouchableOpacity
                  key={value}
                  onPress={() => setMode(value)}
                  style={{
                    flex: 1,
                    padding: 14,
                    borderRadius: Radius.sm,
                    backgroundColor:
                      mode === value ? Colors.green : Colors.white,
                  }}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: mode === value ? Colors.ivory : Colors.green,
                    }}
                  >
                    {value === "round" ? "Record a round" : "Leave a review"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {isEdit && loadingExisting && (
            <ActivityIndicator color={Colors.green} />
          )}
          {existingError && (
            <Text style={{ color: Colors.error }}>
              Unable to load this activity. Please reopen it.
            </Text>
          )}
          {mode === "review" && !(isEdit && existing?.scores == null) && (
            <>
              {categories.map((category) => (
                <View key={category.key} style={{ marginBottom: 22 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: Colors.textPrimary,
                    }}
                  >
                    {category.title}
                  </Text>
                  {!!category.caption && (
                    <Text
                      style={{
                        fontSize: 12,
                        lineHeight: 18,
                        color: Colors.textSecondary,
                        marginTop: 5,
                      }}
                    >
                      {category.caption}
                    </Text>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <Slider
                      style={{ flex: 1, height: 44 }}
                      minimumValue={1}
                      maximumValue={10}
                      step={1}
                      value={scores[category.key]}
                      onValueChange={(v) =>
                        setScores((p) => ({ ...p, [category.key]: v }))
                      }
                      minimumTrackTintColor={Colors.green}
                      thumbTintColor={Colors.green}
                      accessibilityLabel={category.title}
                      accessibilityValue={{
                        min: 1,
                        max: 10,
                        now: scores[category.key],
                      }}
                    />
                    <Text style={{ color: Colors.green, width: 38 }}>
                      {scores[category.key]}/10
                    </Text>
                  </View>
                </View>
              ))}
              <Text style={{ color: Colors.green, marginBottom: 20 }}>
                Overall score:{" "}
                {(
                  Object.values(scores).reduce((a, b) => a + b, 0) / 10
                ).toFixed(1)}{" "}
                / 5
              </Text>
              {!isList && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ color: Colors.textPrimary, marginBottom: 12 }}>
                    Full advertised green fee
                  </Text>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                  >
                    {FEE_BANDS.map((band) => (
                      <TouchableOpacity
                        key={band}
                        onPress={() => setFeeBand(band)}
                        style={{
                          padding: 12,
                          borderRadius: Radius.sm,
                          backgroundColor:
                            feeBand === band ? Colors.green : Colors.white,
                        }}
                      >
                        <Text
                          style={{
                            color:
                              feeBand === band
                                ? Colors.ivory
                                : Colors.textPrimary,
                          }}
                        >
                          {band}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
          {isEdit && existing?.scores == null && mode === "review" && (
            <Text style={{ color: Colors.textSecondary, marginBottom: 20 }}>
              Original rating: {rating}/5
            </Text>
          )}
          {!isList && (
            <>
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
            </>
          )}
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
            {mode === "round" ? "ROUND COMMENTS" : "PERSONAL REVIEW"}
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
            Share your photos from this round. Up to {MAX_PHOTOS} photos.
            {isList
              ? "They appear with your list review."
              : "They appear on the course page as soon as you save."}
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
            {!isEdit && selectedPhotos.length < MAX_PHOTOS && (
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
          {!isEdit && selectedPhotos.length > 0 && (
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
                {selectedPhotos.length !== 1 ? "s" : ""} will be published on
                the course page when this round is recorded.
              </Text>
            </View>
          )}

          {isEdit && mode === "review" && (
            <TouchableOpacity
              onPress={() =>
                Alert.alert(
                  "Delete review?",
                  "This removes the review from rankings. Your recorded rounds remain.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          const r = await fetch(endpoint, { method: "DELETE" });
                          if (!r.ok) throw Error("Unable to delete review");
                          await queryClient.invalidateQueries();
                          router.back();
                        } catch (e) {
                          Alert.alert("Unable to delete", e.message);
                        }
                      },
                    },
                  ],
                )
              }
              style={{ padding: 14, marginBottom: 15 }}
            >
              <Text style={{ color: Colors.error, textAlign: "center" }}>
                Delete review
              </Text>
            </TouchableOpacity>
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
            disabled={mutation.isPending || uploading || (isEdit && !existing)}
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
              {mutation.isPending || uploading
                ? "SAVING…"
                : isEdit
                  ? "SAVE CHANGES"
                  : mode === "review"
                    ? "SAVE REVIEW"
                    : "CONFIRM ROUND"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}
