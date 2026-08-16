/**
 * Course Details — Heathland Links
 *
 * Premium course profile page. Opened from search, map, rankings,
 * passport played/wishlist lists, and feed cards.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Animated,
  Alert,
  Share,
  Linking,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle } from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { Colors, Spacing } from "@/constants/theme";
import {
  HERO_HEIGHT,
  FALLBACK_IMAGES,
  RANKING_ACCENTS,
  RANKING_DEFAULT,
  STATUS_CONFIG,
} from "@/constants/courseConstants";
import { FloatingControls } from "./FloatingControls";
import { StickyHeader } from "./StickyHeader";
import { CourseHero } from "./CourseHero";
import { StatusBanner } from "./StatusBanner";
import { CourseIdentity } from "./CourseIdentity";
import { TabBar } from "./TabBar";
import { OverviewTab } from "./OverviewTab";
import { RankingsTab } from "./RankingsTab";
import { ReviewsTab } from "./ReviewsTab";
import { PhotosTab } from "./PhotosTab";
import { InfoTab } from "./InfoTab";
import { BottomActionBar } from "./BottomActionBar";
import {
  courseDisplayName,
  formatCourseShareLabel,
} from "@/utils/courseDisplayName";

// ─────────────────────────────────────────────────────────────────────────────
export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("OVERVIEW");
  const [wishlisted, setWishlisted] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);

  // Animated scroll value — drives parallax, sticky header, controls opacity
  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Derived animated values ────────────────────────────────────────────
  const heroParallax = scrollY.interpolate({
    inputRange: [-HERO_HEIGHT, 0, HERO_HEIGHT * 1.5],
    outputRange: [HERO_HEIGHT * 0.4, 0, -HERO_HEIGHT * 0.35],
    extrapolate: "clamp",
  });
  const heroOverlayOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT * 0.8],
    outputRange: [0.35, 0.72],
    extrapolate: "clamp",
  });
  const floatingCtrlOpacity = scrollY.interpolate({
    inputRange: [0, HERO_HEIGHT - 110],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [HERO_HEIGHT - 70, HERO_HEIGHT - 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // ── Data fetch ────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const res = await fetch(`/api/courses/${id}`);
      if (!res.ok) throw new Error("Failed to fetch course");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  // Sync user status from server on first load
  React.useEffect(() => {
    if (data?.userStatus) {
      setWishlisted(data.userStatus.wishlisted);
      setAlreadyPlayed(data.userStatus.played);
      setFollowing(data.userStatus.following);
    }
  }, [data]);

  // ── Mutations ─────────────────────────────────────────────────────────
  const wishlistMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/activity/add-wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: id }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (result) => {
      setWishlisted(result.wishlisted ?? !wishlisted);
      queryClient.invalidateQueries({ queryKey: ["course", id] });
      queryClient.invalidateQueries({ queryKey: ["passport-stats"] });
      queryClient.invalidateQueries({ queryKey: ["passport-wishlist"] });
    },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/social/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followeeId: parseInt(id),
          followeeType: "course",
        }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (result) => {
      setFollowing(result.following);
      queryClient.invalidateQueries({ queryKey: ["course", id] });
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!data?.course) return;
    try {
      await Share.share({
        message: `${formatCourseShareLabel(data.course)}. Discover it on Heathland Links.`,
        url: `https://heathlandlinks.com/course/${id}`,
        title: formatCourseShareLabel(data.course),
      });
    } catch {}
  }, [data, id]);

  const handleMap = useCallback(() => {
    if (!data?.course) return;
    const { latitude, longitude } = data.course;
    const q = formatCourseShareLabel(data.course);
    const url = `https://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(q)}`;
    Linking.openURL(url).catch(() => {
      const gUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
      Linking.openURL(gUrl);
    });
  }, [data]);

  const handleMarkPlayed = useCallback(() => {
    if (alreadyPlayed) {
      Alert.alert(
        "Round Recorded",
        "You've already recorded a round here. Head to your Passport to update your review.",
        [{ text: "OK" }],
      );
      return;
    }
    router.push({
      pathname: "/activity/mark-played",
      params: { courseId: id, courseName: formatCourseShareLabel(data?.course) },
    });
  }, [alreadyPlayed, id, data, router]);

  // ── Loading / error states ─────────────────────────────────────────────
  if (isLoading || !data?.course) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <StatusBar style="light" />
        <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
          Loading course…
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.ivory,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <StatusBar style="dark" />
        <AlertTriangle color={Colors.textMuted} size={32} strokeWidth={1.5} />
        <Text
          style={{
            color: Colors.textPrimary,
            fontSize: 16,
            fontWeight: "600",
            marginTop: 16,
            textAlign: "center",
          }}
        >
          Couldn't load course
        </Text>
        <Text
          style={{
            color: Colors.textSecondary,
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
          }}
        >
          Check your connection and try again.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 24 }}
        >
          <Text
            style={{ color: Colors.green, fontWeight: "700", fontSize: 13 }}
          >
            ← Go back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const course = data.course;
  const { title: displayTitle } = courseDisplayName(course);
  const rankings = data.rankings ?? [];
  const reviews = data.reviews ?? [];
  const activity = data.recentActivity ?? [];
  const followerCount = data.followerCount ?? 0;
  const statusConfig = STATUS_CONFIG[course.course_status] || null;
  const hasRankings = rankings.length > 0;

  // ── Hero image — priority logic ─────────────────────────────────────────
  // A. Paid official profile with official_hero_image_url
  // B. Fallback to course_image_url (legacy field)
  // C. null → CourseHero renders the branded placeholder
  const heroImage =
    course.official_profile_status === "paid" && course.official_hero_image_url
      ? course.official_hero_image_url
      : course.course_image_url || null;

  const description =
    course.description ||
    "One of Britain's finest courses — a supreme test of golf across beautifully maintained fairways, with breathtaking natural scenery at every turn.";

  const rating = Number(course.community_rating || 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: Colors.ivory }}>
      <StatusBar style="light" />

      {/* ── Floating controls (fade out as hero scrolls away) ─────────────── */}
      <FloatingControls
        insets={insets}
        floatingCtrlOpacity={floatingCtrlOpacity}
        onBack={() => router.back()}
        onShare={handleShare}
        onWishlist={() => wishlistMutation.mutate()}
        wishlisted={wishlisted}
        alreadyPlayed={alreadyPlayed}
      />

      {/* ── Sticky animated header (course name) ──────────────────────────── */}
      <StickyHeader
        insets={insets}
        stickyHeaderOpacity={stickyHeaderOpacity}
        courseName={displayTitle}
        onBack={() => router.back()}
        onShare={handleShare}
      />

      {/* ── Main scroll ───────────────────────────────────────────────────── */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        stickyHeaderIndices={[2]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 150 }}
      >
        {/* ── [0] Hero ─────────────────────────────────────────────────────── */}
        <CourseHero
          heroImage={heroImage}
          heroParallax={heroParallax}
          heroOverlayOpacity={heroOverlayOpacity}
          courseType={course.course_type}
          hasRankings={hasRankings}
          rankings={rankings}
          RANKING_ACCENTS={RANKING_ACCENTS}
          RANKING_DEFAULT={RANKING_DEFAULT}
          courseName={displayTitle}
          county={course.county}
          country={course.country}
        />

        {/* ── [1] Course identity + stats ───────────────────────────────────── */}
        <View style={{ backgroundColor: Colors.ivory }}>
          <StatusBanner statusConfig={statusConfig} />
          <CourseIdentity
            course={course}
            rating={rating}
            reviews={reviews}
            followerCount={followerCount}
            listCount={rankings.length}
          />
        </View>

        {/* ── [2] Tab bar (STICKY) ─────────────────────────────────────────── */}
        <TabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          hasRankings={hasRankings}
          rankings={rankings}
        />

        {/* ── [3] Tab content ───────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: Spacing.screenH, paddingTop: 22 }}>
          {activeTab === "OVERVIEW" && (
            <OverviewTab
              description={description}
              showFullDesc={showFullDesc}
              setShowFullDesc={setShowFullDesc}
              course={course}
              hasRankings={hasRankings}
              rankings={rankings}
              RANKING_ACCENTS={RANKING_ACCENTS}
              RANKING_DEFAULT={RANKING_DEFAULT}
              activity={activity}
            />
          )}

          {activeTab === "RANKINGS" && (
            <RankingsTab
              hasRankings={hasRankings}
              rankings={rankings}
              RANKING_ACCENTS={RANKING_ACCENTS}
              RANKING_DEFAULT={RANKING_DEFAULT}
            />
          )}

          {activeTab === "REVIEWS" && (
            <ReviewsTab
              reviews={reviews}
              rating={rating}
              alreadyPlayed={alreadyPlayed}
              handleMarkPlayed={handleMarkPlayed}
            />
          )}

          {activeTab === "PHOTOS" && (
            <PhotosTab
              courseId={id}
              alreadyPlayed={alreadyPlayed}
              course={{
                name: displayTitle,
                county: course.county,
                country: course.country,
              }}
            />
          )}

          {activeTab === "INFO" && (
            <InfoTab course={course} handleMap={handleMap} />
          )}
        </View>
      </Animated.ScrollView>

      {/* ── Bottom action bar ────────────────────────────────────────────────── */}
      <BottomActionBar
        insets={insets}
        handleMarkPlayed={handleMarkPlayed}
        alreadyPlayed={alreadyPlayed}
        wishlisted={wishlisted}
        wishlistMutation={wishlistMutation}
        handleShare={handleShare}
        following={following}
        followMutation={followMutation}
        handleMap={handleMap}
        course={course}
      />
    </View>
  );
}
