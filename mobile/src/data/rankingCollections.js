/**
 * Ranking Collections — modular data model
 *
 * Each entry carries:
 *   id              – stable slug used as React key and for deep-linking
 *   ranking_source  – who publishes this ranking
 *   ranking_name    – canonical DB ranking_name
 *   ranking_region  – geographic scope label
 *   ranking_year    – edition year
 *   accentColor     – token for card accent (maps to Colors values in theme)
 *   icon            – emoji badge shown on the card
 *   description     – one-line context shown on the collection detail page
 *   is_sample_data  – if true, a "Sample data" disclaimer is shown in the UI
 *
 * Provenance fields (verified collections only):
 *   expected_size   – the full size of the ranking when complete
 *   verified_count  – number of active, verified rows in the DB right now
 *   missing_count   – expected_size - verified_count
 *   is_complete     – true only when verified_count === expected_size
 *
 * RULE: course_count in public UI must read from verified_count.
 * Do not pad missing positions with inferred data.
 * Missing positions are displayed as "awaiting verification".
 */

export const RANKING_COLLECTIONS = [
  // ── Named ranking collections (Top100GolfCourses.com 2026) ───────────────
  // verified_count reflects live DB state after quarantine of inferred rows.
  // Collections are intentionally incomplete — missing positions require
  // verified source data before they may be published.
  {
    id: "top-100-bi",
    ranking_source: "Top100GolfCourses.com",
    ranking_name: "Top 100 Britain & Ireland",
    ranking_region: "Britain & Ireland",
    ranking_year: 2026,
    accentColor: "gold",
    icon: "🏆",
    description:
      "The finest courses across England, Scotland, Wales and Ireland.",
    is_sample_data: false,
    expected_size: 100,
    verified_count: 46,
    missing_count: 54,
    is_complete: false,
  },
  {
    id: "top-100-england",
    ranking_source: "Top100GolfCourses.com",
    ranking_name: "Top 100 England",
    ranking_region: "England",
    ranking_year: 2026,
    accentColor: "green",
    icon: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    description:
      "England's greatest courses, from the sandbelt south to the dunes of the north.",
    is_sample_data: false,
    expected_size: 100,
    verified_count: 23,
    missing_count: 77,
    is_complete: false,
  },
  {
    id: "top-50-scotland",
    ranking_source: "Top100GolfCourses.com",
    ranking_name: "Top 50 Scotland",
    ranking_region: "Scotland",
    ranking_year: 2026,
    accentColor: "purple",
    icon: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
    description:
      "Scotland's crown jewels — from Royal Dornoch to the Highlands.",
    is_sample_data: false,
    expected_size: 50,
    verified_count: 2,
    missing_count: 48,
    is_complete: false,
  },
  {
    id: "top-50-wales",
    ranking_source: "Top100GolfCourses.com",
    ranking_name: "Top 50 Wales",
    ranking_region: "Wales",
    ranking_year: 2026,
    accentColor: "green",
    icon: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
    description:
      "Wales's best courses, from the dunes of Harlech to the valleys of the south.",
    is_sample_data: false,
    expected_size: 50,
    verified_count: 2,
    missing_count: 48,
    is_complete: false,
  },
  {
    id: "top-25-ireland",
    ranking_source: "Top100GolfCourses.com",
    ranking_name: "Top 25 Island of Ireland",
    ranking_region: "Island of Ireland",
    ranking_year: 2026,
    accentColor: "gold",
    icon: "🇮🇪",
    description:
      "The best of the island of Ireland — Republic and Northern Ireland combined.",
    is_sample_data: false,
    expected_size: 25,
    verified_count: 0,
    missing_count: 25,
    is_complete: false,
  },
  // ── Community-computed lists (Heathland Links data) ───────────────────────
  {
    id: "community-top-rated",
    ranking_source: "HEATHLAND_LINKS_COMMUNITY",
    ranking_name: "Community Top Rated",
    ranking_region: "Britain & Ireland",
    ranking_year: null,
    accentColor: "gold",
    icon: "⭐",
    description:
      "Ranked by Heathland Links members' ratings — updated in real time.",
    is_sample_data: false,
    course_count: null,
  },
  {
    id: "most-played",
    ranking_source: "HEATHLAND_LINKS_COMMUNITY",
    ranking_name: "Most Played",
    ranking_region: "Britain & Ireland",
    ranking_year: null,
    accentColor: "green",
    icon: "📍",
    description: "The courses checked in by the most Heathland Links members.",
    is_sample_data: false,
    course_count: null,
  },
  {
    id: "trending",
    ranking_source: "HEATHLAND_LINKS_COMMUNITY",
    ranking_name: "Trending",
    ranking_region: "Britain & Ireland",
    ranking_year: null,
    accentColor: "purple",
    icon: "🔥",
    description: "Courses gaining momentum in the community right now.",
    is_sample_data: false,
    course_count: null,
  },
  {
    id: "golf-destinations",
    ranking_source: "HEATHLAND_LINKS_COMMUNITY",
    ranking_name: "Golf Destinations",
    ranking_region: "Britain & Ireland",
    ranking_year: null,
    accentColor: "gold",
    icon: "✈️",
    description: "Plan your next golf trip — browse by country.",
    is_sample_data: false,
    course_count: null,
    is_destinations: true,
  },
];

/**
 * Map accent colour token → hex value (mirrors Colors in theme.js)
 */
export const ACCENT_HEX = {
  gold: "#C9952A",
  green: "#1B5E35",
  purple: "#6B4F8A",
};
