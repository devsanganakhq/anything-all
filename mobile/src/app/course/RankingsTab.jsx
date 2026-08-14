import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Trophy, Globe } from "lucide-react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { SectionLabel, EmptySection } from "./SharedComponents";

export function RankingsTab({
  hasRankings,
  rankings,
  RANKING_ACCENTS,
  RANKING_DEFAULT,
}) {
  return (
    <>
      <SectionLabel icon={Trophy} label="ALL RANKINGS" gold />
      {hasRankings ? (
        <View style={{ gap: 12, marginBottom: 24 }}>
          {rankings.map((r) => {
            const accent = RANKING_ACCENTS[r.ranking_name] ?? RANKING_DEFAULT;
            return (
              <View
                key={r.id}
                style={{
                  backgroundColor: Colors.white,
                  borderRadius: Radius.lg,
                  borderWidth: 1,
                  borderColor: Colors.border,
                  overflow: "hidden",
                  flexDirection: "row",
                  ...Shadow.card,
                }}
              >
                {/* Left accent bar */}
                <View style={{ width: 5, backgroundColor: accent.color }} />

                <View style={{ flex: 1, padding: 16 }}>
                  {/* Collection header */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 18, marginRight: 8 }}>
                      {accent.flag}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: Colors.textPrimary,
                        }}
                      >
                        {r.ranking_name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: Colors.textSecondary,
                          marginTop: 1,
                        }}
                      >
                        {r.ranking_source} · {r.ranking_year}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: accent.bg,
                        borderRadius: 50,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderWidth: 1,
                        borderColor: accent.color + "40",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "800",
                          color: accent.color,
                        }}
                      >
                        VERIFIED
                      </Text>
                    </View>
                  </View>

                  {/* Position number */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 56,
                        fontWeight: "800",
                        color: accent.color,
                        lineHeight: 60,
                        letterSpacing: -2,
                      }}
                    >
                      #{r.position}
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: Colors.textMuted,
                        marginBottom: 8,
                      }}
                    >
                      in the {r.ranking_name}
                    </Text>
                  </View>

                  {/* Source link */}
                  {r.source_url && (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(r.source_url)}
                      style={{
                        marginTop: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                        borderTopWidth: 1,
                        borderTopColor: Colors.divider,
                        paddingTop: 10,
                      }}
                    >
                      <Globe size={12} color={accent.color} strokeWidth={1.8} />
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: accent.color,
                        }}
                      >
                        View on {r.ranking_source}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            padding: 24,
            alignItems: "center",
            borderWidth: 1,
            borderColor: Colors.border,
            marginBottom: 24,
          }}
        >
          <Trophy size={28} color={Colors.textMuted} strokeWidth={1.4} />
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: Colors.textPrimary,
              marginTop: 12,
            }}
          >
            Not yet ranked
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: Colors.textSecondary,
              textAlign: "center",
              marginTop: 6,
              lineHeight: 19,
            }}
          >
            This course is not currently listed in any of the five Heathland
            Links ranking collections.
          </Text>
        </View>
      )}
    </>
  );
}
