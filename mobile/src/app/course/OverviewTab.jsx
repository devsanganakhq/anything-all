import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { PenLine, Flag, Trophy, Clock } from "lucide-react-native";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { SectionLabel } from "./SharedComponents";
import { timeAgo } from "./utils";
import { ACTIVITY_LABELS } from "@/constants/courseConstants";
import { UserAvatar } from "@/components/UserAvatar";

export function OverviewTab({
  description,
  showFullDesc,
  setShowFullDesc,
  course,
  hasRankings,
  rankings,
  RANKING_ACCENTS,
  RANKING_DEFAULT,
  activity,
}) {
  return (
    <>
      {/* About */}
      <SectionLabel icon={PenLine} label="ABOUT THE COURSE" />
      <View style={{ marginBottom: 24 }}>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            lineHeight: 23,
          }}
        >
          {showFullDesc || description.length <= 220
            ? description
            : description.slice(0, 220) + "…"}
        </Text>
        {description.length > 220 && (
          <TouchableOpacity
            onPress={() => setShowFullDesc((v) => !v)}
            style={{ marginTop: 6 }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: Colors.green,
              }}
            >
              {showFullDesc ? "Show less" : "Read more"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick facts */}
      <SectionLabel icon={Flag} label="QUICK FACTS" />
      <View
        style={{
          backgroundColor: Colors.white,
          borderRadius: Radius.lg,
          borderWidth: 1,
          borderColor: Colors.border,
          overflow: "hidden",
          marginBottom: 24,
          ...Shadow.card,
        }}
      >
        {[
          {
            label: "Course type",
            value: course.course_type
              ? course.course_type.charAt(0).toUpperCase() +
                course.course_type.slice(1)
              : null,
          },
          { label: "Holes", value: course.holes ?? 18 },
          { label: "Par", value: course.par ?? 72 },
          { label: "County", value: course.county },
          { label: "Country", value: course.country },
          { label: "Club", value: course.club_name },
        ]
          .filter((r) => r.value != null && r.value !== "")
          .map((row, i, arr) => (
            <View
              key={row.label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                borderBottomColor: Colors.divider,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
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
                  color: Colors.textPrimary,
                  fontWeight: "600",
                  maxWidth: "55%",
                  textAlign: "right",
                }}
              >
                {String(row.value)}
              </Text>
            </View>
          ))}
      </View>

      {/* Top-ranked badges row */}
      {hasRankings && (
        <>
          <SectionLabel icon={Trophy} label="RANKING HIGHLIGHTS" gold />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              flexGrow: 0,
              marginBottom: 24,
              marginHorizontal: -Spacing.screenH,
            }}
            contentContainerStyle={{
              paddingHorizontal: Spacing.screenH,
              gap: 10,
            }}
          >
            {rankings.map((r) => {
              const accent = RANKING_ACCENTS[r.ranking_name] ?? RANKING_DEFAULT;
              return (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: Radius.lg,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: Colors.border,
                    alignItems: "center",
                    minWidth: 110,
                    ...Shadow.card,
                  }}
                >
                  <Text style={{ fontSize: 9, marginBottom: 4 }}>
                    {accent.flag}
                  </Text>
                  <Text
                    style={{
                      fontSize: 30,
                      fontWeight: "800",
                      color: accent.color,
                      lineHeight: 34,
                    }}
                  >
                    #{r.position}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: accent.color,
                      letterSpacing: 0.5,
                      textAlign: "center",
                      marginTop: 3,
                    }}
                  >
                    {r.ranking_name?.toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 9,
                      color: Colors.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {r.ranking_year}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <>
          <SectionLabel icon={Clock} label="RECENT ACTIVITY" />
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: Radius.lg,
              borderWidth: 1,
              borderColor: Colors.border,
              overflow: "hidden",
              marginBottom: 24,
              ...Shadow.card,
            }}
          >
            {activity.slice(0, 5).map((item, i) => (
              <View
                key={item.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: Colors.divider,
                  gap: 10,
                }}
              >
                <UserAvatar
                  uri={item.profile_photo_url}
                  name={`${item.first_name || ""} ${item.last_name || ""}`.trim()}
                  size={34}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: Colors.textPrimary,
                    }}
                  >
                    {item.first_name} {item.last_name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textSecondary,
                    }}
                  >
                    {ACTIVITY_LABELS[item.activity_type] ?? item.activity_type}
                  </Text>
                </View>
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                  {timeAgo(item.created_at)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}
