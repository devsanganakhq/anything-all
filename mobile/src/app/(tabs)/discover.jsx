import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Search, ChevronRight, Star, MapPin } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";

const COURSE_IMAGES = [
  "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=600&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1590732503206-89686008b49e?q=80&w=600&auto=format&fit=crop",
];

const DESTINATIONS = [
  {
    name: "Scotland",
    count: 550,
    image:
      "https://images.unsplash.com/photo-1590732503206-89686008b49e?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Ireland",
    count: 420,
    image:
      "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "England",
    count: 1800,
    image:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "Wales",
    count: 180,
    image:
      "https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=800&auto=format&fit=crop",
  },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data: courses = [] } = useQuery({
    queryKey: ["discover-courses"],
    queryFn: async () => {
      const response = await fetch("/api/courses/list");
      if (!response.ok) throw new Error("Failed to fetch courses");
      return response.json();
    },
  });

  const linksCourses = courses.filter((c) => c.course_type === "Links");
  const heathlandCourses = courses.filter((c) => c.course_type === "Heathland");

  const renderCourseCard = ({ item, index }) => (
    <TouchableOpacity
      style={{ width: 240, marginRight: 14 }}
      onPress={() => router.push(`/course/${item.id}`)}
    >
      <View
        style={{
          height: 160,
          borderRadius: Radius.lg,
          overflow: "hidden",
          backgroundColor: Colors.ivoryDeep,
        }}
      >
        <Image
          source={{ uri: COURSE_IMAGES[index % COURSE_IMAGES.length] }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
        />
      </View>
      <View style={{ paddingTop: 10, paddingHorizontal: 2 }}>
        <Text
          style={{ fontSize: 14, fontWeight: "700", color: Colors.textPrimary }}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <MapPin color={Colors.textMuted} size={11} strokeWidth={1.8} />
            <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
              {item.city}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Star color={Colors.gold} size={11} fill={Colors.gold} />
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: Colors.textPrimary,
              }}
            >
              {Number(item.community_rating || 4.8).toFixed(1)}
            </Text>
          </View>
        </View>
        <View style={{ marginTop: 6 }}>
          <View
            style={{
              backgroundColor: Colors.greenLight,
              borderRadius: Radius.sm,
              paddingHorizontal: 7,
              paddingVertical: 3,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                fontSize: 8,
                fontWeight: "700",
                letterSpacing: 0.8,
                color: Colors.green,
              }}
            >
              {item.course_type?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 100,
        }}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 24,
              color: Colors.textPrimary,
              fontWeight: "300",
              fontStyle: "italic",
              marginBottom: 4,
            }}
          >
            Discover
          </Text>
          <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
            Explore the finest courses in Britain & Ireland.
          </Text>
        </View>

        {/* Search */}
        <TouchableOpacity
          style={{
            marginHorizontal: Spacing.screenH,
            backgroundColor: Colors.white,
            height: 46,
            borderRadius: Radius.md,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: Colors.border,
            ...Shadow.card,
          }}
          onPress={() => router.push("/(tabs)/map")}
        >
          <Search color={Colors.textMuted} size={16} strokeWidth={1.8} />
          <Text
            style={{ color: Colors.textMuted, marginLeft: 10, fontSize: 14 }}
          >
            Search courses, regions...
          </Text>
        </TouchableOpacity>

        {/* Links Golf */}
        <Section
          title="Links Golf"
          subtitle="Coastal classics of Britain & Ireland"
        >
          <FlatList
            data={linksCourses.length > 0 ? linksCourses : courses.slice(0, 5)}
            renderItem={renderCourseCard}
            keyExtractor={(item) => `links-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: Spacing.screenH }}
          />
        </Section>

        {/* Heathland */}
        <Section
          title="Heathland Classics"
          subtitle="Inland masterpieces of the British Isles"
        >
          <FlatList
            data={
              heathlandCourses.length > 0
                ? heathlandCourses
                : courses.slice(0, 5)
            }
            renderItem={renderCourseCard}
            keyExtractor={(item) => `heath-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: Spacing.screenH }}
          />
        </Section>

        {/* Hidden Gems */}
        <Section title="Hidden Gems" subtitle="Discover lesser-known treasures">
          <FlatList
            data={courses.slice(2, 7)}
            renderItem={renderCourseCard}
            keyExtractor={(item) => `gem-${item.id}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: Spacing.screenH }}
          />
        </Section>

        {/* Destinations */}
        <View style={{ paddingHorizontal: Spacing.screenH, marginTop: 8 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-end",
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                  color: Colors.textSecondary,
                }}
              >
                GOLF DESTINATIONS
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "300",
                  fontStyle: "italic",
                  color: Colors.textPrimary,
                  marginTop: 2,
                }}
              >
                Explore by country
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {DESTINATIONS.map((dest) => (
              <TouchableOpacity
                key={dest.name}
                style={{
                  width: "47%",
                  height: 90,
                  borderRadius: Radius.lg,
                  overflow: "hidden",
                  backgroundColor: Colors.green,
                }}
              >
                <Image
                  source={{ uri: dest.image }}
                  style={{ width: "100%", height: "100%", opacity: 0.55 }}
                  contentFit="cover"
                />
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    justifyContent: "flex-end",
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: Colors.ivory,
                    }}
                  >
                    {dest.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 10,
                      color: "rgba(245,241,235,0.7)",
                      fontWeight: "600",
                    }}
                  >
                    {dest.count.toLocaleString()} courses
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <View
        style={{
          paddingHorizontal: Spacing.screenH,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 14,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 9,
              fontWeight: "700",
              letterSpacing: 1.5,
              color: Colors.textSecondary,
            }}
          >
            {title.toUpperCase()}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "300",
              fontStyle: "italic",
              color: Colors.textPrimary,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
        >
          <Text
            style={{ fontSize: 11, fontWeight: "600", color: Colors.green }}
          >
            View all
          </Text>
          <ChevronRight color={Colors.green} size={13} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}
