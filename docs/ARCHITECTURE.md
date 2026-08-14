# Heathland Links — Commercial Architecture Reference

> **Internal document. Not customer-facing. Last updated: 2026-07-24.**
>
> All commercial tables exist in the database but are empty.
> No customer-facing screens, booking flows, payment processors or
> ad-serving logic have been built yet. This document describes where
> they will connect and in which phase they will be built.

---

## Build Phases

| Phase | Name | Status |
|-------|------|--------|
| 0 | Core app — users, courses, feed, communities, social | ✅ Live |
| 1 | Schema reserved — all 22 commercial tables created, empty | ✅ Done |
| 2 | Club operators — claimed profiles, subscriptions, admin panel | ⬜ Not started |
| 3 | Club content — club feed posts, tee time offers, promoted posts | ⬜ Not started |
| 4 | Travel — itineraries, hotels, restaurants, transport partners | ⬜ Not started |
| 5 | Commerce — merchandise, orders, Stripe integration | ⬜ Not started |
| 6 | Advertising — campaigns, promoted post serving, analytics | ⬜ Not started |

---

## Entity Relationship Overview

```
users ──────────────────────────────────────────────────────────────────────┐
│                                                                            │
├── advertiser_accounts ─────────────────────────────────────────────────┐  │
│      └── sponsorship_campaigns ──┬── communities (existing)            │  │
│                                  ├── courses (existing)                │  │
│                                  └── claimed_club_profiles             │  │
│                                                                         │  │
├── claimed_club_profiles ◄── courses (existing)                         │  │
│      │                                                                  │  │
│      ├── club_subscriptions ──► subscription_packages                  │  │
│      │                                                                  │  │
│      ├── club_feed_posts ──► feed_posts (existing, set on publish)     │  │
│      │      └── promoted_posts ◄── advertiser_accounts                 │  │
│      │                                                                  │  │
│      ├── tee_time_offers ──► courses (existing)                       │  │
│      │                                                                  │  │
│      └── merchandise_products                                           │  │
│                                                                         │  │
├── orders ──── order_items ─┬── merchandise_products                    │  │
│      │                     ├── tee_time_offers                         │  │
│      │                     └── travel_itineraries                      │  │
│      └── commissions ──┬── affiliate_links                             │  │
│                         └── claimed_club_profiles                      │  │
│                                                                         │  │
├── travel_itineraries ─────────────────────────────────────────────────┘   │
│      ├── itinerary_courses ──► courses (existing)                          │
│      ├── itinerary_hotels ──► hotels ──► courses                           │
│      ├── itinerary_restaurants ──► restaurants ──► courses                 │
│      └── itinerary_transport ──► transport_partners                        │
│                                                                            │
└── user_saved_itineraries ──► travel_itineraries ─────────────────────────┘

hotels ──────────► courses.id  (nearest_course_id)
restaurants ──────► courses.id  (nearest_course_id)
affiliate_links ──► [courses | hotels | restaurants |
                     transport_partners | merchandise_products]  (polymorphic)
```

---

## All Commercial Tables

### Phase 2 — Club Operators

#### `advertiser_accounts`
An organisation approved to run paid promotions.

| Column | Type | FK | Notes |
|---|---|---|---|
| `user_id` | integer | `users.id` | Account owner. One user may own multiple accounts |
| `business_type` | text | — | `golf_club` / `brand` / `travel` / `media` / `other` |
| `status` | text | — | `pending` → `approved` → `suspended` / `closed` |
| `billing_address` | jsonb | — | Reserved for Stripe billing address |
| `approved_at` | timestamptz | — | |

Connects to: `sponsorship_campaigns`, `promoted_posts`, `commissions`, `claimed_club_profiles`

---

#### `claimed_club_profiles`
A golf club operator's verified presence on the platform.

| Column | Type | FK | Notes |
|---|---|---|---|
| `course_id` | integer | `courses.id` | The existing course record. Nullable until matched |
| `owner_user_id` | integer | `users.id` | The operator/admin user who claimed the profile |
| `advertiser_account_id` | integer | `advertiser_accounts.id` | Set if club also advertises |
| `slug` | text unique | — | URL-safe ID e.g. `hollinwell-golf-club` |
| `claim_status` | text | — | `pending` → `approved` (staff-reviewed) |
| `verified_by_user_id` | integer | `users.id` | Internal staff member |

**Integration with existing system:**
- Course detail page checks for a `claimed_club_profiles` row matching `course_id`. If found and `claim_status = 'approved'`, renders the club's branding, posts and tee times.
- `user_club_memberships.club_id` → `courses.id`. The membership FK is already valid when a club is claimed — no migration needed.
- The `follows` table (followee_type = 'club') will point to `claimed_club_profiles.id` once Phase 2 launches.

---

#### `subscription_packages`
The tier catalogue. No FKs — pure configuration table.

| Column | Type | Notes |
|---|---|---|
| `slug` | text unique | e.g. `club-basic`, `club-pro`, `club-premium` |
| `price_pence` | integer | 0 = free tier. Stored in GBP pence |
| `billing_period` | text | `monthly` / `annual` / `one_off` |
| `features` | jsonb | Array of feature key strings |
| `max_feed_posts` | integer | NULL = unlimited |
| `max_products` | integer | NULL = unlimited |
| `promoted_posts_included` | integer | Monthly allowance |

---

#### `club_subscriptions`
One row per claimed club. Tracks the active subscription tier.

| Column | Type | FK | Notes |
|---|---|---|---|
| `club_profile_id` | integer unique | `claimed_club_profiles.id` | One subscription per club (UNIQUE) |
| `package_id` | integer | `subscription_packages.id` | |
| `status` | text | — | `trial` → `active` → `past_due` / `cancelled` |
| `external_subscription_id` | text | — | Reserved: Stripe subscription ID |
| `external_customer_id` | text | — | Reserved: Stripe customer ID |

---

### Phase 3 — Club Content

#### `club_feed_posts`
Drafts and published posts authored by club operators.

| Column | Type | FK | Notes |
|---|---|---|---|
| `club_profile_id` | integer | `claimed_club_profiles.id` | Author |
| `feed_post_id` | integer | `feed_posts.id` | Set **on publish**. NULL while draft |
| `post_type` | text | — | `news` / `event` / `offer` / `update` / `competition` / `course_condition` |
| `course_id` | integer | `courses.id` | Optional course context |
| `community_id` | integer | `communities.id` | Optional cross-post to a community |
| `is_promoted` | boolean | — | True if a `promoted_posts` row exists |
| `scheduled_for` | timestamptz | — | Reserved for scheduled publishing |

**Integration with existing feed:**
- On publish: create `feed_posts` row with `post_type = 'club_update'` and `author_id = club.owner_user_id`. Set `club_feed_posts.feed_post_id`.
- Club posts can be reacted to / commented on via existing `feed_reactions` and `feed_comments` tables — no schema changes needed.
- The main feed query (`GET /api/feed`) needs one additional `UNION` or `JOIN` to include `club_update` posts. See integration checklist below.

---

#### `promoted_posts`
Paid promotion overlay on any feed or club post.

| Column | Type | FK | Notes |
|---|---|---|---|
| `feed_post_id` | integer | `feed_posts.id` | Must set one of these two |
| `club_feed_post_id` | integer | `club_feed_posts.id` | Must set one of these two |
| `advertiser_account_id` | integer | `advertiser_accounts.id` | |
| `campaign_id` | integer | `sponsorship_campaigns.id` | Optional parent campaign |
| `budget_pence` | integer | — | Total budget allocated |
| `spend_pence` | integer | — | Running total (incremented by ad engine) |
| `impression_count` | integer | — | Incremented by ad-serving layer (Phase 6) |
| `click_count` | integer | — | Incremented by redirect endpoint (Phase 6) |
| `target_audience` | jsonb | — | e.g. `{"region":"Scotland","handicap_max":18}` |

**Feed injection (Phase 6):**
The main feed query will inject one promoted post per 8 organic posts (configurable via `FEED_PROMOTION_CADENCE` in `commercialSchema.js`). Promoted posts render identically to regular posts with a small platform label. No ad-serving logic exists yet.

---

#### `tee_time_offers`
Discounted or featured tee time slots from claimed clubs.

| Column | Type | FK | Notes |
|---|---|---|---|
| `club_profile_id` | integer | `claimed_club_profiles.id` | |
| `course_id` | integer | `courses.id` | The course the tee time is on |
| `price_pence` | integer | — | NULL = price on request |
| `original_price_pence` | integer | — | For strikethrough/savings display |
| `available_times` | jsonb | — | Array e.g. `["08:00","09:30","11:00"]` |
| `available_days` | text[] | — | e.g. `["mon","tue","wed"]` |
| `booking_url` | text | — | External link (pre-integration) |
| `booking_reference` | text | — | Reserved: internal booking reference |

**Integration with existing system:**
- Course detail screen renders a tee time offers section when `is_active = true` rows exist for `course_id`.
- In Phase 5, `orders` + `order_items` (type `tee_time_offer`) replace the `booking_url` redirect.

---

### Phase 4 — Travel

#### `hotels`
Accommodation partners linked to nearby courses.

| Column | Type | FK | Notes |
|---|---|---|---|
| `nearest_course_id` | integer | `courses.id` | Drives "Where to stay" on course detail page |
| `affiliate_link_id` | integer | `affiliate_links.id` | Commission tracking |
| `is_partner` | boolean | — | Formal partner vs. listed-only |
| `booking_url` | text | — | Direct or affiliate booking URL (pre-integration) |
| `price_from_pence` | integer | — | Per-night guide price |

---

#### `restaurants`
Dining partners linked to nearby courses.

| Column | Type | FK | Notes |
|---|---|---|---|
| `nearest_course_id` | integer | `courses.id` | Drives "Where to eat" on course detail page |
| `price_band` | integer | — | 1 (budget) – 4 (fine dining) |
| `affiliate_link_id` | integer | `affiliate_links.id` | |

---

#### `transport_partners`
Chauffeur, shuttle, hire car and transfer providers.

| Column | Type | Notes |
|---|---|---|
| `partner_type` | text | `chauffeur` / `shuttle` / `taxi` / `hire_car` / `coach` / `other` |
| `coverage_region` | text | e.g. "Scottish Highlands", "Wirral & Cheshire" |
| `affiliate_link_id` | integer | Commission tracking |

---

#### `travel_itineraries` + join tables
Multi-day golf trip packages.

| Column | Type | FK | Notes |
|---|---|---|---|
| `created_by_user_id` | integer | `users.id` | NULL for platform-curated trips |
| `is_curated` | boolean | — | TRUE = staff-created package |
| `price_from_pence` | integer | — | Guide price for the full package |
| `saved_count` | integer | — | Driven by `user_saved_itineraries` |

**Composed via:**

| Join table | From | To |
|---|---|---|
| `itinerary_courses` | `travel_itineraries` | `courses` (rounds of golf) |
| `itinerary_hotels` | `travel_itineraries` | `hotels` (nights) |
| `itinerary_restaurants` | `travel_itineraries` | `restaurants` (meals) |
| `itinerary_transport` | `travel_itineraries` | `transport_partners` (transfers) |
| `user_saved_itineraries` | `users` | `travel_itineraries` (bookmarks) |

---

### Phase 5 — Commerce

#### `merchandise_products`
Products listed by claimed clubs.

| Column | Type | Notes |
|---|---|---|
| `price_pence` | integer | GBP pence |
| `compare_price_pence` | integer | RRP for sale display |
| `product_type` | text | `apparel` / `equipment` / `accessories` / `gift` / `digital` / `other` |
| `external_product_url` | text | Club's own shop link (pre-integration) |
| `stock_quantity` | integer | NULL = unlimited |

---

#### `orders` + `order_items`
Purchase transactions. `orders` is the top-level record; `order_items` are line items.

`item_type` is polymorphic:

| `item_type` | Resolves to |
|---|---|
| `merchandise_product` | `merchandise_products.id` |
| `tee_time_offer` | `tee_time_offers.id` |
| `travel_itinerary` | `travel_itineraries.id` |

`item_name` and `unit_price_pence` are **denormalised** — preserved in perpetuity even if the product is later edited or deleted.

Reserved for Stripe:
- `orders.external_order_id` → Payment Intent ID
- `orders.external_payment_id` → Charge ID

---

#### `affiliate_links`
Trackable outbound links. Polymorphic — `target_entity_type` + `target_entity_id` resolve to any partner entity.

| `target_entity_type` | Resolves to table |
|---|---|
| `course` | `courses` |
| `hotel` | `hotels` |
| `restaurant` | `restaurants` |
| `transport` | `transport_partners` |
| `merchandise` | `merchandise_products` |
| `external` | External URL only |

The redirect endpoint (`GET /api/affiliates/[slug]/redirect`) will:
1. Increment `click_count`
2. Insert a `commissions` row if applicable
3. 302 redirect to `target_url`

---

#### `commissions`
Revenue-share ledger. Every row traces back to an order, a click, or ad spend.

| `commission_type` | Triggered by |
|---|---|
| `affiliate` | `affiliate_link_id` click |
| `club_sale` | `order_id` involving a club's product |
| `platform_fee` | `order_id` platform service fee |
| `promotion_spend` | `advertiser_account_id` ad campaign spend |

Status flow: `pending` → `approved` → `paid`. Settlement deferred to Phase 5.

---

### Phase 6 — Advertising

#### `sponsorship_campaigns`
Groups promoted posts under a single budget and targeting strategy.

| Column | Type | FK | Notes |
|---|---|---|---|
| `advertiser_account_id` | integer | `advertiser_accounts.id` | Funder |
| `community_id` | integer | `communities.id` | Optional: scoped to a community |
| `course_id` | integer | `courses.id` | Optional: scoped to a course |
| `club_profile_id` | integer | `claimed_club_profiles.id` | Optional: run on behalf of a club |
| `campaign_type` | text | — | `community_sponsor` / `feed_promotion` / `course_partner` / `featured_club` / `travel_partner` |
| `target_audience` | jsonb | — | e.g. `{"region":"Scotland","handicap_max":18,"course_type":"links"}` |
| `budget_pence_total` | integer | — | Total campaign budget |
| `budget_pence_spent` | integer | — | Running spend total |

**Integration with existing system:**
- `community_sponsor` → attaches to `communities.id`. Community header renders sponsor branding when `status = 'active'`.
- `course_partner` → attaches to `courses.id`. Course detail screen renders partner branding.
- `feed_promotion` → groups `promoted_posts` under a single budget. The feed injection cadence applies.

---

## Reserved API Namespaces

These route paths do **not yet exist**. They are reserved here to avoid collisions.

| Prefix | Phase | Planned routes |
|---|---|---|
| `/api/club/` | 2–3 | claim, profile, admin, subscription, posts, tee-times, products |
| `/api/advertiser/` | 2 | account management |
| `/api/promote/` | 3 | create and manage promoted posts |
| `/api/travel/` | 4 | itineraries, hotels, restaurants, transport |
| `/api/orders/` | 5 | create, list, detail |
| `/api/affiliates/` | 5 | list, redirect (click tracking) |
| `/api/commissions/` | 5 | list, settle |
| `/api/campaigns/` | 6 | create, list, manage, analytics |

---

## Integration Checklist

Specific files that will need changes as each phase ships:

### Course detail — `/apps/mobile/src/app/course/[id].jsx`
- [ ] **Phase 2** Show claimed club profile badge if `claimed_club_profiles.course_id` matches and is approved
- [ ] **Phase 3** Render club's tee time offers from `tee_time_offers WHERE course_id = ? AND is_active = true`
- [ ] **Phase 3** Render club's recent posts from `club_feed_posts WHERE course_id = ? AND is_published = true`
- [ ] **Phase 4** Render nearby hotels from `hotels WHERE nearest_course_id = ? AND is_active = true`
- [ ] **Phase 4** Render nearby restaurants from `restaurants WHERE nearest_course_id = ? AND is_active = true`
- [ ] **Phase 5** Link to merchandise from `merchandise_products WHERE club_profile_id = ? AND is_active = true`

### Main feed API — `/apps/web/src/app/api/feed/route.js`
- [ ] **Phase 3** Add `club_update` to the feed query (LEFT JOIN `club_feed_posts` via `feed_post_id`)
- [ ] **Phase 6** Inject one `promoted_posts` row per `FEED_PROMOTION_CADENCE` (8) organic posts

### Community screens — `/apps/mobile/src/app/communities/[id].jsx`
- [ ] **Phase 6** Render sponsor branding when `sponsorship_campaigns.community_id` matches and `status = 'active'`

### User profile — `/apps/mobile/src/app/(tabs)/profile.jsx`
- [ ] **Phase 4** Add "Saved Trips" section from `user_saved_itineraries`
- [ ] **Phase 5** Add "Order History" section from `orders WHERE user_id = ? ORDER BY created_at DESC`

### Notifications — `/apps/web/src/app/api/user/notifications/route.js`
- [ ] **Phase 3** Add `club_post` and `tee_time_offer` notification types to the CHECK constraint

### Follows — `follows` table
- [ ] **Phase 2** `followee_type = 'club'` already exists in the constraint. `followee_id` will point to `claimed_club_profiles.id` once Phase 2 launches.

---

## Conventions

| Convention | Rule |
|---|---|
| Money | All amounts stored as `INTEGER` in **pence** (GBP default). Display with `penceToDisplay()` in `commercialSchema.js` |
| Polymorphic FKs | Use `_type` + `_id` pairs. Always filter by `_type` before joining. Never create a JOIN without the type filter |
| Draft/publish | All club-authored content starts `is_published = false` or `is_active = false`. A deliberate publish action creates or updates the corresponding public record |
| Privacy defaults | New commercial content defaults private. Nothing appears to users until explicitly activated by staff or operator |
| Verification | `verified_status = false` on memberships; `claim_status != 'approved'` on club profiles. Neither shows as verified by default |
| Phase guard | Import `phaseGuard()` from `commercialSchema.js` at the top of any route handler in an unbuilt phase. Returns HTTP 404 automatically when the phase flag is `false` |
| Denormalisation | `order_items.item_name` and `unit_price_pence` are always copied at order time. Never JOIN back to the product at display time for historical orders |
| IDs | All tables use `SERIAL PRIMARY KEY`. No UUIDs yet — add when multi-region is needed |
