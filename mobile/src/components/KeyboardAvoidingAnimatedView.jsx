import React, { useRef, useEffect } from "react";
import { Platform, Keyboard, KeyboardAvoidingView } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/**
 * Keyboard-aware container.
 * On Android/web we use RN's KeyboardAvoidingView — the animated height
 * path previously collapsed to height:0 before layout (blank white screen).
 * iOS keeps the padding animation via Reanimated shared values only.
 */
const KeyboardAvoidingAnimatedView = (props, ref) => {
  const {
    children,
    behavior = Platform.OS === "ios" ? "padding" : undefined,
    keyboardVerticalOffset = 0,
    style,
    contentContainerStyle,
    enabled = true,
    onLayout,
    ...leftoverProps
  } = props;

  const layoutY = useSharedValue(0);
  const layoutHeight = useSharedValue(0);
  const initialHeight = useSharedValue(0);
  const bottomHeight = useSharedValue(0);

  useEffect(() => {
    if (!enabled || Platform.OS !== "ios") return;

    const onKeyboardShow = (event) => {
      const { duration, endCoordinates } = event;
      const keyboardY = endCoordinates.screenY - keyboardVerticalOffset;
      const height = Math.max(
        layoutY.value + layoutHeight.value - keyboardY,
        0,
      );

      bottomHeight.value = withTiming(height, {
        duration: duration > 10 ? duration : 300,
      });
    };

    const onKeyboardHide = () => {
      bottomHeight.value = withTiming(0, { duration: 300 });
    };

    const showSub = Keyboard.addListener("keyboardWillShow", onKeyboardShow);
    const hideSub = Keyboard.addListener("keyboardWillHide", onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [
    keyboardVerticalOffset,
    enabled,
    bottomHeight,
    layoutY,
    layoutHeight,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    if (behavior === "height") {
      // Never force height:0 before the first real layout measurement
      if (initialHeight.value <= 0) return {};
      return {
        height: initialHeight.value - bottomHeight.value,
        flex: bottomHeight.value > 0 ? 0 : undefined,
      };
    }
    if (behavior === "padding") {
      return {
        paddingBottom: bottomHeight.value,
      };
    }
    return {};
  });

  const positionAnimatedStyle = useAnimatedStyle(() => ({
    bottom: bottomHeight.value,
  }));

  const handleLayout = (event) => {
    const layout = event.nativeEvent.layout;
    layoutY.value = layout.y;
    layoutHeight.value = layout.height;
    if (initialHeight.value <= 0 && layout.height > 0) {
      initialHeight.value = layout.height;
    }
    onLayout?.(event);
  };

  // Android/web: avoid the broken animated-height path
  if (Platform.OS !== "ios") {
    return (
      <KeyboardAvoidingView
        ref={ref}
        behavior={behavior}
        style={style}
        contentContainerStyle={contentContainerStyle}
        keyboardVerticalOffset={keyboardVerticalOffset}
        enabled={enabled}
        onLayout={onLayout}
        {...leftoverProps}
      >
        {children}
      </KeyboardAvoidingView>
    );
  }

  const renderContent = () => {
    if (behavior === "position") {
      return (
        <Animated.View style={[contentContainerStyle, positionAnimatedStyle]}>
          {children}
        </Animated.View>
      );
    }
    return children;
  };

  return (
    <Animated.View
      ref={ref}
      style={[style, animatedStyle]}
      onLayout={handleLayout}
      {...leftoverProps}
    >
      {renderContent()}
    </Animated.View>
  );
};

KeyboardAvoidingAnimatedView.displayName = "KeyboardAvoidingAnimatedView";

export default KeyboardAvoidingAnimatedView;
