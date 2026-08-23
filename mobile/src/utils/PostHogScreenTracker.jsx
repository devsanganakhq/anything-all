/**
 * Manual screen tracking for Expo Router.
 * PostHog autocaptureScreens is disabled for expo-router — we call screen() on pathname changes.
 */

import { useEffect } from "react";
import { usePathname, useGlobalSearchParams } from "expo-router";
import { screen } from "@/utils/posthog";

export function PostHogScreenTracker() {
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const props = {};
    // Only attach simple scalar route params (ids), never tokens.
    for (const [key, value] of Object.entries(params || {})) {
      if (value == null) continue;
      if (typeof value === "string" || typeof value === "number") {
        if (/token|jwt|password|secret/i.test(key)) continue;
        props[key] = value;
      }
    }

    screen(pathname, props);
  }, [pathname, params]);

  return null;
}
