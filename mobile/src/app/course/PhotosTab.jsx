/**
 * PhotosTab — Course detail photos section
 * Carousel · thumbnail grid · upload sheet · moderation-aware
 */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { Camera, X, CheckCircle, Upload, ImageIcon } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePickerLib from "expo-image-picker";
import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
import { CoursePhotoCarousel } from "@/components/CoursePhotoCarousel";
import { SectionLabel, EmptySection } from "./SharedComponents";
import useUpload from "@/utils/useUpload";

const THUMB_SIZE = 110;
const MAX_PHOTOS = 10;
const TERMS_VERSION = "1.0";
const TERMS_TEXT =
  "I confirm that I took these photos or have permission to upload them, " +
  "and I grant Heathland Links permission to display them within the app " +
  "and related promotional services under the platform terms.";

export function PhotosTab({ courseId, alreadyPlayed, course }) {
  const qc = useQueryClient();
  const [uploadSheet, setUploadSheet] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [upload, { loading: uploading }] = useUpload();

  // Fetch approved photos via priority-aware endpoint
  const { data, isLoading } = useQuery({
    queryKey: ["course-photos", courseId],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${courseId}/photos`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60_000,
  });
  const photos = data?.photos ?? [];
  const pendingCount = data?.pendingCount ?? 0;

  const resetSheet = useCallback(() => {
    setSelectedPhotos([]);
    setTermsAccepted(false);
    setUploadError(null);
    setUploadSuccess(false);
  }, []);

  const openSheet = useCallback(() => {
    resetSheet();
    setUploadSheet(true);
  }, [resetSheet]);
  const closeSheet = useCallback(() => setUploadSheet(false), []);

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

  const removePhoto = useCallback(
    (i) => setSelectedPhotos((p) => p.filter((_, j) => j !== i)),
    [],
  );
  const updateCaption = useCallback(
    (i, t) =>
      setSelectedPhotos((p) =>
        p.map((x, j) => (j === i ? { ...x, caption: t } : x)),
      ),
    [],
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      setUploadError(null);
      const uploaded = [];
      for (const p of selectedPhotos) {
        const r = await upload({ reactNativeAsset: { uri: p.uri } });
        if (r.error) throw new Error(r.error);
        uploaded.push({ imageUrl: r.url, caption: p.caption || null });
      }
      const res = await fetch("/api/course-photos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          photos: uploaded,
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      return json;
    },
    onSuccess: () => {
      setUploadSuccess(true);
      qc.invalidateQueries({ queryKey: ["course-photos", courseId] });
      qc.refetchQueries({ queryKey: ["course-photos", courseId] });
    },
    onError: (err) => setUploadError(err.message),
  });

  if (isLoading) {
    return (
      <View
        style={{ height: 220, justifyContent: "center", alignItems: "center" }}
      >
        <ActivityIndicator color={Colors.green} />
      </View>
    );
  }

  return (
    <>
      {/* Carousel (full width — override parent padding) */}
      <View style={{ marginHorizontal: -Spacing.screenH, marginBottom: 22 }}>
        <CoursePhotoCarousel
          photos={photos}
          height={280}
          courseId={courseId}
          course={course}
          onUploadPress={openSheet}
          showUploadBtn={alreadyPlayed}
        />
      </View>

      {/* Thumbnail grid */}
      {photos.length > 0 && (
        <>
          <SectionLabel
            icon={Camera}
            label={pendingCount > 0 ? "YOUR PHOTOS & GALLERY" : "ALL PHOTOS"}
          />
          {pendingCount > 0 && (
            <Text
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                marginBottom: 10,
                lineHeight: 17,
              }}
            >
              {pendingCount} photo{pendingCount !== 1 ? "s" : ""} awaiting
              review — visible only to you until approved.
            </Text>
          )}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 4,
              marginBottom: 20,
            }}
          >
            {photos.map((p, i) => (
              <View
                key={p.id ?? i}
                style={{
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: Radius.sm,
                  overflow: "hidden",
                  backgroundColor: Colors.ivoryDeep,
                }}
              >
                <Image
                  source={{ uri: p.thumbnail_url || p.image_url }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
                {(p.is_pending || p.moderation_status === "pending") && (
                  <View
                    style={{
                      position: "absolute",
                      left: 4,
                      bottom: 4,
                      backgroundColor: "rgba(217, 119, 6, 0.92)",
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: Radius.pill,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 7,
                        fontWeight: "800",
                        letterSpacing: 0.6,
                        color: "#FFF",
                      }}
                    >
                      PENDING
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Upload CTA */}
      {alreadyPlayed && (
        <TouchableOpacity
          onPress={openSheet}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            borderWidth: 1.5,
            borderColor: Colors.greenBorder,
            borderStyle: "dashed",
            borderRadius: Radius.md,
            paddingVertical: 14,
            backgroundColor: Colors.greenLight,
            marginBottom: 24,
          }}
        >
          <Camera size={15} color={Colors.green} strokeWidth={1.8} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
              color: Colors.green,
            }}
          >
            ADD COURSE PHOTOS
          </Text>
        </TouchableOpacity>
      )}

      {!alreadyPlayed && photos.length === 0 && (
        <EmptySection
          icon={Camera}
          title="No photos yet"
          body="Members who have played this course can share photos."
        />
      )}

      {/* Upload Sheet */}
      <Modal
        visible={uploadSheet}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: Spacing.screenH,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              backgroundColor: Colors.white,
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
              ADD COURSE PHOTOS
            </Text>
            <TouchableOpacity onPress={closeSheet}>
              <X size={20} color={Colors.textSecondary} strokeWidth={1.8} />
            </TouchableOpacity>
          </View>

          {uploadSuccess ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 32,
              }}
            >
              <CheckCircle size={52} color={Colors.green} strokeWidth={1.4} />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "300",
                  fontStyle: "italic",
                  color: Colors.textPrimary,
                  marginTop: 20,
                  textAlign: "center",
                  lineHeight: 27,
                }}
              >
                Photos submitted
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  marginTop: 10,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Your photos have been submitted for approval. They will appear
                on the course page once reviewed by our team.
              </Text>
              <TouchableOpacity
                onPress={closeSheet}
                style={{
                  marginTop: 28,
                  backgroundColor: Colors.green,
                  paddingHorizontal: 28,
                  paddingVertical: 13,
                  borderRadius: Radius.md,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    color: Colors.ivory,
                  }}
                >
                  DONE
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{
                padding: Spacing.screenH,
                paddingBottom: 40,
              }}
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.textSecondary,
                  lineHeight: 21,
                  marginBottom: 20,
                }}
              >
                Share your photos from{" "}
                <Text
                  style={{ fontStyle: "italic", color: Colors.textPrimary }}
                >
                  {course?.name}
                </Text>
                . Up to {MAX_PHOTOS} photos · reviewed before appearing
                publicly.
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                {selectedPhotos.map((p, i) => (
                  <View
                    key={i}
                    style={{ width: THUMB_SIZE + 10, marginBottom: 8 }}
                  >
                    <View style={{ position: "relative" }}>
                      <Image
                        source={{ uri: p.uri }}
                        style={{
                          width: THUMB_SIZE + 10,
                          height: THUMB_SIZE + 10,
                          borderRadius: Radius.md,
                          backgroundColor: Colors.ivoryDeep,
                        }}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        onPress={() => removePhoto(i)}
                        style={{
                          position: "absolute",
                          top: 5,
                          right: 5,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: "rgba(0,0,0,0.55)",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <X size={12} color="#FFF" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      value={p.caption}
                      onChangeText={(t) => updateCaption(i, t)}
                      placeholder="Caption (optional)"
                      placeholderTextColor={Colors.textMuted}
                      style={{
                        marginTop: 5,
                        fontSize: 11,
                        color: Colors.textPrimary,
                        borderBottomWidth: 1,
                        borderBottomColor: Colors.border,
                        paddingVertical: 3,
                      }}
                    />
                  </View>
                ))}

                {selectedPhotos.length < MAX_PHOTOS && (
                  <TouchableOpacity
                    onPress={pickPhotos}
                    style={{
                      width: THUMB_SIZE + 10,
                      height: THUMB_SIZE + 10,
                      borderRadius: Radius.md,
                      borderWidth: 1.5,
                      borderStyle: "dashed",
                      borderColor: Colors.border,
                      backgroundColor: Colors.white,
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <ImageIcon
                      size={24}
                      color={Colors.textMuted}
                      strokeWidth={1.5}
                    />
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: "700",
                        color: Colors.textMuted,
                        letterSpacing: 1,
                      }}
                    >
                      {selectedPhotos.length === 0
                        ? "SELECT PHOTOS"
                        : "ADD MORE"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Terms consent */}
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
                  marginBottom: 16,
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
                    backgroundColor: termsAccepted
                      ? Colors.green
                      : "transparent",
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
                    fontSize: 12,
                    color: Colors.textSecondary,
                    lineHeight: 18,
                  }}
                >
                  {TERMS_TEXT}
                </Text>
              </TouchableOpacity>

              {uploadError && (
                <Text
                  style={{
                    fontSize: 12,
                    color: Colors.error,
                    marginBottom: 14,
                    lineHeight: 18,
                  }}
                >
                  {uploadError}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => submitMutation.mutate()}
                disabled={
                  selectedPhotos.length === 0 ||
                  !termsAccepted ||
                  submitMutation.isPending ||
                  uploading
                }
                style={{
                  backgroundColor: Colors.green,
                  paddingVertical: 16,
                  borderRadius: Radius.md,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 8,
                  opacity:
                    selectedPhotos.length === 0 || !termsAccepted ? 0.45 : 1,
                }}
              >
                {submitMutation.isPending || uploading ? (
                  <ActivityIndicator color={Colors.ivory} size="small" />
                ) : (
                  <Upload size={14} color={Colors.ivory} strokeWidth={2} />
                )}
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    letterSpacing: 1.5,
                    color: Colors.ivory,
                  }}
                >
                  {submitMutation.isPending || uploading
                    ? "UPLOADING…"
                    : `SUBMIT ${selectedPhotos.length > 0 ? selectedPhotos.length : ""} PHOTO${selectedPhotos.length !== 1 ? "S" : ""}`}
                </Text>
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 10,
                  color: Colors.textMuted,
                  textAlign: "center",
                  marginTop: 10,
                  lineHeight: 15,
                }}
              >
                JPEG · PNG · Max 15 MB per photo
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </>
  );
}

export default PhotosTab;
