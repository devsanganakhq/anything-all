import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useAuthStore } from "./store";
import { resetAppCache } from "@/utils/queryClient";
import { identifyUser } from "@/utils/posthog";

// Native uses expo-web-success so the page can postMessage JWT back into RN
// (WKWebView cookies are not reliably shared with the JS fetch cookie jar).
const nativeCallbackPath = "/api/auth/expo-web-success";
const tokenCallbackPath = "/api/auth/token";
const ensureForgotPasswordLink = `(() => {
  try {
    const addLink = () => {
      if (window.location.pathname !== "/account/signin") return;
      const hasLink = Array.from(document.querySelectorAll("a")).some(
        (link) => link.textContent?.trim().toLowerCase() === "forgot password?",
      );
      if (hasLink) return;

      const form = document.querySelector("form");
      const submit = form?.querySelector('button[type="submit"], input[type="submit"]');
      if (!form || !submit?.parentNode) return;

      const wrapper = document.createElement("div");
      wrapper.style.cssText = "margin-top:10px;margin-bottom:16px;text-align:right";
      const link = document.createElement("a");
      link.href = "/account/forgot-password" + window.location.search;
      link.textContent = "Forgot password?";
      link.style.cssText =
        "font-size:14px;color:#1B3828;font-weight:600;text-decoration:underline;text-underline-offset:2px";
      wrapper.appendChild(link);
      submit.parentNode.insertBefore(wrapper, submit.nextSibling);
    };

    addLink();
    new MutationObserver(addLink).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  } catch (error) {
    console.warn("Could not add password reset link", error);
  }
  return true;
})();`;

// Fallback handoff: /api/auth/token is loaded INSIDE the WebView (the only
// place that holds the session cookie) and its JSON body is posted to RN.
const postTokenPayload = `(() => {
  try {
    if (window.location.pathname !== "${tokenCallbackPath}") return true;
    if (!window.ReactNativeWebView) return true;
    var data = null;
    try { data = JSON.parse(document.body ? document.body.innerText : ""); } catch (e) {}
    var message = data && data.jwt
      ? { type: "AUTH_SUCCESS", jwt: data.jwt, user: data.user }
      : { type: "AUTH_ERROR", error: "Unauthorized" };
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  } catch (e) {}
  return true;
})();`;

// A failed handoff always returns to sign-in (also after sign-up: the account
// exists by then), whose page renders the ?error= code as a readable message.
// Runs before the page renders: the token route is plain JSON and must never
// be shown on screen (the native loading overlay stays in front of it).
const hideTokenPage = `(() => {
  try {
    if (window.location.pathname === "${tokenCallbackPath}") {
      document.documentElement.style.visibility = "hidden";
    }
  } catch (e) {}
  return true;
})();`;

const signInErrorURL = (baseURL) =>
  `${baseURL}/account/signin?callbackUrl=${encodeURIComponent(nativeCallbackPath)}&error=Callback`;

const sameOrigin = (url, base) => {
  try {
    return new URL(url).origin === new URL(base).origin;
  } catch {
    return false;
  }
};

const isPath = (url, path) => {
  try {
    return new URL(url).pathname === path;
  } catch {
    return false;
  }
};

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

  // The success page may post more than once (retries + token fallback);
  // apply each session exactly once.
  const appliedJwt = useRef(null);

  const applyAuthSuccess = async (data) => {
    if (!data?.jwt || typeof data.jwt !== "string") {
      console.error("[AuthWebView] AUTH_SUCCESS missing session");
      return;
    }
    if (appliedJwt.current === data.jwt) return;
    appliedJwt.current = data.jwt;
    // setAuth stores the session in SecureStore before publishing it, so the
    // navigation effect below only fires once the session survives a restart.
    // Cached queries are dropped first so refetches use the new Bearer token.
    resetAppCache();
    await setAuth({ jwt: data.jwt, user: data.user });
    if (data.user) {
      identifyUser(data.user);
    }
  };

  const showAuthError = () => {
    appliedJwt.current = null;
    setURI(signInErrorURL(baseURL));
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
      if (
        ![baseURL, proxyURL].filter(Boolean).some((value) => {
          try {
            return event.origin === new URL(value).origin;
          } catch {
            return false;
          }
        })
      ) {
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
      startInLoadingState
      injectedJavaScript={`${ensureForgotPasswordLink}\n${postTokenPayload}`}
      injectedJavaScriptBeforeContentLoaded={hideTokenPage}
      renderLoading={() => (
        <View style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "#F5F3EB", alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#193D2C" />
          <Text style={{ marginTop: 14, color: "#193D2C", fontSize: 16 }}>Loading your secure sign-in…</Text>
        </View>
      )}
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      source={{
        uri: currentURI,
        headers: {
          "x-createxyz-project-group-id":
            process.env.EXPO_PUBLIC_PROJECT_GROUP_ID || "",
          "x-createxyz-host": process.env.EXPO_PUBLIC_HOST || "",
        },
      }}
      onMessage={(event) => {
        // Only messages from pages served by our own backend are trusted.
        if (!sameOrigin(event.nativeEvent.url, baseURL)) return;
        let data;
        try {
          data = JSON.parse(event.nativeEvent.data);
        } catch {
          return;
        }
        if (data?.type === "AUTH_SUCCESS") {
          applyAuthSuccess(data);
        } else if (data?.type === "AUTH_ERROR") {
          // Never log the payload; it can contain account details.
          console.warn("[AuthWebView] sign-in handoff was rejected");
          if (!isAuthenticated) showAuthError();
        }
      }}
      onShouldStartLoadWithRequest={(request) => {
        const url = request.url || "";
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          return false;
        }
        const trusted = [baseURL, proxyURL]
          .filter(Boolean)
          .some((value) => sameOrigin(url, value));
        if (!trusted) return false;

        // Handoff pages must load inside the WebView: it is the only place that
        // holds the session cookie. Intercepting them would cancel the handoff.
        if (
          sameOrigin(url, baseURL) &&
          (isPath(url, nativeCallbackPath) || isPath(url, tokenCallbackPath))
        ) {
          return true;
        }

        if (url === currentURI) return true;

        const newURL = proxyURL ? url.replace(proxyURL, baseURL) : url;

        if (isPath(newURL, nativeCallbackPath) || isPath(newURL, tokenCallbackPath)) {
          setURI(newURL);
          return false;
        }

        // Keep callbackUrl attached when navigating between account pages
        if (parsed.pathname.startsWith("/account/") && !parsed.searchParams.has("callbackUrl")) {
          const separator = newURL.includes("?") ? "&" : "?";
          setURI(
            `${newURL}${separator}callbackUrl=${encodeURIComponent(nativeCallbackPath)}`,
          );
          return false;
        }

        setURI(newURL);
        return false;
      }}
      style={{ flex: 1, backgroundColor: "#F5F3EB" }}
      containerStyle={{ backgroundColor: "#F5F3EB" }}
    />
  );
};
