import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Camera,
  Image as ImageIcon,
  Trash2,
  X,
  Lock,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import useUpload from "@/utils/useUpload";
import { authKey, secureStoreOptions } from "@/utils/auth/store";

// ─── Max file size: 8 MB ─────────────────────────────────────────────────────
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Returns HTTP headers for authenticated API calls.
 *
 * On iOS, WKWebView's shared cookie jar (via sharedCookiesEnabled) can be
 * silently flushed when PHPickerViewController is presented and dismissed.
 * PHPickerViewController runs in a separate process on iOS 14+ and triggers
 * an app-state transition (active → inactive → active) which can clear the
 * native HTTPCookieStorage used by React Native's fetch().
 *
 * Including the JWT from SecureStore as Authorization: Bearer ensures the
 * API call is authenticated regardless of cookie state.  The backend's
 * getSessionUserId() checks the cookie session first and falls back to this
 * bearer token when no cookie is found.
 */
async function getApiHeaders(extra = {}) {
  const headers = { ...extra };
  try {
    const stored = await SecureStore.getItemAsync(authKey, secureStoreOptions);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.jwt) {
        headers["Authorization"] = `Bearer ${parsed.jwt}`;
      }
    }
  } catch {
    // SecureStore unavailable — rely on cookie session only
  }
  return headers;
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const [upload, { loading: uploading }] = useUpload();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [handicap, setHandicap] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  // ── Load current profile ─────────────────────────────────────────────────
  const { isLoading, data: profileData } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const headers = await getApiHeaders();
      const r = await fetch("/api/user/profile", { headers });
      if (!r.ok) throw new Error("Failed to fetch profile");
      return r.json();
    },
  });

  // Hydrate form state once when data arrives — works with all React Query versions
  useEffect(() => {
    if (!profileData || hydrated) return;
    const p = profileData?.profile ?? {};
    setFirstName(p.first_name ?? "");
    setLastName(p.last_name ?? "");
    setLocation(p.location ?? "");
    setBio(p.bio ?? "");
    setHandicap(p.handicap != null ? String(p.handicap) : "");
    setPhotoUrl(p.profile_photo_url ?? "");
    setHydrated(true);
  }, [profileData, hydrated]);

  // ── Save full profile ────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (overridePhotoUrl) => {
      const payload = {
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        location: location.trim() || null,
        bio: bio.trim() || null,
        handicap: handicap.trim() ? parseFloat(handicap) : null,
        // Always send the current photo URL so the backend can write the correct value.
        // When overridePhotoUrl is provided (new upload), use that.
        // When it is undefined (normal text save), use the hydrated photoUrl state.
        // Never send an empty string — convert to null so the backend treats it correctly.
        profilePhotoUrl:
          (overridePhotoUrl !== undefined ? overridePhotoUrl : photoUrl) ||
          null,
      };

      // Include JWT bearer token so auth works even if iOS flushed the cookie jar
      const headers = await getApiHeaders({
        "Content-Type": "application/json",
      });

      const r = await fetch("/api/user/profile", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      // Parse the response body regardless of status so we can surface specific errors
      let json;
      try {
        json = await r.json();
      } catch {
        json = {};
      }

      if (!r.ok) {
        // Attach structured error info to the thrown error so onError can use it
        const err = new Error(json?.message ?? "Failed to save profile");
        err.serverError = json?.error;
        err.serverField = json?.field;
        err.serverMessage = json?.message;
        throw err;
      }
      return json;
    },
    onSuccess: (_, overridePhotoUrl) => {
      qc.invalidateQueries({ queryKey: ["user-profile"] });
      // Only navigate back when saving the full form (not photo-only saves)
      if (overridePhotoUrl === undefined) router.back();
    },
    onError: (err) => {
      // Surface specific messages returned by the server
      const serverError = err?.serverError;
      const serverMessage = err?.serverMessage;

      if (serverError === "session_expired") {
        Alert.alert(
          "Signed Out",
          "Your session has expired. Please sign in again.",
        );
        return;
      }
      if (serverError === "validation") {
        Alert.alert(
          "Invalid Input",
          serverMessage ?? "Please check your profile details.",
        );
        return;
      }
      if (serverError === "account_suspended") {
        Alert.alert(
          "Account Suspended",
          serverMessage ?? "This account is suspended.",
        );
        return;
      }
      if (serverError === "server_error") {
        Alert.alert(
          "Error",
          serverMessage ?? "Unable to update profile due to a server error.",
        );
        return;
      }
      // Fallback
      Alert.alert("Error", "Could not save profile. Please try again.");
    },
  });

  // ── Photo helpers ────────────────────────────────────────────────────────

  // Internal: upload asset and save URL directly to profile
  const processAndSavePhoto = useCallback(
    async (asset) => {
      setPhotoSheetOpen(false);

      // Basic size guard on file size if available
      if (asset.fileSize && asset.fileSize > MAX_BYTES) {
        Alert.alert(
          "Image Too Large",
          "Please choose an image smaller than 8 MB.",
        );
        return;
      }

      const result = await upload({ reactNativeAsset: asset });
      if (result.error) {
        Alert.alert("Upload Failed", result.error);
        return;
      }

      const newUrl = result.url;
      setPhotoUrl(newUrl);

      // Save photo URL to profile immediately — persistent from this point on
      saveMutation.mutate(newUrl);
    },
    [upload, saveMutation],
  );

  // Pick from photo library
  const handleChooseFromLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library in Settings to change your profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // square crop
      quality: 0.85, // 85% quality — good balance for avatars
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets?.length > 0) {
      await processAndSavePhoto(result.assets[0]);
    }
  }, [processAndSavePhoto]);

  // Take photo with camera
  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access in Settings to take a profile photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.length > 0) {
      await processAndSavePhoto(result.assets[0]);
    }
  }, [processAndSavePhoto]);

  // Remove photo
  const handleRemovePhoto = useCallback(() => {
    setPhotoSheetOpen(false);
    Alert.alert(
      "Remove Profile Photo",
      "Are you sure you want to remove your profile photo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            setPhotoUrl("");
            saveMutation.mutate("");
          },
        },
      ],
    );
  }, [saveMutation]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!firstName.trim()) {
      Alert.alert("Required", "First name cannot be empty.");
      return;
    }
    saveMutation.mutate(undefined);
  };

  const isSavingPhoto =
    uploading ||
    (saveMutation.isPending && saveMutation.variables !== undefined);
  const avatarUri = photoUrl.trim() || null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.ivory }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── Header ── */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 14,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.greenLight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ChevronLeft color={Colors.green} size={20} strokeWidth={1.8} />
        </TouchableOpacity>

        <Text
          style={{
            flex: 1,
            fontSize: 18,
            fontWeight: "300",
            fontStyle: "italic",
            color: Colors.textPrimary,
          }}
        >
          Edit Profile
        </Text>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saveMutation.isPending || uploading}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: Radius.pill,
            backgroundColor: Colors.green,
            opacity: saveMutation.isPending || uploading ? 0.6 : 1,
          }}
        >
          {saveMutation.isPending && saveMutation.variables === undefined ? (
            <ActivityIndicator size="small" color={Colors.ivory} />
          ) : (
            <>
              <Check color={Colors.ivory} size={14} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  color: Colors.ivory,
                }}
              >
                SAVE
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator color={Colors.green} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: Spacing.screenH,
            paddingTop: 28,
            paddingBottom: insets.bottom + 40,
          }}
        >
          {/* ── Avatar Section ── */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <TouchableOpacity
              onPress={() => setPhotoSheetOpen(true)}
              disabled={isSavingPhoto}
              activeOpacity={0.8}
            >
              {/* Avatar ring */}
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  borderWidth: 2.5,
                  borderColor: Colors.green,
                  padding: 2,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 44,
                    overflow: "hidden",
                    backgroundColor: Colors.ivoryDeep,
                  }}
                >
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <View
                      style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: Colors.green,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 34,
                          fontWeight: "700",
                          color: Colors.ivory,
                        }}
                      >
                        {(firstName || lastName || "G").trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Loading overlay */}
                  {isSavingPhoto && (
                    <View
                      style={{
                        ...StyleSheet_absoluteFill,
                        backgroundColor: "rgba(27,56,40,0.65)",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <ActivityIndicator color={Colors.ivory} size="small" />
                    </View>
                  )}
                </View>
              </View>

              {/* Camera badge */}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: Colors.green,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 2.5,
                  borderColor: Colors.ivory,
                  ...Shadow.card,
                }}
              >
                <Camera color={Colors.ivory} size={13} strokeWidth={2} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPhotoSheetOpen(true)}
              disabled={isSavingPhoto}
              style={{ marginTop: 12 }}
            >
              <Text
                style={{ fontSize: 13, fontWeight: "600", color: Colors.green }}
              >
                {isSavingPhoto ? "Uploading…" : "Change Profile Photo"}
              </Text>
            </TouchableOpacity>
            <Text
              style={{ fontSize: 11, color: Colors.textMuted, marginTop: 3 }}
            >
              JPG or PNG · Max 8 MB
            </Text>
          </View>

          {/* ── Name row ── */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="FIRST NAME *">
                <TextInput
                  style={inputStyle}
                  placeholder="First name"
                  placeholderTextColor={Colors.textMuted}
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="LAST NAME">
                <TextInput
                  style={inputStyle}
                  placeholder="Last name"
                  placeholderTextColor={Colors.textMuted}
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                />
              </Field>
            </View>
          </View>

          {/* ── Location ── */}
          <Field label="LOCATION">
            <TextInput
              style={inputStyle}
              placeholder="e.g. Nottingham, England"
              placeholderTextColor={Colors.textMuted}
              value={location}
              onChangeText={setLocation}
              autoCapitalize="words"
            />
          </Field>

          {/* ── Handicap ── */}
          <Field label="HANDICAP">
            <TextInput
              style={inputStyle}
              placeholder="e.g. 6.2"
              placeholderTextColor={Colors.textMuted}
              value={handicap}
              onChangeText={setHandicap}
              keyboardType="decimal-pad"
            />
          </Field>

          {/* ── Bio ── */}
          <Field label="BIO">
            <TextInput
              style={[inputStyle, { height: 100, textAlignVertical: "top" }]}
              placeholder="A little about your golf…"
              placeholderTextColor={Colors.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={280}
              autoCapitalize="sentences"
            />
            <Text
              style={{
                fontSize: 10,
                color: Colors.textMuted,
                textAlign: "right",
                marginTop: 4,
              }}
            >
              {bio.length}/280
            </Text>
          </Field>

          {/* ── Account Security ── */}
          <View style={{ marginTop: 10 }}>
            <Text
              style={{
                fontSize: 9,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: Colors.textSecondary,
                marginBottom: 10,
              }}
            >
              ACCOUNT SECURITY
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/profile/change-password")}
              activeOpacity={0.75}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.md,
                borderWidth: 1,
                borderColor: Colors.border,
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 15,
                paddingHorizontal: 16,
                gap: 12,
              }}
            >
              {/* Lock icon badge */}
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: Colors.greenLight,
                  borderWidth: 1,
                  borderColor: Colors.greenBorder,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Lock color={Colors.green} size={16} strokeWidth={1.8} />
              </View>

              {/* Label */}
              <Text
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: "500",
                  color: Colors.textPrimary,
                }}
              >
                Change Password
              </Text>

              <ChevronRight
                color={Colors.textMuted}
                size={18}
                strokeWidth={1.8}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Photo Action Sheet ── */}
      <PhotoActionSheet
        visible={photoSheetOpen}
        hasPhoto={!!avatarUri}
        onClose={() => setPhotoSheetOpen(false)}
        onChooseFromLibrary={handleChooseFromLibrary}
        onTakePhoto={handleTakePhoto}
        onRemovePhoto={handleRemovePhoto}
        insets={insets}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Photo Action Sheet ───────────────────────────────────────────────────────

function PhotoActionSheet({
  visible,
  hasPhoto,
  onClose,
  onChooseFromLibrary,
  onTakePhoto,
  onRemovePhoto,
  insets,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Scrim */}
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
        activeOpacity={1}
        onPress={onClose}
      />

      {/* Sheet */}
      <View
        style={{
          backgroundColor: Colors.white,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 8,
          paddingBottom: insets.bottom + 12,
          ...Shadow.float,
        }}
      >
        {/* Handle */}
        <View
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: Colors.border,
            alignSelf: "center",
            marginBottom: 16,
          }}
        />

        {/* Title */}
        <View
          style={{
            paddingHorizontal: Spacing.screenH,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: Colors.border,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
            }}
          >
            PROFILE PHOTO
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X color={Colors.textMuted} size={18} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={{ paddingHorizontal: Spacing.screenH, paddingTop: 8 }}>
          <SheetOption
            icon={ImageIcon}
            label="Choose from Photos"
            onPress={onChooseFromLibrary}
          />
          <SheetOption icon={Camera} label="Take Photo" onPress={onTakePhoto} />
          {hasPhoto && (
            <SheetOption
              icon={Trash2}
              label="Remove Photo"
              onPress={onRemovePhoto}
              destructive
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function SheetOption({ icon: Icon, label, onPress, destructive }) {
  const color = destructive ? Colors.error : Colors.textPrimary;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
      }}
    >
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: destructive
            ? "rgba(192,57,43,0.08)"
            : Colors.greenLight,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Icon
          color={destructive ? Colors.error : Colors.green}
          size={17}
          strokeWidth={1.8}
        />
      </View>
      <Text style={{ fontSize: 15, fontWeight: "500", color }}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Inline absolute fill helper (avoids StyleSheet import) ─────────────────
const StyleSheet_absoluteFill = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ─── Shared sub-components ────────────────────────────────────────────────────

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 1.5,
          color: Colors.textSecondary,
          marginBottom: 7,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: Colors.white,
  borderRadius: Radius.md,
  borderWidth: 1,
  borderColor: Colors.border,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 14,
  color: Colors.textPrimary,
};
