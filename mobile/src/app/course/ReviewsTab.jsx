import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { Star, CalendarDays, PenLine, X } from "lucide-react-native";
import { Image } from "expo-image";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { SectionLabel, EmptySection } from "./SharedComponents";
import { formatDate } from "./utils";
import { UserAvatar } from "@/components/UserAvatar";
import { PressableUser } from "@/components/PressableUser";

function photosForReview(rev) {
  const raw = rev?.photos;
  if (Array.isArray(raw)) return raw.filter((p) => p?.image_url || p?.thumbnail_url);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((p) => p?.image_url || p?.thumbnail_url)
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function ReviewsTab({
  reviews,
  rating,
  alreadyPlayed,
  handleMarkPlayed,
}) {
  const [lightbox, setLightbox] = useState(null);
  return (
    <>
      {/* Rating summary */}
      {reviews.length > 0 && (
        <View
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: 18,
            marginBottom: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 18,
            ...Shadow.card,
          }}
        >
          <View style={{ alignItems: "center" }}>
            <Text
              style={{
                fontSize: 48,
                fontWeight: "800",
                color: Colors.textPrimary,
                lineHeight: 52,
              }}
            >
              {rating > 0 ? rating.toFixed(1) : "—"}
            </Text>
            <View style={{ flexDirection: "row", gap: 2, marginTop: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  color={Colors.gold}
                  fill={s <= Math.round(rating) ? Colors.gold : "transparent"}
                  strokeWidth={1.5}
                />
              ))}
            </View>
            <Text
              style={{
                fontSize: 11,
                color: Colors.textMuted,
                marginTop: 4,
              }}
            >
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter((r) => r.rating === star).length;
              const pct =
                reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <View
                  key={star}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textMuted,
                      width: 8,
                    }}
                  >
                    {star}
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 6,
                      backgroundColor: Colors.ivoryDeep,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        backgroundColor: Colors.gold,
                        borderRadius: 3,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 10,
                      color: Colors.textMuted,
                      width: 20,
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      <SectionLabel icon={Star} label="MEMBER REVIEWS" />

      {reviews.length > 0 ? (
        <View style={{ gap: 12, marginBottom: 24 }}>
          {reviews.map((rev) => {
            const photos = photosForReview(rev);
            return (
            <View
              key={rev.id}
              style={{
                backgroundColor: Colors.white,
                borderRadius: Radius.lg,
                padding: 15,
                borderWidth: 1,
                borderColor: Colors.border,
                ...Shadow.card,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <PressableUser
                  userId={rev.user_id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                  }}
                >
                  <UserAvatar
                    uri={rev.profile_photo_url}
                    name={`${rev.first_name || ""} ${rev.last_name || ""}`.trim()}
                    size={38}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: Colors.textPrimary,
                      }}
                    >
                      {rev.first_name} {rev.last_name}
                    </Text>
                  <View style={{ flexDirection: "row", gap: 2, marginTop: 2 }}>
                    {[...Array(rev.rating || 0)].map((_, i) => (
                      <Star
                        key={i}
                        size={10}
                        color={Colors.gold}
                        fill={Colors.gold}
                      />
                    ))}
                    </View>
                  </View>
                </PressableUser>
                <Text style={{ fontSize: 10, color: Colors.textMuted }}>
                  {formatDate(rev.created_at)}
                </Text>
              </View>
              {rev.date_played && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 8,
                  }}
                >
                  <CalendarDays
                    size={11}
                    color={Colors.textMuted}
                    strokeWidth={1.8}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: Colors.textSecondary,
                    }}
                  >
                    Played {formatDate(rev.date_played)}
                  </Text>
                </View>
              )}
              {rev.review_text ? (
                <Text
                  style={{
                    fontSize: 13,
                    color: Colors.textSecondary,
                    lineHeight: 20,
                  }}
                >
                  {rev.review_text}
                </Text>
              ) : null}
              {photos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ flexGrow: 0, marginTop: rev.review_text ? 12 : 4 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {photos.map((photo) => {
                    const uri = photo.thumbnail_url || photo.image_url;
                    return (
                      <TouchableOpacity
                        key={photo.id || uri}
                        onPress={() =>
                          setLightbox({
                            uri: photo.image_url || uri,
                            caption: photo.caption,
                          })
                        }
                        activeOpacity={0.85}
                      >
                        <Image
                          source={{ uri }}
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: Radius.sm,
                            backgroundColor: Colors.ivoryDeep,
                          }}
                          contentFit="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : null}
            </View>
            );
          })}
        </View>
      ) : (
        <EmptySection
          icon={Star}
          title="No reviews yet"
          body="Be the first to share your experience of this course."
        />
      )}

      {/* CTA to add own review */}
      {!alreadyPlayed && (
        <TouchableOpacity
          onPress={handleMarkPlayed}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: Colors.green,
            borderRadius: 8,
            paddingVertical: 14,
            marginBottom: 24,
          }}
        >
          <PenLine size={15} color={Colors.ivory} strokeWidth={2} />
          <Text
            style={{
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 1,
              color: Colors.ivory,
            }}
          >
            MARK AS PLAYED & LEAVE A REVIEW
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <Pressable
          onPress={() => setLightbox(null)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => setLightbox(null)}
            style={{ position: "absolute", top: 56, right: 20, zIndex: 2 }}
          >
            <X color="#fff" size={24} strokeWidth={2} />
          </TouchableOpacity>
          {lightbox?.uri ? (
            <Image
              source={{ uri: lightbox.uri }}
              style={{ width: "100%", height: "70%" }}
              contentFit="contain"
            />
          ) : null}
          {lightbox?.caption ? (
            <Text
              style={{
                color: "#fff",
                fontSize: 13,
                marginTop: 16,
                textAlign: "center",
              }}
            >
              {lightbox.caption}
            </Text>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}
