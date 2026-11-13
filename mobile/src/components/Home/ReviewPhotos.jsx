import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { Camera, X } from "lucide-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { Colors, Radius } from "@/constants/theme";
import { SCREEN_W, THUMB_H } from "@/components/Home/constants";

const SCREEN_H = Dimensions.get("window").height;

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
  const [frameWidth, setFrameWidth] = useState(SCREEN_W);
  const [lightbox, setLightbox] = useState(null);

  if (!photos.length) return null;

  if (photos.length === 1) {
    return (
      <>
        <View onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)} style={{ position: "relative", marginBottom: 4 }}>
          <PhotoFrame
            uri={photos[0]}
            onPress={() => setLightbox({ uri: photos[0] })}
          />
        </View>
        <ReviewPhotoLightbox
          lightbox={lightbox}
          photos={photos}
          onClose={() => setLightbox(null)}
        />
      </>
    );
  }

  return (
    <>
      <View onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)} style={{ position: "relative", marginBottom: 4 }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0 }}
          onMomentumScrollEnd={(e) => {
            setActiveIdx(
              Math.round(e.nativeEvent.contentOffset.x / frameWidth),
            );
          }}
        >
          {photos.map((url, i) => (
            <PhotoFrame
              key={`${url}-${i}`}
              uri={url}
              width={frameWidth}
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
      <ReviewPhotoLightbox
        lightbox={lightbox}
        photos={photos}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}

export function ReviewPhotoLightbox({ lightbox, photos, onClose }) {
  const [activeIdx, setActiveIdx] = useState(lightbox?.index || 0);
  const [zoomed, setZoomed] = useState(false);
  const photoHeight = SCREEN_H * 0.78;

  React.useEffect(() => {
    if (lightbox) {
      setActiveIdx(lightbox.index || 0);
      setZoomed(false);
    }
  }, [lightbox?.index, lightbox]);

  return (
    <Modal
      visible={!!lightbox}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Modals render outside the app root, so gestures need their own root. */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "#000",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            onPress={onClose}
            accessibilityLabel="Close photo"
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          />
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            hitSlop={12}
            style={{ position: "absolute", top: 56, right: 20, zIndex: 2 }}
          >
            <X color="#fff" size={26} strokeWidth={2} />
          </TouchableOpacity>
          {photos.length > 1 ? (
            <ScrollView
              key={lightbox?.index || 0}
              horizontal
              pagingEnabled
              scrollEnabled={!zoomed}
              showsHorizontalScrollIndicator={false}
              contentOffset={{ x: (lightbox?.index || 0) * SCREEN_W, y: 0 }}
              onMomentumScrollEnd={(event) => {
                setActiveIdx(
                  Math.round(event.nativeEvent.contentOffset.x / SCREEN_W),
                );
              }}
              style={{ flexGrow: 0, width: SCREEN_W, height: photoHeight }}
            >
              {photos.map((uri, index) => (
                <ZoomablePhoto
                  key={`${uri}-${index}`}
                  uri={uri}
                  width={SCREEN_W}
                  height={photoHeight}
                  onZoomChange={setZoomed}
                />
              ))}
            </ScrollView>
          ) : lightbox?.uri ? (
            <ZoomablePhoto
              uri={lightbox.uri}
              width={SCREEN_W}
              height={photoHeight}
              onZoomChange={setZoomed}
            />
          ) : null}
          {photos.length > 1 ? (
            <Text
              style={{
                position: "absolute",
                bottom: 48,
                color: "#fff",
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              {activeIdx + 1} / {photos.length}
            </Text>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
