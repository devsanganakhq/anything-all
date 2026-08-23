/**
 * App-level error boundary with a simple Heathland fallback.
 * Uses PostHog's boundary when available so exceptions are reported automatically.
 * Uncaught JS errors / unhandled rejections are autocaptured via
 * posthog.js errorTracking.autocapture (installed on client init).
 */

import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { PostHogErrorBoundary as SdkErrorBoundary } from "posthog-react-native";
import { Colors, Radius } from "@/constants/theme";
import { captureException, isPostHogEnabled } from "@/utils/posthog";

function Fallback({ error, resetError }) {
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
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: Colors.textPrimary,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Something went wrong
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: Colors.textSecondary,
          textAlign: "center",
          lineHeight: 20,
          marginBottom: 24,
        }}
      >
        An unexpected error occurred. You can try again, or restart the app if
        the problem continues.
      </Text>
      {typeof resetError === "function" && (
        <TouchableOpacity
          onPress={resetError}
          style={{
            backgroundColor: Colors.green,
            borderRadius: Radius.md,
            paddingVertical: 14,
            paddingHorizontal: 28,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: "700",
              letterSpacing: 1,
              color: Colors.ivory,
            }}
          >
            TRY AGAIN
          </Text>
        </TouchableOpacity>
      )}
      {__DEV__ && error ? (
        <Text
          style={{
            marginTop: 20,
            fontSize: 11,
            color: Colors.textMuted,
            textAlign: "center",
          }}
          numberOfLines={4}
        >
          {String(error?.message || error)}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Local class boundary used when PostHog is not configured (no API key).
 * Still reports via captureException helper (no-op without key).
 */
class LocalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    captureException(error, {
      component_stack: info?.componentStack?.slice?.(0, 2000),
    });
  }

  resetError = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Fallback error={this.state.error} resetError={this.resetError} />
      );
    }
    return this.props.children;
  }
}

export function PostHogErrorBoundary({ children }) {
  const [resetKey, setResetKey] = useState(0);
  const resetError = useCallback(() => {
    setResetKey((k) => k + 1);
  }, []);

  if (!isPostHogEnabled) {
    return <LocalErrorBoundary>{children}</LocalErrorBoundary>;
  }

  return (
    <SdkErrorBoundary
      key={resetKey}
      fallback={({ error }) => (
        <Fallback error={error} resetError={resetError} />
      )}
    >
      {children}
    </SdkErrorBoundary>
  );
}
