import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, Check } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { Colors, Spacing, Radius } from "@/constants/theme";

export default function PersonalizeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);

  const golfTypes = [
    "Championship & Tour Venues",
    "Bucket List Courses",
    "Golf Trips & Destinations",
    "Local Club Golf",
  ];
  const interests = [
    "Discovering courses",
    "Tracking courses",
    "Golf trips",
    "Meeting golfers",
    "Finding tee-time deals",
  ];

  const toggle = (item, list, setList) => {
    setList(
      list.includes(item) ? list.filter((i) => i !== item) : [...list, item],
    );
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: Colors.ivory, paddingTop: insets.top }}
    >
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH + 8,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={{ marginTop: 36, marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 2,
              color: Colors.textSecondary,
              marginBottom: 10,
            }}
          >
            STEP 2 OF 3
          </Text>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              marginBottom: 6,
            }}
          >
            Personalise Your Golf
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: Colors.textSecondary,
              lineHeight: 20,
            }}
          >
            A few quick questions to tailor your experience.
          </Text>
        </View>

        {/* Location */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 14,
            }}
          >
            WHERE ARE YOU BASED?
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
              paddingVertical: 12,
            }}
          >
            <MapPin
              color={Colors.textMuted}
              size={16}
              strokeWidth={1.8}
              style={{ marginRight: 10 }}
            />
            <TextInput
              placeholder="Town, city or postcode"
              placeholderTextColor={Colors.textMuted}
              style={{ flex: 1, fontSize: 15, color: Colors.textPrimary }}
              value={location}
              onChangeText={setLocation}
            />
          </View>
        </View>

        {/* Golf Types */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 14,
            }}
          >
            WHAT TYPE OF GOLF DO YOU ENJOY?
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {golfTypes.map((type) => {
              const selected = selectedTypes.includes(type);
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => toggle(type, selectedTypes, setSelectedTypes)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: Radius.pill,
                    borderWidth: 1,
                    borderColor: selected ? Colors.green : Colors.border,
                    backgroundColor: selected ? Colors.green : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: selected ? Colors.ivory : Colors.textSecondary,
                    }}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Interests */}
        <View style={{ marginBottom: 36 }}>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
              marginBottom: 14,
            }}
          >
            WHAT ARE YOU INTERESTED IN?
          </Text>
          <View style={{ gap: 8 }}>
            {interests.map((interest) => {
              const selected = selectedInterests.includes(interest);
              return (
                <TouchableOpacity
                  key={interest}
                  onPress={() =>
                    toggle(interest, selectedInterests, setSelectedInterests)
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderRadius: Radius.md,
                    borderWidth: 1,
                    borderColor: selected ? Colors.greenBorder : Colors.border,
                    backgroundColor: selected
                      ? Colors.greenLight
                      : Colors.white,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      color: Colors.textPrimary,
                      fontWeight: "500",
                    }}
                  >
                    {interest}
                  </Text>
                  {selected && (
                    <Check color={Colors.green} size={16} strokeWidth={2} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: Colors.green,
            paddingVertical: 17,
            borderRadius: 6,
            alignItems: "center",
          }}
          onPress={() => router.push("/auth/intro")}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2,
              color: Colors.ivory,
            }}
          >
            CONTINUE
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
