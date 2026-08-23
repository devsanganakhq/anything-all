/**
 * ClaimClubModal — enquiry sheet for club managers claiming a course profile.
 * Enquire Now opens the device mail app with a prefilled template.
 */

import React, { useCallback } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { Colors, Radius, Spacing } from "@/constants/theme";
import {
  courseDisplayName,
  formatCourseLocation,
} from "@/utils/courseDisplayName";
import { capture, captureException } from "@/utils/posthog";
import { AnalyticsEvents } from "@/utils/analyticsEvents";

export const CLAIM_ENQUIRY_EMAIL = "Cameron@heathlandlinks.com";

const SHEET_MAX_H = Math.round(Dimensions.get("window").height * 0.88);

const BENEFITS = [
  "Keep course details, facilities and contact information accurate",
  "Add professional imagery, course descriptions and club updates",
  "Promote visitor golf, membership opportunities, events and special offers",
  "Engage with golfers who have played—or want to play—your course",
  "Increase visibility across our maps, rankings and discovery features",
  "Display a verified club profile to build trust with potential visitors",
  "Receive personalised analytic data regarding your profile and how it's performing",
  "Continual improvement and features added alongside the above",
];

function buildClaimEnquiryMailto(course) {
  const { title: clubName } = courseDisplayName(course);
  const location =
    formatCourseLocation(course, { includeCounty: true }) ||
    "[Town/City, County/Region, Country]";
  const website = course?.website
    ? String(course.website).trim()
    : "[Enter website address]";

  const subject = `Golf Club Profile Claim Enquiry – ${clubName}`;
  const body = `Hello Heathland Links,

I would like to enquire about claiming and managing our golf club's profile on Heathland Links.

Please find our details below:

Golf club name:
${clubName}

Club location:
${location}

Club website:
${website}

Contact name:
[Enter your full name]

Position at the club:
[Enter your role]

Email address:
[Enter your email address]

Telephone number:
[Enter your telephone number]

Preferred contact method:
[Email / Telephone]

Are you authorised to act on behalf of the golf club?
[Yes / No]

Are you interested in professional drone photography or video footage for your club profile and marketing use?
[Yes / No / Please provide more information]

Additional information or questions:
[Enter any relevant information]

Please contact me to explain the available profile options, pricing and the next steps required to verify and claim our club's profile.

Kind regards,

[Your name]
[Your position]
${clubName}`;

  return `mailto:${CLAIM_ENQUIRY_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function ClaimClubModal({ visible, onClose, course }) {
  const insets = useSafeAreaInsets();

  const handleEnquire = useCallback(async () => {
    const { title: clubName } = courseDisplayName(course);
    const courseProps = {
      course_id: course?.id,
      course_name: clubName,
    };
    capture(AnalyticsEvents.CLAIM_CLUB_ENQUIRE_CLICKED, courseProps);

    const url = buildClaimEnquiryMailto(course);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        capture(AnalyticsEvents.CLAIM_CLUB_ENQUIRE_FAILED, {
          ...courseProps,
          reason: "cannot_open_url",
        });
        Alert.alert(
          "Email unavailable",
          `No email app is available. Please contact us at ${CLAIM_ENQUIRY_EMAIL}.`,
        );
        return;
      }
      await Linking.openURL(url);
      onClose?.();
    } catch (error) {
      capture(AnalyticsEvents.CLAIM_CLUB_ENQUIRE_FAILED, {
        ...courseProps,
        reason: "open_threw",
      });
      captureException(error, {
        ...courseProps,
        context: "claim_club_enquire",
      });
      Alert.alert(
        "Email unavailable",
        `Couldn't open your email app. Please contact us at ${CLAIM_ENQUIRY_EMAIL}.`,
      );
    }
  }, [course, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
          accessibilityLabel="Dismiss"
        />

        <View
          style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: Radius.xl,
            borderTopRightRadius: Radius.xl,
            height: SHEET_MAX_H,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 16,
                fontWeight: "700",
                color: Colors.textPrimary,
                lineHeight: 22,
              }}
            >
              Claim and Manage Your Club Profile
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              accessibilityLabel="Close"
            >
              <X size={20} color={Colors.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Scrollable body — needs flex:1 + fixed sheet height to scroll */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator
            bounces
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: Spacing.lg,
              paddingTop: 18,
              paddingBottom: 20,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: Colors.textPrimary,
                lineHeight: 22,
                marginBottom: 16,
              }}
            >
              Take control of how your golf club is presented to the Heathland
              Links community.
            </Text>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: Colors.textPrimary,
                marginBottom: 10,
              }}
            >
              By claiming your profile, your club can:
            </Text>

            {BENEFITS.map((item) => (
              <View
                key={item}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: Colors.green,
                    lineHeight: 20,
                    marginTop: 1,
                  }}
                >
                  •
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: Colors.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {item}
                </Text>
              </View>
            ))}

            <Text
              style={{
                fontSize: 13,
                color: Colors.textSecondary,
                lineHeight: 20,
                marginTop: 10,
                marginBottom: 14,
              }}
            >
              Looking for new content? We can also arrange professional drone
              photography and video footage for your club, available as an
              additional service. This content can be featured on your Heathland
              Links profile and supplied for use across your own website and
              marketing channels.
            </Text>

            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: Colors.textPrimary,
                lineHeight: 22,
              }}
            >
              Claim your profile today to showcase your club to an engaged
              community of golfers.
            </Text>
          </ScrollView>

          {/* Sticky footer — always visible */}
          <View
            style={{
              paddingHorizontal: Spacing.lg,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopWidth: 1,
              borderTopColor: Colors.border,
              backgroundColor: Colors.white,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.6,
                color: Colors.textSecondary,
                marginBottom: 10,
              }}
            >
              ENQUIRE ABOUT CLAIMING THIS PROFILE
            </Text>

            <TouchableOpacity
              onPress={handleEnquire}
              activeOpacity={0.85}
              style={{
                backgroundColor: Colors.green,
                borderRadius: Radius.md,
                paddingVertical: 15,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: Colors.ivory,
                }}
              >
                ENQUIRE NOW
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
