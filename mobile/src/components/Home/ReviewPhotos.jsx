import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { Camera, X } from "lucide-react-native";
import { Colors, Radius } from "@/constants/theme";
import { SCREEN_W, THUMB_H } from "@/components/Home/constants";

function PhotoFrame({ uri, onPress, width = "100%" }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width,
        height: THUMB_H,
        backgroundColor: Colors.ivoryDeep,
      }}
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: "100%" }}
        contentFit="contain"
      />
    </TouchableOpacity>
  );
}

/** User photos attached to a review / played-course feed card */
export function ReviewPhotos({ urls = [] }) {
  const photos = (urls || []).filter(Boolean);
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(null);

  if (!photos.length) return null;

  if (photos.length === 1) {
    return (
      <>
        <View style={{ position: "relative", marginBottom: 4 }}>
          <PhotoFrame
            uri={photos[0]}
            onPress={() => setLightbox({ uri: photos[0] })}
          />
        </View>
        <ReviewPhotoLightbox lightbox={lightbox} onClose={() => setLightbox(null)} />
      </>
    );
  }

  return (
    <>
      <View style={{ position: "relative", marginBottom: 4 }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          onMomentumScrollEnd={(e) => {
            setActiveIdx(
              Math.round(e.nativeEvent.contentOffset.x / SCREEN_W),
            );
          }}
        >
          {photos.map((url, i) => (
            <PhotoFrame
              key={`${url}-${i}`}
              uri={url}
              width={SCREEN_W}
              onPress={() => setLightbox({ uri: url, index: i })}
            />
          ))}
        </ScrollView>

        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            backgroundColor: "rgba(0,0,0,0.58)",
            borderRadius: Radius.pill,
            paddingHorizontal: 9,
            paddingVertical: 4,
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
          }}
        >
          <Camera size={11} color="#fff" />
          <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>
            {activeIdx + 1} / {photos.length}
          </Text>
        </View>

        <View
          style={{
            position: "absolute",
            bottom: 10,
            left: 0,
            right: 0,
            flexDirection: "row",
            justifyContent: "center",
            gap: 5,
          }}
        >
          {photos.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIdx ? 14 : 5,
                height: 5,
                borderRadius: 3,
                backgroundColor:
                  i === activeIdx ? "#fff" : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </View>
      </View>
      <ReviewPhotoLightbox lightbox={lightbox} onClose={() => setLightbox(null)} />
    </>
  );
}

function ReviewPhotoLightbox({ lightbox, onClose }) {
  return (
    <Modal
      visible={!!lightbox}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.92)",
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <TouchableOpacity
          onPress={onClose}
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
      </Pressable>
    </Modal>
  );
}
