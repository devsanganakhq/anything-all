/**
 * CoursePhotoCarousel — Heathland Links
 *
 * Swipeable image carousel for course detail pages.
 * Features:
 *  • Swipe gesture navigation (react-native-reanimated-carousel)
 *  • Previous / Next buttons
 *  • Pagination dots
 *  • Photographer attribution + caption
 *  • Per-photo Like button with count (optimistic)
 *  • Report option
 *  • Tap → full-screen gallery modal
 *  • Lazy loading via expo-image
 *  • Branded placeholder when photos array is empty
 *  • Graceful fallback on broken URLs
 *
 * Props:
 *   photos          []     — photo objects from /api/courses/[id]/photos
 *   height          number — carousel height (default 320)
 *   courseId        string — for like/report API calls
 *   course          {}     — { name, county, country } for placeholder
 *   onUploadPress   fn?    — shown when user has played the course
 *   showUploadBtn   bool   — whether to show the "Add photos" CTA
 */
import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import Carousel from "react-native-reanimated-carousel";
import {
  Heart,
  X,
  Flag,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Camera,
} from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors, Radius, Shadow, Spacing } from "@/constants/theme";
import { CourseImagePlaceholder } from "./CourseImagePlaceholder";

const { width: SCREEN_W } = Dimensions.get("window");

const REPORT_REASONS = [
  { key: "inappropriate_content", label: "Inappropriate content" },
  { key: "not_this_course", label: "Not this course" },
  { key: "copyright_concern", label: "Copyright concern" },
  { key: "personal_information", label: "Contains personal information" },
  { key: "poor_quality_duplicate", label: "Poor quality or duplicate" },
  { key: "other", label: "Other" },
];

export function CoursePhotoCarousel({
  photos = [],
  height = 320,
  courseId,
  course = {},
  onUploadPress,
  showUploadBtn = false,
}) {
  const qc = useQueryClient();
  const carouselRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [reportModal, setReportModal] = useState(false);
  const [reportPhotoId, setReportPhotoId] = useState(null);

  // Optimistic like state per photo
  const [likeState, setLikeState] = useState({}); // { [photoId]: { liked, count } }
  const pendingLikeIds = useRef(new Set());

  const getLiked = (p) =>
    likeState[p.id] !== undefined ? likeState[p.id].liked : p.user_liked;
  const getLikeCount = (p) =>
    likeState[p.id] !== undefined ? likeState[p.id].count : p.like_count;

  // ── Like mutation ─────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: async (photoId) => {
      const res = await fetch(`/api/course-photos/${photoId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Like failed");
      return res.json();
    },
    onMutate: (photoId) => {
      const photo = photos.find((p) => p.id === photoId);
      if (!photo) return;
      setLikeState((s) => {
        const wasLiked =
          s[photoId] !== undefined ? s[photoId].liked : !!photo.user_liked;
        const prevCount =
          s[photoId] !== undefined
            ? s[photoId].count
            : Number(photo.like_count) || 0;
        return {
          ...s,
          [photoId]: {
            liked: !wasLiked,
            count: Math.max(0, prevCount + (wasLiked ? -1 : 1)),
          },
        };
      });
    },
    onSuccess: (data, photoId) => {
      setLikeState((s) => ({
        ...s,
        [photoId]: { liked: data.liked, count: data.likeCount },
      }));
      // Soft-update cache so a refetch doesn't flash the old liked state
      qc.setQueryData(["course-photos", courseId], (prev) => {
        if (!prev?.photos) return prev;
        return {
          ...prev,
          photos: prev.photos.map((p) =>
            p.id === photoId
              ? { ...p, user_liked: data.liked, like_count: data.likeCount }
              : p,
          ),
        };
      });
    },
    onError: (_, photoId) => {
      setLikeState((s) => {
        const next = { ...s };
        delete next[photoId];
        return next;
      });
    },
    onSettled: (_data, _err, photoId) => {
      pendingLikeIds.current.delete(photoId);
    },
  });

  const handleLike = useCallback(
    (photoId) => {
      if (!photoId || pendingLikeIds.current.has(photoId)) return;
      pendingLikeIds.current.add(photoId);
      likeMutation.mutate(photoId);
    },
    [likeMutation],
  );

  // ── Report mutation ───────────────────────────────────────────────────────
  const reportMutation = useMutation({
    mutationFn: async ({ photoId, reason }) => {
      const res = await fetch(`/api/course-photos/${photoId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Report failed");
      return data;
    },
    onSuccess: () => {
      setReportModal(false);
      Alert.alert("Reported", "Thank you. Our team will review this photo.");
    },
    onError: (err) => Alert.alert("Error", err.message),
  });

  const openReport = useCallback((photoId) => {
    setReportPhotoId(photoId);
    setReportModal(true);
  }, []);

  // Must stay above the empty-state return — otherwise uploading the first
  // photo changes hook order and crashes the screen.
  const renderItem = useCallback(
    ({ item, index }) => (
      <CarouselSlide
        photo={item}
        height={height}
        onTap={() => {
          setGalleryIndex(index);
          setGalleryOpen(true);
        }}
      />
    ),
    [height],
  );

  // ── Empty → placeholder ───────────────────────────────────────────────────
  if (!photos.length) {
    return (
      <View style={{ height }}>
        <CourseImagePlaceholder
          courseName={course.name}
          county={course.county}
          country={course.country}
          height={height}
        />
        {showUploadBtn && onUploadPress && (
          <TouchableOpacity
            onPress={onUploadPress}
            style={styles.uploadOverlayBtn}
          >
            <Camera size={13} color={Colors.ivory} strokeWidth={2} />
            <Text style={styles.uploadOverlayText}>ADD FIRST PHOTO</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const current = photos[activeIndex] ?? photos[0];

  return (
    <View style={{ height, position: "relative" }}>
      {/* ── Carousel ──────────────────────────────────────────────────────── */}
      <Carousel
        ref={carouselRef}
        data={photos}
        renderItem={renderItem}
        width={SCREEN_W}
        height={height}
        onSnapToItem={setActiveIndex}
        mode="parallax"
        modeConfig={{
          parallaxScrollingScale: 0.9,
          parallaxScrollingOffset: 50,
        }}
        loop={photos.length > 1}
      />

      {/* ── Prev / Next ───────────────────────────────────────────────────── */}
      {photos.length > 1 && (
        <>
          <TouchableOpacity
            onPress={() => carouselRef.current?.prev()}
            style={[styles.navBtn, { left: 10 }]}
          >
            <ChevronLeft color="#FFF" size={18} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => carouselRef.current?.next()}
            style={[styles.navBtn, { right: 10 }]}
          >
            <ChevronRight color="#FFF" size={18} strokeWidth={2} />
          </TouchableOpacity>
        </>
      )}

      {/* ── Bottom info bar ───────────────────────────────────────────────── */}
      <View style={styles.infoBar}>
        {/* Attribution + caption */}
        <View style={{ flex: 1, paddingRight: 10 }}>
          {(current.is_pending || current.moderation_status === "pending") && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>PENDING REVIEW</Text>
            </View>
          )}
          {current.attribution && (
            <Text style={styles.attribution} numberOfLines={1}>
              {current.attribution}
              {current.is_official && (
                <Text style={{ color: Colors.gold }}> · Official</Text>
              )}
            </Text>
          )}
          {current.caption ? (
            <Text style={styles.caption} numberOfLines={1}>
              {current.caption}
            </Text>
          ) : null}
        </View>

        {/* Like + Report */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {current.id && (
            <>
              <TouchableOpacity
                onPress={() => openReport(current.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Flag
                  size={13}
                  color="rgba(255,255,255,0.6)"
                  strokeWidth={1.8}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleLike(current.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Heart
                  size={14}
                  color={
                    getLiked(current) ? Colors.gold : "rgba(255,255,255,0.8)"
                  }
                  fill={getLiked(current) ? Colors.gold : "transparent"}
                  strokeWidth={1.8}
                />
                {getLikeCount(current) > 0 && (
                  <Text style={styles.likeCount}>{getLikeCount(current)}</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Full-screen tap hint */}
          <TouchableOpacity
            onPress={() => {
              setGalleryIndex(activeIndex);
              setGalleryOpen(true);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ZoomIn size={14} color="rgba(255,255,255,0.6)" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Pagination dots ───────────────────────────────────────────────── */}
      {photos.length > 1 && (
        <View style={styles.dotsRow}>
          {photos.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      )}

      {/* ── Add photos CTA ───────────────────────────────────────────────── */}
      {showUploadBtn && onUploadPress && (
        <TouchableOpacity
          onPress={onUploadPress}
          style={styles.uploadOverlayBtn}
        >
          <Camera size={12} color={Colors.ivory} strokeWidth={2} />
          <Text style={styles.uploadOverlayText}>ADD PHOTOS</Text>
        </TouchableOpacity>
      )}

      {/* ── Full-screen Gallery Modal ─────────────────────────────────────── */}
      <GalleryModal
        visible={galleryOpen}
        photos={photos}
        initialIndex={galleryIndex}
        onClose={() => setGalleryOpen(false)}
        getLiked={getLiked}
        getLikeCount={getLikeCount}
        onLike={handleLike}
        onReport={openReport}
      />

      {/* ── Report reason picker ──────────────────────────────────────────── */}
      <ReportModal
        visible={reportModal}
        onClose={() => setReportModal(false)}
        onSubmit={(reason) =>
          reportMutation.mutate({ photoId: reportPhotoId, reason })
        }
        loading={reportMutation.isPending}
      />
    </View>
  );
}

// ─── Carousel slide ──────────────────────────────────────────────────────────
function CarouselSlide({ photo, height, onTap }) {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <View
        style={{
          width: SCREEN_W,
          height,
          backgroundColor: "#1B3828",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "rgba(245,241,235,0.4)", fontSize: 12 }}>
          Image unavailable
        </Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onTap}
      style={{ width: SCREEN_W, height }}
    >
      <Image
        source={{ uri: photo.image_url }}
        style={{ width: "100%", height: "100%" }}
        contentFit="cover"
        transition={200}
        onError={() => setImgError(true)}
      />
    </TouchableOpacity>
  );
}

// ─── Full-screen gallery modal ────────────────────────────────────────────────
function GalleryModal({
  visible,
  photos,
  initialIndex,
  onClose,
  getLiked,
  getLikeCount,
  onLike,
  onReport,
}) {
  const [idx, setIdx] = useState(initialIndex);

  React.useEffect(() => {
    if (visible) setIdx(initialIndex);
  }, [visible, initialIndex]);

  // Keep hooks unconditional — derive photo after all hooks
  const photo = photos[idx] ?? null;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {/* Close */}
        <TouchableOpacity
          onPress={onClose}
          style={{
            position: "absolute",
            top: 54,
            right: 20,
            zIndex: 10,
            padding: 8,
          }}
        >
          <X color="#FFF" size={22} strokeWidth={2} />
        </TouchableOpacity>

        {/* Counter */}
        <Text
          style={{
            position: "absolute",
            top: 60,
            left: 20,
            zIndex: 10,
            color: "rgba(255,255,255,0.7)",
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {idx + 1} / {photos.length}
        </Text>

        {/* Image — horizontal pager */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1, flexGrow: 1 }}
          onMomentumScrollEnd={(e) => {
            const newIdx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
            setIdx(newIdx);
          }}
          contentOffset={{ x: idx * SCREEN_W, y: 0 }}
          scrollEventThrottle={16}
        >
          {photos.map((p, i) => (
            <View
              key={p.id ?? i}
              style={{ width: SCREEN_W, flex: 1, justifyContent: "center" }}
            >
              <Image
                source={{ uri: p.image_url }}
                style={{ width: SCREEN_W, height: "100%" }}
                contentFit="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Bottom info */}
        {photo && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingBottom: 48,
              paddingTop: 14,
              backgroundColor: "rgba(0,0,0,0.7)",
            }}
          >
            {photo.attribution && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 11,
                  marginBottom: 4,
                }}
              >
                {photo.attribution}
                {photo.is_official && (
                  <Text style={{ color: Colors.gold }}> · Official</Text>
                )}
              </Text>
            )}
            {photo.caption && (
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 13,
                  fontStyle: "italic",
                  marginBottom: 10,
                }}
              >
                {photo.caption}
              </Text>
            )}
            {photo.id && (
              <View style={{ flexDirection: "row", gap: 20 }}>
                <TouchableOpacity
                  onPress={() => onLike(photo.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Heart
                    size={18}
                    color={getLiked(photo) ? Colors.gold : "#FFF"}
                    fill={getLiked(photo) ? Colors.gold : "transparent"}
                    strokeWidth={1.8}
                  />
                  <Text style={{ color: "#FFF", fontSize: 13 }}>
                    {getLikeCount(photo) || 0}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => onReport(photo.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <Flag
                    size={17}
                    color="rgba(255,255,255,0.6)"
                    strokeWidth={1.8}
                  />
                  <Text
                    style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}
                  >
                    Report
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Report modal ─────────────────────────────────────────────────────────────
function ReportModal({ visible, onClose, onSubmit, loading }) {
  const [selected, setSelected] = useState(null);
  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "flex-end",
        }}
        onPress={onClose}
      >
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: Colors.white,
              borderRadius: Radius.xl,
              overflow: "hidden",
              paddingBottom: 32,
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: Colors.textPrimary,
                }}
              >
                Report photo
              </Text>
              <TouchableOpacity onPress={onClose}>
                <X size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {REPORT_REASONS.map((r) => (
              <TouchableOpacity
                key={r.key}
                onPress={() => setSelected(r.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 1.5,
                    borderColor:
                      selected === r.key ? Colors.green : Colors.border,
                    backgroundColor:
                      selected === r.key ? Colors.green : "transparent",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  {selected === r.key && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: Colors.ivory,
                      }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 14, color: Colors.textPrimary }}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => selected && onSubmit(selected)}
              disabled={!selected || loading}
              style={{
                marginHorizontal: 20,
                marginTop: 8,
                backgroundColor: selected ? Colors.green : Colors.border,
                paddingVertical: 14,
                borderRadius: Radius.md,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1,
                  color: Colors.ivory,
                }}
              >
                {loading ? "SUBMITTING…" : "SUBMIT REPORT"}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Local styles ─────────────────────────────────────────────────────────────
const styles = {
  navBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  infoBar: {
    position: "absolute",
    bottom: 30,
    left: Spacing.screenH,
    right: Spacing.screenH,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  attribution: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.2,
  },
  pendingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(217, 119, 6, 0.92)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginBottom: 5,
  },
  pendingBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#FFF",
  },
  caption: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontStyle: "italic",
    marginTop: 2,
  },
  likeCount: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  dotsRow: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 8,
  },
  uploadOverlayBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(27,56,40,0.75)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  uploadOverlayText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: Colors.ivory,
  },
};

export default CoursePhotoCarousel;
