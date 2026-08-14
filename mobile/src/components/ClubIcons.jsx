/**
 * Heathland Links — Custom Club Membership Icons
 *
 * HomeClubIcon   — a clubhouse outline with a pennant flag at the roof peak
 * MemberClubIcon — two crossed golf flags (secondary / additional membership)
 *
 * Both are pure SVG outline icons, no emoji, consistent with the brand.
 * Default size: 18. Default color: Colors.green.
 */
import React from "react";
import Svg, { Path, Line, Circle, G } from "react-native-svg";
import { Colors } from "@/constants/theme";

// ─── Home Club Icon ───────────────────────────────────────────────────────────
// A small peaked clubhouse with a flag and pennant on the roof ridge.
// ViewBox: 0 0 24 24  |  Stroke style, no fill.
export function HomeClubIcon({
  size = 18,
  color = Colors.green,
  strokeWidth = 1.7,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Peaked roof — left slope */}
      <Path d="M2 12 L12 4 L22 12" />

      {/* Left outer wall */}
      <Line x1="3.5" y1="12" x2="3.5" y2="21" />

      {/* Right outer wall */}
      <Line x1="20.5" y1="12" x2="20.5" y2="21" />

      {/* Base / floor */}
      <Line x1="3.5" y1="21" x2="20.5" y2="21" />

      {/* Arched doorway — two verticals + arc hint */}
      <Path d="M10 21 L10 16.5 Q10 15 12 15 Q14 15 14 16.5 L14 21" />

      {/* Left window — small square */}
      <Path d="M5.5 15 L5.5 18 L8.5 18 L8.5 15 Z" />

      {/* Right window — small square */}
      <Path d="M15.5 15 L15.5 18 L18.5 18 L18.5 15 Z" />

      {/* Flag pole — rises from roof peak */}
      <Line x1="12" y1="4" x2="12" y2="0.5" />

      {/* Pennant — triangular flag on pole */}
      <Path d="M12 0.5 L17.5 2 L12 4" />
    </Svg>
  );
}

// ─── Member Club Icon ─────────────────────────────────────────────────────────
// Two golf flags crossed — a classic symbol for additional club membership.
// ViewBox: 0 0 24 24  |  Stroke style, no fill.
export function MemberClubIcon({
  size = 18,
  color = Colors.green,
  strokeWidth = 1.7,
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Left flag pole — angled slightly right */}
      <Line x1="7" y1="21" x2="10" y2="3" />

      {/* Left pennant — small triangle off the top of left pole */}
      <Path d="M10 3 L15.5 5 L10 8" />

      {/* Right flag pole — angled slightly left */}
      <Line x1="17" y1="21" x2="14" y2="3" />

      {/* Right pennant — pointing left off top of right pole */}
      <Path d="M14 3 L8.5 5 L14 8" />
    </Svg>
  );
}

// ─── Convenience: visibility icon helper (not an SVG custom icon, just lucide reference)
// Used in the edit screen to show the current visibility state.
export const VISIBILITY_LABELS = {
  public: { label: "Public", sub: "Visible to all golfers" },
  friends: { label: "Friends only", sub: "Only your friends can see this" },
  private: { label: "Private", sub: "Only you can see this" },
};
