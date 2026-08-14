import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Heart,
  MessageCircle,
  MapPin,
  Award,
  Star,
  Camera,
  Users,
  ChevronRight,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("friends");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["activity-feed", activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/activity/feed?type=${activeTab}`);
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
  });

  const activities = data?.activities || [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F2EA" }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 20,
          paddingBottom: 20,
          backgroundColor: "#F5F2EA",
        }}
      >
        <Text style={{ fontSize: 32, color: "#1A3C34", fontWeight: "300" }}>
          Activity
        </Text>
        <Text style={{ fontSize: 16, color: "#8E918B", marginTop: 5 }}>
          See what your friends are up to.
        </Text>
      </View>

      {/* Tab Selector */}
      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: 20,
          gap: 10,
          marginBottom: 20,
        }}
      >
        <TabButton
          title="Friends"
          active={activeTab === "friends"}
          onPress={() => setActiveTab("friends")}
        />
        <TabButton
          title="Everyone"
          active={activeTab === "everyone"}
          onPress={() => setActiveTab("everyone")}
        />
        <TabButton
          title="Nearby"
          active={activeTab === "nearby"}
          onPress={() => setActiveTab("nearby")}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 100,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {activities.length === 0 && !isLoading && (
          <View
            style={{
              padding: 40,
              alignItems: "center",
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#E5E7EB",
            }}
          >
            <Users color="#8E918B" size={48} />
            <Text
              style={{
                fontSize: 18,
                color: "#1A3C34",
                fontWeight: "700",
                marginTop: 20,
                textAlign: "center",
              }}
            >
              No Activity Yet
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: "#8E918B",
                marginTop: 10,
                textAlign: "center",
              }}
            >
              {activeTab === "friends"
                ? "Add friends to see their golf activity here."
                : "Mark some courses as played or join communities to see activity."}
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 20,
                paddingHorizontal: 25,
                paddingVertical: 12,
                backgroundColor: "#1A3C34",
                borderRadius: 25,
              }}
              onPress={() => router.push("/(tabs)/discover")}
            >
              <Text style={{ color: "#F5F2EA", fontWeight: "700" }}>
                Explore Courses
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} />
        ))}
      </ScrollView>
    </View>
  );
}

function TabButton({ title, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: active ? "#1A3C34" : "#FFFFFF",
        borderWidth: 1,
        borderColor: active ? "#1A3C34" : "#E5E7EB",
      }}
    >
      <Text
        style={{
          color: active ? "#F5F2EA" : "#1A3C34",
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        {title.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

function ActivityCard({ activity }) {
  const [liked, setLiked] = useState(activity.user_has_liked);
  const [likeCount, setLikeCount] = useState(activity.like_count || 0);

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(newLiked ? likeCount + 1 : likeCount - 1);

    try {
      await fetch("/api/activity/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: activity.id }),
      });
    } catch (error) {
      setLiked(!newLiked);
      setLikeCount(newLiked ? likeCount - 1 : likeCount + 1);
    }
  };

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case "played_course":
        return <MapPin color="#1A3C34" size={20} />;
      case "achievement_unlocked":
        return <Award color="#1A3C34" size={20} />;
      case "review_posted":
        return <Star color="#1A3C34" size={20} />;
      case "photo_uploaded":
        return <Camera color="#1A3C34" size={20} />;
      default:
        return <MapPin color="#1A3C34" size={20} />;
    }
  };

  const getActivityText = () => {
    switch (activity.activity_type) {
      case "played_course":
        return `played ${activity.course_name}`;
      case "achievement_unlocked":
        return `unlocked ${activity.achievement_name}`;
      case "review_posted":
        return `reviewed ${activity.course_name}`;
      case "photo_uploaded":
        return `shared photos from ${activity.course_name}`;
      default:
        return "had golf activity";
    }
  };

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#E5E7EB",
      }}
    >
      {/* User Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 15,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            overflow: "hidden",
            backgroundColor: "#E5E7EB",
          }}
        >
          <Image
            source={{
              uri: activity.user_photo || "https://via.placeholder.com/100",
            }}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#1A3C34" }}>
            {activity.user_name}
          </Text>
          <Text style={{ fontSize: 12, color: "#8E918B", marginTop: 2 }}>
            {getActivityText()} • {activity.time_ago}
          </Text>
        </View>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(26, 60, 52, 0.05)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {getActivityIcon()}
        </View>
      </View>

      {/* Activity Content */}
      {activity.photo_url && (
        <View
          style={{
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: 15,
          }}
        >
          <Image
            source={{ uri: activity.photo_url }}
            style={{ width: "100%", height: 240 }}
            contentFit="cover"
          />
        </View>
      )}

      {activity.review_text && (
        <Text
          style={{
            fontSize: 14,
            color: "#1A3C34",
            lineHeight: 20,
            marginBottom: 15,
          }}
        >
          {activity.review_text}
        </Text>
      )}

      {activity.rating && (
        <View style={{ flexDirection: "row", gap: 4, marginBottom: 15 }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              size={16}
              color="#1A3C34"
              fill={star <= activity.rating ? "#1A3C34" : "transparent"}
            />
          ))}
        </View>
      )}

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderTopColor: "#F3F4F6",
          paddingTop: 15,
          gap: 20,
        }}
      >
        <TouchableOpacity
          onPress={handleLike}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <Heart
            size={20}
            color={liked ? "#EF4444" : "#8E918B"}
            fill={liked ? "#EF4444" : "transparent"}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: liked ? "#EF4444" : "#8E918B",
            }}
          >
            {likeCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <MessageCircle size={20} color="#8E918B" />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#8E918B" }}>
            {activity.comment_count || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
