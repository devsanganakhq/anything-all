import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Globe, MapPin, ChevronRight, Building2 } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { SectionLabel } from "./SharedComponents";
import {
  resolveCourseHoles,
  resolveCoursePar,
} from "@/utils/courseDisplayName";

export function InfoTab({
  course,
  handleMap,
  onClaimCardLayout,
  onOpenClaimModal,
}) {
  return (
    <>
      <SectionLabel icon={Globe} label="COURSE DETAILS" />
      <View
        style={{
          backgroundColor: Colors.white,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: Colors.border,
          overflow: "hidden",
          marginBottom: 20,
          ...Shadow.card,
        }}
      >
        {[
          { label: "Course name", value: course.name },
          { label: "Club", value: course.club_name },
          {
            label: "Course type",
            value: course.course_type
              ? course.course_type.charAt(0).toUpperCase() +
                course.course_type.slice(1)
              : null,
          },
          { label: "Holes", value: resolveCourseHoles(course) },
          { label: "Par", value: resolveCoursePar(course) },
          { label: "Address", value: course.address },
          { label: "City", value: course.city },
          { label: "County", value: course.county },
          { label: "Country", value: course.country },
          { label: "Website", value: course.website, link: true },
          { label: "Phone", value: course.phone },
          {
            label: "Status",
            value: course.course_status
              ? course.course_status
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())
              : "Active",
          },
        ]
          .filter((r) => r.value != null && r.value !== "")
          .map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              activeOpacity={row.link ? 0.6 : 1}
              onPress={() =>
                row.link &&
                Linking.openURL(
                  row.value.startsWith("http")
                    ? row.value
                    : `https://${row.value}`,
                )
              }
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 13,
                paddingHorizontal: 16,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.textSecondary,
                  fontWeight: "600",
                  letterSpacing: 0.3,
                }}
              >
                {row.label.toUpperCase()}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: row.link ? Colors.green : Colors.textPrimary,
                  fontWeight: "500",
                  maxWidth: "56%",
                  textAlign: "right",
                  textDecorationLine: row.link ? "underline" : "none",
                }}
              >
                {String(row.value)}
              </Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* View on map */}
      <TouchableOpacity
        onPress={handleMap}
        style={{
          backgroundColor: Colors.white,
          borderRadius: Radius.md,
          borderWidth: 1,
          borderColor: Colors.border,
          paddingVertical: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          ...Shadow.card,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: Colors.greenLight,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MapPin color={Colors.green} size={16} strokeWidth={1.8} />
        </View>
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: "600",
            color: Colors.textPrimary,
          }}
        >
          View on Map
        </Text>
        <ChevronRight color={Colors.textMuted} size={15} strokeWidth={1.8} />
      </TouchableOpacity>

      {/* Claim club CTA */}
      {!course.is_claimed && (
        <View
          onLayout={onClaimCardLayout}
          style={{
            marginTop: 6,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.md,
            padding: 16,
            backgroundColor: Colors.white,
            marginBottom: 24,
            ...Shadow.card,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: Colors.greenLight,
                justifyContent: "center",
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={16} color={Colors.green} strokeWidth={1.8} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                  marginBottom: 2,
                }}
              >
                Is this your club?
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.textSecondary,
                  lineHeight: 16,
                }}
              >
                Club managers can claim this profile to keep details accurate,
                add imagery, and engage with golfers.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onOpenClaimModal}
            activeOpacity={0.85}
            style={{
              backgroundColor: Colors.green,
              borderRadius: Radius.md,
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 1,
                color: Colors.ivory,
              }}
            >
              CLAIM THIS COURSE
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
