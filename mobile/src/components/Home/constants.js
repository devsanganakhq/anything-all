// ─── Constants ────────────────────────────────────────────────────────────────
import { Dimensions } from "react-native";
import {
  CheckCircle,
  BookmarkPlus,
  Star,
  Camera,
  Award,
  TrendingUp,
  Trophy,
  Flag,
  Zap,
  Megaphone,
  Users,
  Plane,
} from "lucide-react-native";
import { Colors } from "@/constants/theme";

export const PAGE_SIZE = 12;
export const { width: SCREEN_W } = Dimensions.get("window");
export const CARD_PHOTO_H = Math.round(SCREEN_W * 0.6);
export const THUMB_H = 220;

export const FILTERS = [
  { key: "all", label: "All" },
  { key: "friends", label: "Friends" },
  { key: "clubs", label: "Clubs" },
  { key: "communities", label: "Communities" },
  { key: "achievements", label: "Achievements" },
];

export const POST_TYPE_META = {
  played_course: {
    label: "Played",
    icon: CheckCircle,
    color: Colors.green,
    bg: Colors.greenLight,
  },
  wishlist: {
    label: "Wish List",
    icon: BookmarkPlus,
    color: Colors.purple,
    bg: Colors.purpleLight,
  },
  review: {
    label: "Review",
    icon: Star,
    color: Colors.gold,
    bg: Colors.goldLight,
  },
  photos: {
    label: "Photos",
    icon: Camera,
    color: Colors.green,
    bg: Colors.greenLight,
  },
  achievement: {
    label: "Achievement",
    icon: Award,
    color: Colors.purple,
    bg: Colors.purpleLight,
  },
  ranking_progress: {
    label: "Progress",
    icon: TrendingUp,
    color: Colors.gold,
    bg: Colors.goldLight,
  },
  ranking_complete: {
    label: "Completed",
    icon: Trophy,
    color: Colors.gold,
    bg: Colors.goldLight,
  },
  passport_complete: {
    label: "Passport",
    icon: Flag,
    color: Colors.green,
    bg: Colors.greenLight,
  },
  milestone: {
    label: "Milestone",
    icon: Zap,
    color: Colors.purple,
    bg: Colors.purpleLight,
  },
  club_update: {
    label: "Club",
    icon: Megaphone,
    color: Colors.green,
    bg: Colors.greenLight,
  },
  community_discussion: {
    label: "Community",
    icon: Users,
    color: Colors.purple,
    bg: Colors.purpleLight,
  },
  golf_trip: {
    label: "Golf Trip",
    icon: Plane,
    color: Colors.gold,
    bg: Colors.goldLight,
  },
};

export const REACTION_OPTIONS = [
  { type: "like", emoji: "❤️", label: "Like" },
  { type: "love", emoji: "🔥", label: "Fire" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
];

export const COUNTRY_FLAGS = {
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  ireland: "🇮🇪",
  "northern ireland": "🇬🇧",
  usa: "🇺🇸",
  "united states": "🇺🇸",
  australia: "🇦🇺",
  canada: "🇨🇦",
  "south africa": "🇿🇦",
  spain: "🇪🇸",
  france: "🇫🇷",
  germany: "🇩🇪",
  japan: "🇯🇵",
  "united kingdom": "🇬🇧",
  uk: "🇬🇧",
};
