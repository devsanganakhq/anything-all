import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Users,
  MessageCircle,
  Plus,
  ChevronRight,
} from "lucide-react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Colors, Spacing, Radius, Shadow } from "@/constants/theme";
import { UserAvatar } from "@/components/UserAvatar";

const GROUPS = [
  {
    id: 1,
    name: "Scottish Links Golf",
    members: 847,
    active: 24,
    cover:
      "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=600&auto=format&fit=crop",
    joined: true,
  },
  {
    id: 2,
    name: "Heathland Enthusiasts",
    members: 532,
    active: 18,
    cover:
      "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=600&auto=format&fit=crop",
    joined: true,
  },
  {
    id: 3,
    name: "Top 100 Chasers",
    members: 1203,
    active: 61,
    cover:
      "https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=600&auto=format&fit=crop",
    joined: false,
  },
  {
    id: 4,
    name: "Ireland Golf Explorers",
    members: 418,
    active: 11,
    cover:
      "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=600&auto=format&fit=crop",
    joined: false,
  },
];

const FRIENDS = [
  {
    id: 1,
    name: "Clare Montgomery",
    location: "Edinburgh",
    courses: 183,
    avatar: "https://i.pravatar.cc/150?u=10",
  },
  {
    id: 2,
    name: "Oliver Smith",
    location: "St Andrews",
    courses: 142,
    avatar: "https://i.pravatar.cc/150?u=11",
  },
  {
    id: 3,
    name: "Andrew Murray",
    location: "Belfast",
    courses: 97,
    avatar: "https://i.pravatar.cc/150?u=12",
  },
  {
    id: 4,
    name: "Sarah Wilson",
    location: "Dublin",
    courses: 76,
    avatar: "https://i.pravatar.cc/150?u=13",
  },
];

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("groups");

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
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              color: Colors.textPrimary,
              fontWeight: "300",
              fontStyle: "italic",
            }}
          >
            Community
          </Text>
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.greenLight,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Search color={Colors.green} size={18} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* Tab Pills */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TabPill
            title="GROUPS"
            active={activeTab === "groups"}
            onPress={() => setActiveTab("groups")}
          />
          <TabPill
            title="FRIENDS"
            active={activeTab === "friends"}
            onPress={() => setActiveTab("friends")}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: Spacing.screenH,
          paddingTop: 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "groups" ? (
          <>
            {/* Your Groups */}
            <SectionHeader title="YOUR GROUPS" />
            {GROUPS.filter((g) => g.joined).map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}

            {/* Discover Groups */}
            <SectionHeader title="DISCOVER GROUPS" style={{ marginTop: 28 }} />
            {GROUPS.filter((g) => !g.joined).map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </>
        ) : (
          <>
            {/* Friends list */}
            <SectionHeader title="YOUR FRIENDS" />
            {FRIENDS.map((friend) => (
              <FriendCard key={friend.id} friend={friend} />
            ))}

            {/* Discover Golfers CTA */}
            <TouchableOpacity
              style={{
                marginTop: 24,
                padding: 20,
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                borderWidth: 1,
                borderColor: Colors.border,
                alignItems: "center",
                ...Shadow.card,
              }}
            >
              <Users color={Colors.green} size={28} strokeWidth={1.5} />
              <Text
                style={{
                  marginTop: 10,
                  fontSize: 14,
                  fontWeight: "700",
                  color: Colors.green,
                }}
              >
                DISCOVER GOLFERS
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: Colors.textSecondary,
                  textAlign: "center",
                }}
              >
                Find golfers who share your passion for links, heathland and
                hidden gems.
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function TabPill({ title, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: Radius.pill,
        backgroundColor: active ? Colors.green : "transparent",
        borderWidth: 1,
        borderColor: active ? Colors.green : Colors.border,
      }}
    >
      <Text
        style={{
          fontSize: 10,
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

function SectionHeader({ title, style }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 1.5,
        color: Colors.textSecondary,
        marginBottom: 12,
        ...style,
      }}
    >
      {title}
    </Text>
  );
}

function GroupCard({ group }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        marginBottom: 12,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
    >
      <Image
        source={{ uri: group.cover }}
        style={{ width: "100%", height: 100 }}
        contentFit="cover"
      />
      <View style={{ padding: 14, flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: Colors.textPrimary,
            }}
          >
            {group.name}
          </Text>
          <Text
            style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2 }}
          >
            {group.members.toLocaleString()} Members · {group.active} Active
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: Radius.pill,
            backgroundColor: group.joined ? Colors.greenLight : Colors.green,
            borderWidth: group.joined ? 1 : 0,
            borderColor: Colors.greenBorder,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 0.8,
              color: group.joined ? Colors.green : Colors.ivory,
            }}
          >
            {group.joined ? "JOINED" : "JOIN"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FriendCard({ friend }) {
  return (
    <TouchableOpacity
      style={{
        backgroundColor: Colors.white,
        borderRadius: Radius.lg,
        marginBottom: 10,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.border,
        ...Shadow.card,
      }}
    >
      <UserAvatar uri={friend.avatar} name={friend.name} size={46} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text
          style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary }}
        >
          {friend.name}
        </Text>
        <Text
          style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 1 }}
        >
          {friend.location} · {friend.courses} courses
        </Text>
      </View>
      <MessageCircle color={Colors.textSecondary} size={18} strokeWidth={1.8} />
    </TouchableOpacity>
  );
}
