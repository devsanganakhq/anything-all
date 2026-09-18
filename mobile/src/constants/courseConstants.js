import { Dimensions } from "react-native";
import { Spacing } from "@/constants/theme";

// ─── Screen dimensions ────────────────────────────────────────────────────────
export const SCREEN_W = Dimensions.get("window").width;
export const HERO_HEIGHT = 340;
export const STICKY_HEADER_H = 54;
export const PHOTO_SIZE = (SCREEN_W - Spacing.screenH * 2 - 8) / 3;

// ─── Fallback hero images ─────────────────────────────────────────────────────
export const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1609563110787-5e3fc66f8e18?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1510525009512-ad7fc2a4c1cb?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?q=80&w=1200&auto=format&fit=crop",
];

// ─── Ranking collection accent palette ───────────────────────────────────────
export const RANKING_ACCENTS = {
  "Top 100 England": {
    color: "#1B5E35",
    bg: "#EEF5F0",
    flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    short: "England",
  },
  "Top 100 Britain & Ireland": {
    color: "#C9952A",
    bg: "#FDF7EC",
    flag: "🇬🇧",
    short: "B&I",
  },
  "Top 50 Scotland": {
    color: "#6B4F8A",
    bg: "#F5F1FA",
    flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    short: "Scotland",
  },
  "Top 50 Wales": {
    color: "#C0392B",
    bg: "#FDF0EE",
    flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    short: "Wales",
  },
  "Top 25 Island of Ireland": {
    color: "#0D7A3C",
    bg: "#EBF6EF",
    flag: "🇮🇪",
    short: "Ireland",
  },
};

export const RANKING_DEFAULT = {
  color: "#C9A84C",
  bg: "#FDF7EC",
  flag: "🏆",
  short: "",
};

// ─── Course status config ─────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  temporarily_closed: {
    label: "TEMPORARILY CLOSED",
    bg: "#FEF3C7",
    border: "#FDE68A",
    text: "#92400E",
  },
  permanently_closed: {
    label: "PERMANENTLY CLOSED",
    bg: "#FEE2E2",
    border: "#FECACA",
    text: "#991B1B",
  },
  under_construction: {
    label: "UNDER CONSTRUCTION",
    bg: "#EFF6FF",
    border: "#BFDBFE",
    text: "#1E40AF",
  },
};

// ─── Activity type labels ─────────────────────────────────────────────────────
export const ACTIVITY_LABELS = {
  played_course: "played this course",
  added_wishlist: "added to wish list",
  review_posted: "posted a review",
  photo_uploaded: "uploaded a photo",
  achievement_unlocked: "earned an achievement",
};

// ─── Feature flags ────────────────────────────────────────────────────────────
/** Set to true to show rankings tab, badges, collections, and progress again. */
export const SHOW_RANKINGS = false;

// ─── Tab list ─────────────────────────────────────────────────────────────────
export const ALL_TABS = ["OVERVIEW", "RANKINGS", "REVIEWS", "PHOTOS", "INFO"];
export const TABS = SHOW_RANKINGS
  ? ALL_TABS
  : ALL_TABS.filter((t) => t !== "RANKINGS");
