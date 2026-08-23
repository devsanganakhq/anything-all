/**
 * Wraps children with PostHogProvider when EXPO_PUBLIC_POSTHOG_KEY is set.
 * When unset, renders children only so local/dev builds stay quiet.
 */

import React from "react";
import { PostHogProvider } from "posthog-react-native";
import { getPostHog, isPostHogEnabled } from "@/utils/posthog";
import { PostHogScreenTracker } from "@/utils/PostHogScreenTracker";
import { PostHogErrorBoundary } from "@/components/PostHogErrorBoundary";

export function PostHogAppShell({ children }) {
  if (!isPostHogEnabled) {
    return <PostHogErrorBoundary>{children}</PostHogErrorBoundary>;
  }

  const client = getPostHog();
  if (!client) {
    return <PostHogErrorBoundary>{children}</PostHogErrorBoundary>;
  }

  return (
    <PostHogProvider
      client={client}
      autocapture={{
        // expo-router: capture screens manually via PostHogScreenTracker
        captureScreens: false,
        captureTouches: false,
      }}
    >
      <PostHogErrorBoundary>
        <PostHogScreenTracker />
        {children}
      </PostHogErrorBoundary>
    </PostHogProvider>
  );
}
