import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";

export function EmptyState({ filter, router }) {
  if (filter === "clubs") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          paddingTop: 64,
          paddingHorizontal: 32,
        }}
      >
        <Text style={{ fontSize: 52, marginBottom: 18 }}>🏌️</Text>
        <Text
          style={{
            fontSize: 22,
            fontWeight: "300",
            fontStyle: "italic",
            color: Colors.textPrimary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          Clubs are coming soon
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: Colors.textSecondary,
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 30,
          }}
        >
          Club updates will appear here soon. In the meantime, explore other
          courses to keep your feed growing.
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/explore")}
          style={{
            backgroundColor: Colors.green,
            paddingHorizontal: 30,
            paddingVertical: 14,
            borderRadius: Radius.pill,
          }}
        >
          <Text
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.5,
              color: Colors.ivory,
            }}
          >
            EXPLORE OTHER COURSES
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const msgs = {
    friends:
      "Add friends to see their rounds, reviews and activity here.",
    communities:
      "Join a community to see shared trips, discussions and meet-up plans.",
    achievements:
      "Your network hasn't unlocked anything recently. Play more golf!",
    all: "Mark a course as played or follow golfers to start your feed.",
  };
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingTop: 64,
        paddingHorizontal: 32,
      }}
    >
      <Text style={{ fontSize: 52, marginBottom: 18 }}>⛳</Text>
      <Text
        style={{
          fontSize: 22,
          fontWeight: "300",
          fontStyle: "italic",
          color: Colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Your feed is quiet
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: Colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          marginBottom: 30,
        }}
      >
        {msgs[filter] || msgs.all}
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/explore")}
        style={{
          backgroundColor: Colors.green,
          paddingHorizontal: 30,
          paddingVertical: 14,
          borderRadius: Radius.pill,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: Colors.ivory,
          }}
        >
          EXPLORE COURSES
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/explore")}
        style={{
          paddingHorizontal: 30,
          paddingVertical: 12,
          borderRadius: Radius.pill,
          borderWidth: 1.5,
          borderColor: Colors.border,
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: Colors.textSecondary,
          }}
        >
          MARK A COURSE PLAYED
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/communities")}
        style={{
          paddingHorizontal: 30,
          paddingVertical: 12,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.5,
            color: Colors.textMuted,
          }}
        >
          FIND COMMUNITIES
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonBone({ style, opacity }) {
  return (
    <Animated.View
      style={[
        {
          backgroundColor: Colors.border,
          borderRadius: Radius.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Single feed card placeholder — matches FeedCard layout */
export function FeedCardSkeleton({ variant = "course" }) {
  const opacity = useSkeletonPulse();
  const showPhoto = variant === "photo" || variant === "course";
  const showCourseBlock = variant === "course" || variant === "wishlist";

  return (
    <View
      style={{
        backgroundColor: Colors.white,
        marginBottom: 10,
        ...Shadow.card,
        overflow: "hidden",
      }}
    >
      {/* Header — avatar + name + badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingTop: 14,
          paddingBottom: 8,
        }}
      >
        <SkeletonBone
          opacity={opacity}
          style={{ width: 46, height: 46, borderRadius: 23 }}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <SkeletonBone
            opacity={opacity}
            style={{ width: "48%", height: 14, marginBottom: 8 }}
          />
          <SkeletonBone opacity={opacity} style={{ width: "36%", height: 10 }} />
        </View>
        <SkeletonBone
          opacity={opacity}
          style={{ width: 64, height: 22, borderRadius: Radius.pill }}
        />
      </View>

      {/* Activity headline */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <SkeletonBone
          opacity={opacity}
          style={{ width: "78%", height: 13, marginBottom: 8 }}
        />
        <SkeletonBone opacity={opacity} style={{ width: "55%", height: 13 }} />
      </View>

      {/* Course / content block */}
      {showCourseBlock && (
        <View
          style={{
            marginHorizontal: 14,
            marginBottom: 12,
            padding: 12,
            borderRadius: Radius.md,
            backgroundColor: Colors.ivory,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          }}
        >
          <SkeletonBone
            opacity={opacity}
            style={{ width: 56, height: 56, borderRadius: Radius.sm }}
          />
          <View style={{ flex: 1 }}>
            <SkeletonBone
              opacity={opacity}
              style={{ width: "70%", height: 13, marginBottom: 8 }}
            />
            <SkeletonBone
              opacity={opacity}
              style={{ width: "45%", height: 11 }}
            />
          </View>
        </View>
      )}

      {variant === "achievement" && (
        <View
          style={{
            marginHorizontal: 14,
            marginBottom: 12,
            padding: 16,
            borderRadius: Radius.md,
            backgroundColor: Colors.ivory,
            alignItems: "center",
          }}
        >
          <SkeletonBone
            opacity={opacity}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              marginBottom: 12,
            }}
          />
          <SkeletonBone
            opacity={opacity}
            style={{ width: "50%", height: 14, marginBottom: 8 }}
          />
          <SkeletonBone opacity={opacity} style={{ width: "70%", height: 11 }} />
        </View>
      )}

      {/* Photo */}
      {showPhoto && (
        <SkeletonBone
          opacity={opacity}
          style={{
            width: "100%",
            height: 200,
            borderRadius: 0,
            marginBottom: 4,
          }}
        />
      )}

      {/* Reaction bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 20,
        }}
      >
        <SkeletonBone opacity={opacity} style={{ width: 56, height: 14 }} />
        <SkeletonBone opacity={opacity} style={{ width: 56, height: 14 }} />
        <SkeletonBone opacity={opacity} style={{ width: 40, height: 14 }} />
      </View>
    </View>
  );
}

export function LoadingState() {
  const variants = ["course", "photo", "achievement", "course", "wishlist"];
  return (
    <View style={{ paddingBottom: 24 }}>
      {variants.map((variant, i) => (
        <FeedCardSkeleton key={`feed-skel-${i}`} variant={variant} />
      ))}
    </View>
  );
}

export function ErrorState({ onRetry }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingTop: 64,
        paddingHorizontal: 32,
      }}
    >
      <Text style={{ fontSize: 36, marginBottom: 14 }}>🏌️</Text>
      <Text
        style={{
          fontSize: 17,
          fontWeight: "700",
          color: Colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Couldn't load your feed
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: Colors.textSecondary,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Check your connection and try again.
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: Colors.green,
          paddingHorizontal: 28,
          paddingVertical: 13,
          borderRadius: Radius.pill,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.5,
            color: Colors.ivory,
          }}
        >
          TRY AGAIN
        </Text>
      </TouchableOpacity>
    </View>
  );
}
