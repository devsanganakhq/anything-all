/**
 * HEATHLAND LINKS — COMMERCIAL ARCHITECTURE REGISTRY
 * ====================================================
 * This file is the single source of truth for planned commercial entities.
 * It is an internal reference only — nothing here is exposed to users.
 *
 * Purpose:
 *   - Document every future entity, its DB table, its FK relationships
 *     and the API namespace reserved for it.
 *   - Provide constants that future route handlers and admin tools import
 *     instead of repeating magic strings.
 *   - Act as a checklist for build phases.
 *
 * Rules:
 *   - This file MUST NOT be imported by any customer-facing route or mobile screen.
 *   - All monetary values in the database are stored as INTEGER PENCE (GBP).
 *   - All amounts passed over the API should also be in pence.
 *   - Polymorphic references use the pair: <column>_type + <column>_id.
 *
 * Build phases (do not expose phases 2+ to users until approved):
 *   Phase 1 — Schema reserved (current). Tables exist, empty, no public API.
 *   Phase 2 — Club admin panel (internal). Claimed profiles, subscriptions.
 *   Phase 3 — Club feed & tee times. Club posts appear in main feed.
 *   Phase 4 — Travel. Itineraries published, hotels/restaurants listed.
 *   Phase 5 — Commerce. Merchandise, orders, Stripe integration.
 *   Phase 6 — Advertising. Promoted posts, campaigns, ad-serving.
 */

// ─── Table names ──────────────────────────────────────────────────────────────
export const TABLES = {
  // ── Existing core tables (read-only reference, do not rename) ─────────────
  USERS: "users",
  COURSES: "courses",
  FEED_POSTS: "feed_posts",
  FEED_REACTIONS: "feed_reactions",
  FEED_COMMENTS: "feed_comments",
  COMMUNITIES: "communities",
  COMMUNITY_MEMBERS: "community_members",
  COMMUNITY_POSTS: "community_posts",
  PLAYED_COURSES: "played_courses",
  WISHLIST: "wishlist",
  RANKINGS: "rankings",
  NOTIFICATIONS: "notifications",
  FOLLOWS: "follows",
  FRIENDSHIPS: "friendships",
  MEMBER_PHOTOS: "member_photos",
  ACHIEVEMENTS: "achievements",
  USER_ACHIEVEMENTS: "user_achievements",
  USER_CLUB_MEMBERSHIPS: "user_club_memberships",

  // ── Phase 2 — Club operators ──────────────────────────────────────────────
  ADVERTISER_ACCOUNTS: "advertiser_accounts",
  CLAIMED_CLUB_PROFILES: "claimed_club_profiles",
  SUBSCRIPTION_PACKAGES: "subscription_packages",
  CLUB_SUBSCRIPTIONS: "club_subscriptions",

  // ── Phase 3 — Club content ────────────────────────────────────────────────
  CLUB_FEED_POSTS: "club_feed_posts",
  PROMOTED_POSTS: "promoted_posts",
  TEE_TIME_OFFERS: "tee_time_offers",

  // ── Phase 4 — Travel ──────────────────────────────────────────────────────
  HOTELS: "hotels",
  RESTAURANTS: "restaurants",
  TRANSPORT_PARTNERS: "transport_partners",
  TRAVEL_ITINERARIES: "travel_itineraries",
  ITINERARY_COURSES: "itinerary_courses",
  ITINERARY_HOTELS: "itinerary_hotels",
  ITINERARY_RESTAURANTS: "itinerary_restaurants",
  ITINERARY_TRANSPORT: "itinerary_transport",
  USER_SAVED_ITINERARIES: "user_saved_itineraries",

  // ── Phase 5 — Commerce ────────────────────────────────────────────────────
  MERCHANDISE_PRODUCTS: "merchandise_products",
  ORDERS: "orders",
  ORDER_ITEMS: "order_items",
  COMMISSIONS: "commissions",
  AFFILIATE_LINKS: "affiliate_links",

  // ── Phase 6 — Advertising ─────────────────────────────────────────────────
  SPONSORSHIP_CAMPAIGNS: "sponsorship_campaigns",
};

// ─── Enum values (mirrors CHECK constraints in the DB) ───────────────────────
export const ENUMS = {
  ADVERTISER_STATUS: ["pending", "approved", "suspended", "closed"],
  CLAIM_STATUS: ["pending", "approved", "rejected", "suspended"],
  SUBSCRIPTION_STATUS: ["trial", "active", "past_due", "cancelled", "expired"],
  BILLING_PERIOD: ["monthly", "annual", "one_off"],
  CLUB_POST_TYPE: [
    "news",
    "event",
    "offer",
    "update",
    "competition",
    "course_condition",
  ],
  PROMOTED_STATUS: [
    "draft",
    "pending_review",
    "active",
    "paused",
    "completed",
    "rejected",
  ],
  CAMPAIGN_TYPE: [
    "community_sponsor",
    "feed_promotion",
    "course_partner",
    "featured_club",
    "travel_partner",
  ],
  CAMPAIGN_STATUS: [
    "draft",
    "pending_review",
    "active",
    "paused",
    "completed",
    "rejected",
  ],
  ORDER_TYPE: ["merchandise", "tee_time", "travel", "subscription", "other"],
  ORDER_STATUS: [
    "pending",
    "confirmed",
    "processing",
    "fulfilled",
    "cancelled",
    "refunded",
    "failed",
  ],
  ORDER_ITEM_TYPE: [
    "merchandise_product",
    "tee_time_offer",
    "travel_itinerary",
    "other",
  ],
  COMMISSION_TYPE: [
    "affiliate",
    "club_sale",
    "platform_fee",
    "promotion_spend",
  ],
  COMMISSION_STATUS: ["pending", "approved", "paid", "rejected", "reversed"],
  AFFILIATE_TYPE: [
    "course",
    "hotel",
    "restaurant",
    "transport",
    "merchandise",
    "external",
  ],
  COMMISSION_MODEL: ["flat", "percentage", "none"],
  PRODUCT_TYPE: [
    "apparel",
    "equipment",
    "accessories",
    "gift",
    "digital",
    "other",
  ],
  PARTNER_TYPE: ["chauffeur", "shuttle", "taxi", "hire_car", "coach", "other"],
  MEAL_TYPE: ["breakfast", "lunch", "dinner", "drinks"],
};

// ─── API namespaces (reserved — routes not yet created) ──────────────────────
// Each entry documents the future route file path and expected HTTP verbs.
// INTERNAL ONLY. Do not expose these routes to customers until the phase ships.
export const FUTURE_API_ROUTES = {
  // Phase 2 — Club operators
  CLUB_CLAIM: { path: "/api/club/claim", verbs: ["POST"] },
  CLUB_PROFILE: { path: "/api/club/[clubId]", verbs: ["GET", "PUT"] },
  CLUB_ADMIN: { path: "/api/club/[clubId]/admin", verbs: ["GET", "PUT"] },
  CLUB_SUBSCRIPTION: {
    path: "/api/club/[clubId]/subscription",
    verbs: ["GET", "POST", "PUT"],
  },
  ADVERTISER_ACCOUNTS: {
    path: "/api/advertiser/[accountId]",
    verbs: ["GET", "POST", "PUT"],
  },

  // Phase 3 — Club content
  CLUB_POSTS_LIST: { path: "/api/club/[clubId]/posts", verbs: ["GET", "POST"] },
  CLUB_POST: {
    path: "/api/club/[clubId]/posts/[postId]",
    verbs: ["GET", "PUT", "DELETE"],
  },
  TEE_TIMES_LIST: {
    path: "/api/club/[clubId]/tee-times",
    verbs: ["GET", "POST"],
  },
  TEE_TIME: {
    path: "/api/club/[clubId]/tee-times/[id]",
    verbs: ["GET", "PUT", "DELETE"],
  },
  PROMOTE_POST: { path: "/api/promote/post", verbs: ["POST"] },
  PROMOTED_LIST: { path: "/api/promote/list", verbs: ["GET"] },

  // Phase 4 — Travel
  ITINERARIES_LIST: { path: "/api/travel/itineraries", verbs: ["GET", "POST"] },
  ITINERARY: {
    path: "/api/travel/itineraries/[id]",
    verbs: ["GET", "PUT", "DELETE"],
  },
  ITINERARY_SAVE: {
    path: "/api/travel/itineraries/[id]/save",
    verbs: ["POST", "DELETE"],
  },
  HOTELS_LIST: { path: "/api/travel/hotels", verbs: ["GET", "POST"] },
  HOTEL: { path: "/api/travel/hotels/[id]", verbs: ["GET", "PUT"] },
  RESTAURANTS_LIST: { path: "/api/travel/restaurants", verbs: ["GET", "POST"] },
  RESTAURANT: { path: "/api/travel/restaurants/[id]", verbs: ["GET", "PUT"] },
  TRANSPORT_LIST: { path: "/api/travel/transport", verbs: ["GET", "POST"] },
  TRANSPORT: { path: "/api/travel/transport/[id]", verbs: ["GET", "PUT"] },

  // Phase 5 — Commerce
  PRODUCTS_LIST: {
    path: "/api/club/[clubId]/products",
    verbs: ["GET", "POST"],
  },
  PRODUCT: {
    path: "/api/club/[clubId]/products/[id]",
    verbs: ["GET", "PUT", "DELETE"],
  },
  ORDERS_LIST: { path: "/api/orders", verbs: ["GET", "POST"] },
  ORDER: { path: "/api/orders/[id]", verbs: ["GET", "PUT"] },
  AFFILIATES_LIST: { path: "/api/affiliates", verbs: ["GET", "POST"] },
  AFFILIATE_REDIRECT: {
    path: "/api/affiliates/[slug]/redirect",
    verbs: ["GET"],
  },
  COMMISSIONS_LIST: { path: "/api/commissions", verbs: ["GET"] },

  // Phase 6 — Advertising
  CAMPAIGNS_LIST: { path: "/api/campaigns", verbs: ["GET", "POST"] },
  CAMPAIGN: { path: "/api/campaigns/[id]", verbs: ["GET", "PUT", "DELETE"] },
};

// ─── Relationship map — human-readable FK documentation ──────────────────────
// Format: { table → [{ col, references: "table.col", note }] }
// This is documentation only; the real constraints live in the DB.
export const RELATIONSHIPS = {
  advertiser_accounts: [
    {
      col: "user_id",
      references: "users.id",
      note: "The user who owns/manages this advertiser account.",
    },
  ],

  claimed_club_profiles: [
    {
      col: "course_id",
      references: "courses.id",
      note: "The course/club record this profile represents. Nullable if club not yet in courses table.",
    },
    {
      col: "owner_user_id",
      references: "users.id",
      note: "The operator user who claimed the profile.",
    },
    {
      col: "advertiser_account_id",
      references: "advertiser_accounts.id",
      note: "Set if this club also runs paid promotions.",
    },
    {
      col: "verified_by_user_id",
      references: "users.id",
      note: "Internal staff member who approved the claim.",
    },
  ],

  club_subscriptions: [
    {
      col: "club_profile_id",
      references: "claimed_club_profiles.id",
      note: "One subscription per claimed club.",
    },
    {
      col: "package_id",
      references: "subscription_packages.id",
      note: "The tier currently subscribed to.",
    },
  ],

  club_feed_posts: [
    {
      col: "club_profile_id",
      references: "claimed_club_profiles.id",
      note: "The club that authored the post.",
    },
    {
      col: "feed_post_id",
      references: "feed_posts.id",
      note: "Set when post is published to the main app feed (post_type=club_update).",
    },
    {
      col: "course_id",
      references: "courses.id",
      note: "Optional: the course this post relates to.",
    },
    {
      col: "community_id",
      references: "communities.id",
      note: "Optional: cross-posted to this community.",
    },
  ],

  promoted_posts: [
    {
      col: "feed_post_id",
      references: "feed_posts.id",
      note: "The promoted feed post. Either this or club_feed_post_id must be set.",
    },
    {
      col: "club_feed_post_id",
      references: "club_feed_posts.id",
      note: "The promoted club post. Either this or feed_post_id must be set.",
    },
    {
      col: "advertiser_account_id",
      references: "advertiser_accounts.id",
      note: "The advertiser paying for the promotion.",
    },
    {
      col: "campaign_id",
      references: "sponsorship_campaigns.id",
      note: "Optional: the parent campaign this promotion belongs to.",
    },
  ],

  tee_time_offers: [
    {
      col: "club_profile_id",
      references: "claimed_club_profiles.id",
      note: "The club offering the tee time.",
    },
    {
      col: "course_id",
      references: "courses.id",
      note: "The specific course the tee time is on.",
    },
  ],

  merchandise_products: [
    {
      col: "club_profile_id",
      references: "claimed_club_profiles.id",
      note: "The club selling the product.",
    },
  ],

  orders: [
    {
      col: "user_id",
      references: "users.id",
      note: "The customer who placed the order.",
    },
  ],

  order_items: [
    { col: "order_id", references: "orders.id", note: "Parent order." },
    {
      col: "item_type + item_id",
      references:
        "merchandise_products.id | tee_time_offers.id | travel_itineraries.id",
      note: "Polymorphic. item_name is denormalised to preserve history if the product is later edited.",
    },
  ],

  commissions: [
    {
      col: "order_id",
      references: "orders.id",
      note: "The order that generated this commission. Nullable for click-based affiliate commissions.",
    },
    {
      col: "affiliate_link_id",
      references: "affiliate_links.id",
      note: "Set if commission was triggered by an affiliate click.",
    },
    {
      col: "club_profile_id",
      references: "claimed_club_profiles.id",
      note: "Set if commission is owed to a club.",
    },
    {
      col: "advertiser_account_id",
      references: "advertiser_accounts.id",
      note: "Set if commission relates to ad spend.",
    },
  ],

  hotels: [
    {
      col: "nearest_course_id",
      references: "courses.id",
      note: "Nearest golf course — drives 'Where to stay' section on course detail page.",
    },
    {
      col: "affiliate_link_id",
      references: "affiliate_links.id",
      note: "Affiliate booking link for commission tracking.",
    },
  ],

  restaurants: [
    {
      col: "nearest_course_id",
      references: "courses.id",
      note: "Nearest course — drives 'Where to eat' section on course detail page.",
    },
    {
      col: "affiliate_link_id",
      references: "affiliate_links.id",
      note: "Affiliate booking link.",
    },
  ],

  transport_partners: [
    {
      col: "affiliate_link_id",
      references: "affiliate_links.id",
      note: "Affiliate link for commission tracking on referrals.",
    },
  ],

  travel_itineraries: [
    {
      col: "created_by_user_id",
      references: "users.id",
      note: "NULL for platform-curated trips; set for user-created itineraries.",
    },
  ],

  itinerary_courses: [
    { col: "itinerary_id", references: "travel_itineraries.id" },
    {
      col: "course_id",
      references: "courses.id",
      note: "The course to play on this day/round.",
    },
  ],

  itinerary_hotels: [
    { col: "itinerary_id", references: "travel_itineraries.id" },
    { col: "hotel_id", references: "hotels.id" },
  ],

  itinerary_restaurants: [
    { col: "itinerary_id", references: "travel_itineraries.id" },
    { col: "restaurant_id", references: "restaurants.id" },
  ],

  itinerary_transport: [
    { col: "itinerary_id", references: "travel_itineraries.id" },
    { col: "transport_partner_id", references: "transport_partners.id" },
  ],

  sponsorship_campaigns: [
    {
      col: "advertiser_account_id",
      references: "advertiser_accounts.id",
      note: "The advertiser funding the campaign.",
    },
    {
      col: "community_id",
      references: "communities.id",
      note: "Optional: campaign scoped to a single community.",
    },
    {
      col: "course_id",
      references: "courses.id",
      note: "Optional: campaign scoped to a single course.",
    },
    {
      col: "club_profile_id",
      references: "claimed_club_profiles.id",
      note: "Optional: campaign run on behalf of a claimed club.",
    },
  ],

  affiliate_links: [
    {
      col: "target_entity_type + target_entity_id",
      references:
        "courses.id | hotels.id | restaurants.id | transport_partners.id | merchandise_products.id",
      note: "Polymorphic. Resolve by reading target_entity_type first.",
    },
  ],

  user_saved_itineraries: [
    { col: "user_id", references: "users.id", note: "The user who saved it." },
    {
      col: "itinerary_id",
      references: "travel_itineraries.id",
      note: "The saved itinerary.",
    },
  ],
};

// ─── Integration points with existing feed system ─────────────────────────────
// When a club_feed_post is published, a corresponding feed_posts row is created.
// This is the mapping of club post types to feed post types.
export const CLUB_POST_TO_FEED_TYPE = {
  news: "club_update",
  event: "club_update",
  offer: "club_update", // tee time or merchandise offer
  update: "club_update",
  competition: "club_update",
  course_condition: "club_update",
};

// When a promoted_post is active, the feed query must include it as an injection.
// Future feed/route.js should LEFT JOIN promoted_posts WHERE status='active'
// and inject one promoted post every N organic posts (N to be decided in Phase 6).
export const FEED_PROMOTION_CADENCE = 8; // inject 1 promoted post per N organic posts

// ─── Currency utilities ───────────────────────────────────────────────────────
/** Convert pence integer to formatted pound string: 9950 → "£99.50" */
export function penceToDisplay(pence, currency = "GBP") {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${(pence / 100).toFixed(2)}`;
}

/** Convert a display string to pence: "£99.50" → 9950 */
export function displayToPence(display) {
  return Math.round(parseFloat(display.replace(/[^0-9.]/g, "")) * 100);
}

// ─── Phase guard (import in future route handlers) ────────────────────────────
// Use this to gate any routes that belong to unbuilt phases.
// Throw from route handlers in unreleased phases to return a 404.
export const BUILD_PHASES = {
  PHASE_2_CLUB_OPERATORS: false,
  PHASE_3_CLUB_CONTENT: false,
  PHASE_4_TRAVEL: false,
  PHASE_5_COMMERCE: false,
  PHASE_6_ADVERTISING: false,
};

/**
 * Call at the top of any future route handler.
 * @param {keyof BUILD_PHASES} phase
 * @returns {Response | null} 404 response if phase not yet active, null if OK to proceed.
 */
export function phaseGuard(phase) {
  if (!BUILD_PHASES[phase]) {
    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
