import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
} from "react-native";
import { Colors, Radius, Shadow } from "@/constants/theme";
import { REACTION_OPTIONS } from "./constants";

export function ReactionPicker({ postId, onReact, onClose, reactionAnim }) {
  if (!postId) return null;

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <TouchableWithoutFeedback>
          <Animated.View
            style={{
              backgroundColor: Colors.white,
              borderRadius: Radius.xl,
              padding: 12,
              flexDirection: "row",
              gap: 6,
              ...Shadow.float,
              transform: [{ scale: reactionAnim }],
            }}
          >
            {REACTION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                onPress={() => onReact(postId, opt.type)}
                style={{
                  padding: 12,
                  alignItems: "center",
                  borderRadius: Radius.md,
                }}
              >
                <Text style={{ fontSize: 32 }}>{opt.emoji}</Text>
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: Colors.textSecondary,
                    marginTop: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  {opt.label.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
}
