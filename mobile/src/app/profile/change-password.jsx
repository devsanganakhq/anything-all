/**
 * Change Password screen — Heathland Links
 *
 * Replaces the previous custom argon2 implementation with the official
 * password-reset email flow. This guarantees the new hash is stored in
 * exactly the same format the authentication system expects.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Lock,
  Mail,
  Check,
  AlertCircle,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // ── POST /api/user/request-password-reset — uses session email, no body ──
  const sendMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/user/request-password-reset", {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to send reset email");
      return data;
    },
    onSuccess: () => {
      setError("");
      setSent(true);
    },
    onError: (err) => {
      setError(err.message || "Something went wrong. Please try again.");
    },
  });

  const isLoading = sendMutation.isLoading;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
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
          Change Password
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingTop: 48,
          paddingBottom: insets.bottom + 40,
          alignItems: "center",
        }}
      >
        {sent ? (
          /* ──────────── SUCCESS STATE ──────────── */
          <View style={{ alignItems: "center", maxWidth: 300, width: "100%" }}>
            <View style={successCircle}>
              <Check color={Colors.green} size={34} strokeWidth={2} />
            </View>

            <Text style={bigHeading}>Email Sent</Text>

            <Text style={bodyText}>
              A secure password-reset link has been sent to your registered
              email address.
            </Text>

            <Text style={mutedText}>
              Open the email on any device, tap the link, and follow the steps
              to set your new password. The link expires in{" "}
              <Text style={{ fontWeight: "600", color: Colors.textSecondary }}>
                60 minutes
              </Text>
              .
            </Text>

            {/* Step-by-step card */}
            <View style={stepCard}>
              <Text style={sectionLabel}>NEXT STEPS</Text>
              {[
                "Open the Heathland Links email",
                'Tap "Set New Password"',
                "Enter and confirm your new password",
                "Return here and sign back in",
              ].map((step, i) => (
                <View key={i} style={stepRow}>
                  <View style={stepBadge}>
                    <Text style={stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={stepText}>{step}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => router.back()}
              style={[primaryBtn, { width: "100%" }]}
            >
              <Text style={primaryBtnText}>BACK TO PROFILE</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ──────────── SEND LINK UI ──────────── */
          <View style={{ alignItems: "center", maxWidth: 300, width: "100%" }}>
            <View style={lockCircle}>
              <Lock color={Colors.green} size={30} strokeWidth={1.5} />
            </View>

            <Text style={bigHeading}>Change Password</Text>

            <Text style={bodyText}>
              For your security, we send a one-time reset link to your
              registered email address.
            </Text>

            <Text style={mutedText}>
              Tap below and we'll email you a secure link. Open it on any device
              to set your new password. The link expires after 60 minutes.
            </Text>

            {/* Email info row */}
            <View style={infoRow}>
              <View style={iconBadge}>
                <Mail color={Colors.green} size={16} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={infoTitle}>Secure email link</Text>
                <Text style={infoSub}>Sent to your registered address</Text>
              </View>
            </View>

            {/* Error */}
            {error ? (
              <View style={errorBox}>
                <AlertCircle color={Colors.error} size={16} strokeWidth={1.8} />
                <Text style={errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Send button */}
            <TouchableOpacity
              onPress={() => sendMutation.mutate()}
              disabled={isLoading}
              activeOpacity={0.85}
              style={[
                primaryBtn,
                {
                  width: "100%",
                  opacity: isLoading ? 0.7 : 1,
                  marginBottom: 20,
                },
              ]}
            >
              {isLoading ? (
                <ActivityIndicator color={Colors.ivory} size="small" />
              ) : (
                <Text style={primaryBtnText}>SEND RESET LINK</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()}>
              <Text
                style={{
                  fontSize: 13,
                  color: Colors.textSecondary,
                  fontWeight: "500",
                  textDecorationLine: "underline",
                  textDecorationColor: Colors.textMuted,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

/* ─── Shared styles ──────────────────────────────────────────────────────── */

const lockCircle = {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: Colors.greenLight,
  borderWidth: 2,
  borderColor: Colors.greenBorder,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 28,
};

const successCircle = {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: Colors.greenLight,
  borderWidth: 2,
  borderColor: Colors.green,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 24,
};

const bigHeading = {
  fontSize: 22,
  fontWeight: "300",
  fontStyle: "italic",
  color: Colors.textPrimary,
  textAlign: "center",
  marginBottom: 14,
};

const bodyText = {
  fontSize: 14,
  color: Colors.textSecondary,
  textAlign: "center",
  lineHeight: 22,
  marginBottom: 10,
};

const mutedText = {
  fontSize: 13,
  color: Colors.textMuted,
  textAlign: "center",
  lineHeight: 20,
  marginBottom: 28,
};

const sectionLabel = {
  fontSize: 9,
  fontWeight: "700",
  letterSpacing: 1.5,
  color: Colors.textSecondary,
  marginBottom: 14,
};

const stepCard = {
  backgroundColor: Colors.white,
  borderRadius: Radius.md,
  borderWidth: 1,
  borderColor: Colors.border,
  padding: 16,
  width: "100%",
  marginBottom: 32,
};

const stepRow = {
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
  marginBottom: 10,
};

const stepBadge = {
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: Colors.green,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 1,
  flexShrink: 0,
};

const stepNum = { fontSize: 10, fontWeight: "700", color: Colors.ivory };

const stepText = {
  flex: 1,
  fontSize: 13,
  color: Colors.textPrimary,
  lineHeight: 20,
};

const infoRow = {
  backgroundColor: Colors.white,
  borderRadius: Radius.md,
  borderWidth: 1,
  borderColor: Colors.border,
  flexDirection: "row",
  alignItems: "center",
  padding: 16,
  gap: 12,
  width: "100%",
  marginBottom: 24,
};

const iconBadge = {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: Colors.greenLight,
  borderWidth: 1,
  borderColor: Colors.greenBorder,
  justifyContent: "center",
  alignItems: "center",
};

const infoTitle = {
  fontSize: 13,
  fontWeight: "600",
  color: Colors.textPrimary,
  marginBottom: 2,
};

const infoSub = { fontSize: 12, color: Colors.textMuted };

const errorBox = {
  backgroundColor: "rgba(192,57,43,0.07)",
  borderRadius: Radius.md,
  borderWidth: 1,
  borderColor: "rgba(192,57,43,0.2)",
  flexDirection: "row",
  alignItems: "flex-start",
  gap: 10,
  padding: 14,
  width: "100%",
  marginBottom: 20,
};

const errorText = {
  flex: 1,
  fontSize: 13,
  color: Colors.error,
  lineHeight: 20,
};

const primaryBtn = {
  backgroundColor: Colors.green,
  borderRadius: Radius.pill,
  paddingVertical: 16,
  alignItems: "center",
  justifyContent: "center",
  ...Shadow.card,
};

const primaryBtnText = {
  fontSize: 12,
  fontWeight: "700",
  letterSpacing: 1.2,
  color: Colors.ivory,
};
