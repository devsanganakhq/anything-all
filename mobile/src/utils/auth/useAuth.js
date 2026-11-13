import { detachPushToken } from "@/utils/usePushNotifications";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as Application from "expo-application";
import { useCallback, useEffect, useMemo } from "react";
import { create } from "zustand";
import { Modal, View } from "react-native";
import {
  useAuthModal,
  useAuthStore,
  authKey,
  installKey,
  secureStoreOptions,
} from "./store";
import { resetAppCache } from "@/utils/queryClient";
import { identifyUser, resetUser } from "@/utils/posthog";

/**
 * Reads the stored session, discarding one left behind by a previous install.
 *
 * iOS keeps Keychain items after an app is deleted, so a reinstalled app would
 * otherwise come back signed in with an old session. The session is stamped
 * with the app's installation time, which changes on reinstall but not on
 * update. A session from before stamping existed is kept and stamped, so
 * updating the app never signs anyone out.
 */
async function readStoredSession() {
  const stored = await SecureStore.getItemAsync(authKey, secureStoreOptions);
  if (!stored) return null;
  let installedAt = null;
  try {
    const time = await Application.getInstallationTimeAsync();
    installedAt = time ? String(time.getTime()) : null;
  } catch {
    return stored; // cannot tell; keep the session rather than sign out
  }
  if (!installedAt) return stored;
  const stamp = await SecureStore.getItemAsync(installKey, secureStoreOptions);
  if (stamp && stamp !== installedAt) {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(authKey, secureStoreOptions),
      SecureStore.setItemAsync(installKey, installedAt, secureStoreOptions),
    ]);
    return null;
  }
  if (!stamp) {
    await SecureStore.setItemAsync(installKey, installedAt, secureStoreOptions).catch(() => {});
  }
  return stored;
}

/**
 * This hook provides authentication functionality.
 * It may be easier to use the `useAuthModal` or `useRequireAuth` hooks
 * instead as those will also handle showing authentication to the user
 * directly.
 */
export const useAuth = () => {
  const { isReady, auth, setAuth } = useAuthStore();
  const { isOpen, close, open } = useAuthModal();

  const initiate = useCallback(() => {
    // The auth state machine must always reach a terminal state. SecureStore
    // can throw or hang in TestFlight release builds (Keychain access denied,
    // missing keychain-access-groups entitlement after EAS migration, locked
    // device first-unlock state, or iOS 26 TurboModule rethrow). Without a
    // catch the unhandled rejection leaves isReady=false forever and the
    // RootLayout renders null — the user sees a blank screen indefinitely.
    Promise.race([
      readStoredSession(),
      new Promise((resolve) => setTimeout(() => resolve(null), 3000)),
    ])
      .then((stored) => {
        const nextAuth = stored ? JSON.parse(stored) : null;
        useAuthStore.setState({
          auth: nextAuth,
          isReady: true,
        });
        if (nextAuth?.user) {
          identifyUser(nextAuth.user);
        }
      })
      .catch(() => {
        useAuthStore.setState({ auth: null, isReady: true });
      });
  }, []);

  useEffect(() => {}, []);

  const signIn = useCallback(() => {
    open({ mode: "signin" });
  }, [open]);
  const signUp = useCallback(() => {
    open({ mode: "signup" });
  }, [open]);

  const signOut = useCallback(async () => {
    await detachPushToken();
    fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
    setAuth(null);
    resetUser();
    resetAppCache();
    close();
    router.replace("/");
  }, [close, setAuth]);

  return {
    isReady,
    isAuthenticated: isReady ? !!auth : null,
    signIn,
    signOut,
    signUp,
    auth,
    setAuth,
    initiate,
  };
};

/**
 * This hook will automatically open the authentication modal if the user is not authenticated.
 */
export const useRequireAuth = (options) => {
  const { isAuthenticated, isReady } = useAuth();
  const { open } = useAuthModal();

  useEffect(() => {
    if (!isAuthenticated && isReady) {
      open({ mode: options?.mode });
    }
  }, [isAuthenticated, open, options?.mode, isReady]);
};

export default useAuth;
