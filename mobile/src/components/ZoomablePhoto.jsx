import React, { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * Full-screen photo with pinch-zoom (1–4×), double-tap to zoom/reset and
 * drag-to-pan while zoomed. Reports zoom state so a paging parent can stop
 * swiping between photos while the user is panning a zoomed one.
 */
export function ZoomablePhoto({ uri, width, height, onZoomChange }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const notify = (zoomed) => onZoomChange?.(zoomed);

  // Keep the image edge-to-edge: never pan further than the zoomed overflow.
  const clamp = (value, scaleValue, size) => {
    "worklet";
    const max = ((scaleValue - 1) * size) / 2;
    return Math.min(max, Math.max(-max, value));
  };

  const reset = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(notify)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE, Math.max(0.8, savedScale.value * e.scale));
    })
    .onEnd(() => {
      if (scale.value <= 1.02) {
        reset();
        return;
      }
      savedScale.value = scale.value;
      tx.value = clamp(tx.value, scale.value, width);
      ty.value = clamp(ty.value, scale.value, height);
      savedTx.value = tx.value;
      savedTy.value = ty.value;
      runOnJS(notify)(true);
    });

  // Panning only engages once zoomed, so an unzoomed swipe still pages.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      tx.value = clamp(savedTx.value + e.translationX, scale.value, width);
      ty.value = clamp(savedTy.value + e.translationY, scale.value, height);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(notify)(true);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={{ width, height, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
        <Animated.View style={[{ width, height }, style]}>
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="contain"
            accessibilityLabel="Photo. Pinch or double-tap to zoom."
            onLoadStart={() => {
              setLoading(true);
              setFailed(false);
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          />
        </Animated.View>
        {loading && (
          <ActivityIndicator accessibilityLabel="Loading image" color="#fff" style={{ position: "absolute" }} />
        )}
        {failed && (
          <Text style={{ color: "#fff", position: "absolute", backgroundColor: "#202020", padding: 12 }}>
            Image unavailable
          </Text>
        )}
      </View>
    </GestureDetector>
  );
}
