/**
 * PostHog client for Heathland Links mobile.
 *
 * Env:
 *   EXPO_PUBLIC_POSTHOG_KEY   — project API key (empty = all helpers no-op)
 *   EXPO_PUBLIC_POSTHOG_HOST  — e.g. https://us.i.posthog.com
 */

import PostHog from "posthog-react-native";
import { Platform } from "react-native";

const apiKey = (process.env.EXPO_PUBLIC_POSTHOG_KEY || "").trim();
const host =
  (process.env.EXPO_PUBLIC_POSTHOG_HOST || "").trim() ||
  "https://us.i.posthog.com";

export const isPostHogEnabled = Boolean(apiKey);

/** @type {PostHog | null} */
let client = null;

/**
 * Lazily create the shared PostHog instance. Returns null when no API key.
 */
export function getPostHog() {
  if (!isPostHogEnabled) return null;
  if (client) return client;

  try {
    client = new PostHog(apiKey, {
      host,
      // Expo Router requires manual screen capture (see PostHogScreenTracker).
      captureAppLifecycleEvents: true,
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
        },
      },
    });
  } catch {
    client = null;
  }
  return client;
}

export function capture(event, properties = {}) {
  try {
    const ph = getPostHog();
    if (!ph || !event) return;
    ph.capture(event, {
      ...properties,
      os: properties.os ?? Platform.OS,
    });
  } catch {
    // Analytics must never crash the host app.
  }
}

export function screen(name, properties = {}) {
  try {
    const ph = getPostHog();
    if (!ph || !name) return;
    void ph.screen(name, properties);
  } catch {
    // no-op
  }
}

/**
 * Identify the signed-in user. Only sends fields already on the auth user object.
 */
export function identifyUser(user) {
  try {
    const ph = getPostHog();
    if (!ph || !user) return;
    const id = user.id ?? user.user_id ?? user.userId;
    if (id == null) return;

    const traits = {};
    if (user.email) traits.email = user.email;
    if (user.first_name) traits.first_name = user.first_name;
    if (user.last_name) traits.last_name = user.last_name;

    ph.identify(String(id), traits);
  } catch {
    // no-op
  }
}

export function resetUser() {
  try {
    const ph = getPostHog();
    if (!ph) return;
    ph.reset();
  } catch {
    // no-op
  }
}

export function captureException(error, extra = {}) {
  try {
    const ph = getPostHog();
    if (!ph || error == null) return;
    ph.captureException(error, {
      ...extra,
      os: extra.os ?? Platform.OS,
    });
  } catch {
    // no-op
  }
}
