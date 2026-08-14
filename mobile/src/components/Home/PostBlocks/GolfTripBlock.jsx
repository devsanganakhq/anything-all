import React from "react";
import { View, Text } from "react-native";
import { Plane, MapPin } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";

export function GolfTripBlock({ post, md }) {
  const destinations = Array.isArray(md.destinations) ? md.destinations : [];
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          backgroundColor: Colors.goldLight,
          borderRadius: Radius.xl,
          borderWidth: 1,
          borderColor: "rgba(201,168,76,0.25)",
          padding: 14,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <Plane color={Colors.gold} size={14} strokeWidth={1.8} />
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1,
              color: Colors.gold,
            }}
          >
            PROPOSED GOLF TRIP
          </Text>
          {md.spaces && (
            <View
              style={{
                marginLeft: "auto",
                backgroundColor: Colors.gold,
                borderRadius: Radius.pill,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text style={{ fontSize: 8, fontWeight: "800", color: "#fff" }}>
                {md.spaces} SPACE{md.spaces > 1 ? "S" : ""}
              </Text>
            </View>
          )}
        </View>

        {destinations.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 6,
              marginBottom: 8,
            }}
          >
            {destinations.map((d, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: "rgba(201,168,76,0.15)",
                  borderRadius: Radius.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <MapPin size={9} color={Colors.gold} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: Colors.textPrimary,
                  }}
                >
                  {d}
                </Text>
              </View>
            ))}
          </View>
        )}
        {md.dates && (
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            📅 {md.dates}
          </Text>
        )}
      </View>

      {post.caption && (
        <Text
          style={{ fontSize: 14, color: Colors.textPrimary, lineHeight: 21 }}
        >
          {post.caption}
        </Text>
      )}
    </View>
  );
}
