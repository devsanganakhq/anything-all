import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { useAuthStore } from "./store";
import { resetAppCache } from "@/utils/queryClient";
import { identifyUser } from "@/utils/posthog";

// Native uses expo-web-success so the page can postMessage JWT back into RN
// (WKWebView cookies are not reliably shared with the JS fetch cookie jar).
const nativeCallbackPath = "/api/auth/expo-web-success";
const tokenCallbackPath = "/api/auth/token";

/**
 * This renders a WebView for authentication and handles both web and native platforms.
 */
export const AuthWebView = ({ mode, proxyURL, baseURL, onClose }) => {
  const [currentURI, setURI] = useState(
    `${baseURL}/account/${mode}?callbackUrl=${encodeURIComponent(nativeCallbackPath)}`,
  );
  const { auth, setAuth, isReady } = useAuthStore();
  const isAuthenticated = isReady ? !!auth : null;
  const iframeRef = useRef(null);

  const applyAuthSuccess = (data) => {
    if (!data?.jwt) {
      console.error("[AuthWebView] AUTH_SUCCESS missing jwt");
      return;
    }
    // Persist the new session first, then drop cached queries so refetches
    // attach the new Bearer token instead of the previous user's.
    setAuth({ jwt: data.jwt, user: data.user });
    if (data.user) {
      identifyUser(data.user);
    }
    resetAppCache();
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    // Modal closes via visible={!auth}; replace welcome with home tabs.
    if (isAuthenticated) {
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }
    setURI(
      `${baseURL}/account/${mode}?callbackUrl=${encodeURIComponent(nativeCallbackPath)}`,
    );
  }, [mode, baseURL, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose?.();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.addEventListener) {
      return;
    }
    const handleMessage = (event) => {
      if (event.origin !== process.env.EXPO_PUBLIC_PROXY_BASE_URL) {
        return;
      }
      if (event.data.type === "AUTH_SUCCESS") {
        applyAuthSuccess(event.data);
      } else if (event.data.type === "AUTH_ERROR") {
        console.error("Auth error:", event.data.error);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [setAuth]);

  if (Platform.OS === "web") {
    const handleIframeError = () => {
      console.error("Failed to load auth iframe");
    };

    return (
      <iframe
        ref={iframeRef}
        title="Authentication"
        src={`${proxyURL}/account/${mode}?callbackUrl=/api/auth/expo-web-success`}
        style={{ width: "100%", height: "100%", border: "none" }}
        onError={handleIframeError}
      />
    );
  }

  return (
    <WebView
      incognito
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      source={{
        uri: currentURI,
      }}
      headers={{
        "x-createxyz-project-group-id":
          process.env.EXPO_PUBLIC_PROJECT_GROUP_ID,
        host: process.env.EXPO_PUBLIC_HOST,
        "x-forwarded-host": process.env.EXPO_PUBLIC_HOST,
        "x-createxyz-host": process.env.EXPO_PUBLIC_HOST,
      }}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data?.type === "AUTH_SUCCESS") {
            applyAuthSuccess(data);
          } else if (data?.type === "AUTH_ERROR") {
            console.error("[AuthWebView] Auth error:", data.error);
          }
        } catch (err) {
          console.error("[AuthWebView] onMessage parse error:", err);
        }
      }}
      onShouldStartLoadWithRequest={(request) => {
        const url = request.url || "";

        // Fallback: if redirected to JSON token endpoint, fetch via WebView cookies
        // by letting the page load is unreliable; prefer expo-web-success postMessage.
        if (
          url === `${baseURL}${tokenCallbackPath}` ||
          url.startsWith(`${baseURL}${tokenCallbackPath}?`)
        ) {
          fetch(url, { credentials: "include" })
            .then(async (response) => {
              if (!response.ok) {
                console.error(
                  "[AuthWebView] Token fetch failed:",
                  response.status,
                );
                return;
              }
              const data = await response.json();
              applyAuthSuccess(data);
            })
            .catch((err) => {
              console.error("[AuthWebView] Token fetch error:", err);
            });
          return false;
        }

        // Allow expo-web-success page to load so its script can postMessage
        if (
          url === `${baseURL}${nativeCallbackPath}` ||
          url.startsWith(`${baseURL}${nativeCallbackPath}?`)
        ) {
          return true;
        }

        if (url.includes("/account/forgot-password")) {
          return false;
        }

        if (url === currentURI) return true;

        const hasParams = url.includes("?");
        const separator = hasParams ? "&" : "?";
        const newURL = url.replaceAll(proxyURL, baseURL);

        if (
          newURL.endsWith(tokenCallbackPath) ||
          newURL.endsWith(nativeCallbackPath)
        ) {
          setURI(newURL);
          return false;
        }

        // Keep callbackUrl attached when navigating between account pages
        if (
          newURL.includes("/account/") &&
          !newURL.includes("callbackUrl=")
        ) {
          setURI(
            `${newURL}${separator}callbackUrl=${encodeURIComponent(nativeCallbackPath)}`,
          );
          return false;
        }

        setURI(newURL);
        return false;
      }}
      style={{ flex: 1 }}
    />
  );
};
