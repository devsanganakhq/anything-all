import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tag, Clock, MapPin, Star, ChevronRight } from "lucide-react-native";
import { Image } from "expo-image";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";

const DEALS = [
  {
    id: 1,
    course: "Brora Golf Club",
    location: "Sutherland, Scotland",
    discount: 50,
    originalPrice: 120,
    dealPrice: 60,
    type: "Links",
    expires: "Today, 4pm",
    isLastMinute: true,
    photo:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=600&auto=format&fit=crop",
    rating: 4.8,
  },
  {
    id: 2,
    course: "Woodhall Spa",
    location: "Lincolnshire, England",
    discount: 35,
    originalPrice: 160,
    dealPrice: 104,
    type: "Heathland",
    expires: "Tomorrow, 12pm",
    isLastMinute: true,
    photo:
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=600&auto=format&fit=crop",
    rating: 4.9,
  },
  {
    id: 3,
    course: "Lahinch Golf Club",
    location: "County Clare, Ireland",
    discount: 25,
    originalPrice: 200,
    dealPrice: 150,
    type: "Links",
    expires: "Sat, 8am",
    isLastMinute: false,
    photo:
      "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=600&auto=format&fit=crop",
    rating: 4.7,
  },
  {
    id: 4,
    course: "Saunton Sands",
    location: "Devon, England",
    discount: 30,
    originalPrice: 110,
    dealPrice: 77,
    type: "Links",
    expires: "Sun, 10am",
    isLastMinute: false,
    photo:
      "https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=600&auto=format&fit=crop",
    rating: 4.6,
  },
];

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("all");

  const lastMinute = DEALS.filter((d) => d.isLastMinute);
  const offPeak = DEALS.filter((d) => !d.isLastMinute);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: Spacing.screenH,
          paddingBottom: 16,
          backgroundColor: Colors.white,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            color: Colors.textPrimary,
            fontWeight: "300",
            fontStyle: "italic",
            marginBottom: 14,
          }}
        >
          Tee-Time Deals
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TabPill
            title="ALL DEALS"
            active={activeTab === "all"}
            onPress={() => setActiveTab("all")}
          />
          <TabPill
            title="NEAR ME"
            active={activeTab === "nearby"}
            onPress={() => setActiveTab("nearby")}
          />
          <TabPill
            title="WISH LIST"
            active={activeTab === "wishlist"}
            onPress={() => setActiveTab("wishlist")}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingTop: 24,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Last Minute */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: Colors.textSecondary,
              }}
            >
              LAST MINUTE DEALS
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              Book within 48 hours
            </Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "600", color: Colors.green }}
            >
              VIEW ALL
            </Text>
            <ChevronRight color={Colors.green} size={14} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {lastMinute.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {/* Off Peak */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 28,
            marginBottom: 14,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1.5,
                color: Colors.textSecondary,
              }}
            >
              OFF-PEAK DEALS
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: Colors.textSecondary,
                marginTop: 2,
              }}
            >
              Save on upcoming tee times
            </Text>
          </View>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "600", color: Colors.green }}
            >
              VIEW ALL
            </Text>
            <ChevronRight color={Colors.green} size={14} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {offPeak.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {/* Coming Soon Banner */}
        <View
          style={{
            marginTop: 28,
            padding: 20,
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            alignItems: "center",
            ...Shadow.card,
          }}
        >
          <Tag color={Colors.green} size={28} strokeWidth={1.5} />
          <Text
            style={{
              marginTop: 10,
              fontSize: 14,
              fontWeight: "700",
              color: Colors.green,
            }}
          >
            MORE DEALS COMING SOON
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 12,
              color: Colors.textSecondary,
              textAlign: "center",
            }}
          >
            Enable Wish List alerts to be notified when deals appear for your
            saved courses.
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 14,
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: Colors.green,
              borderRadius: Radius.pill,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 1,
                color: Colors.ivory,
              }}
            >
              ENABLE ALERTS
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function TabPill({ title, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: Radius.pill,
        backgroundColor: active ? Colors.green : "transparent",
        borderWidth: 1,
        borderColor: active ? Colors.green : Colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: "700",
          letterSpacing: 1,
          color: active ? Colors.ivory : Colors.textSecondary,
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function DealCard({ deal }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        marginBottom: 14,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
    >
      <View style={{ position: "relative" }}>
        <Image
          source={{ uri: deal.photo }}
          style={{ width: "100%", height: 130 }}
          contentFit="cover"
        />
        {/* Discount Badge */}
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            backgroundColor: Colors.green,
            borderRadius: Radius.sm,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text
            style={{ fontSize: 12, fontWeight: "700", color: Colors.ivory }}
          >
            {deal.discount}% OFF
          </Text>
        </View>
        {/* Expiry */}
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "rgba(0,0,0,0.45)",
            borderRadius: Radius.sm,
            paddingHorizontal: 8,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Clock color="#FFFFFF" size={10} />
          <Text style={{ fontSize: 10, color: "#FFFFFF", fontWeight: "600" }}>
            {deal.expires}
          </Text>
        </View>
      </View>

      <View style={{ padding: 14 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              {deal.course}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 3,
              }}
            >
              <MapPin color={Colors.textSecondary} size={11} />
              <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                {deal.location}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text
              style={{
                fontSize: 11,
                color: Colors.textMuted,
                textDecorationLine: "line-through",
              }}
            >
              £{deal.originalPrice}
            </Text>
            <Text
              style={{ fontSize: 18, fontWeight: "700", color: Colors.green }}
            >
              £{deal.dealPrice}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: Radius.sm,
                backgroundColor: Colors.greenLight,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  color: Colors.green,
                }}
              >
                {deal.type.toUpperCase()}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
            >
              <Star color={Colors.gold} size={12} fill={Colors.gold} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: Colors.textPrimary,
                }}
              >
                {deal.rating}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: Colors.green,
              borderRadius: Radius.pill,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "700",
                letterSpacing: 0.8,
                color: Colors.ivory,
              }}
            >
              BOOK NOW
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
