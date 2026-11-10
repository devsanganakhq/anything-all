# Heathland Links local release candidate — 10 November 2026

This is a TestFlight release candidate, not an approved public-store release. The source branch is `dev/heathland-20-requirements-20261110`, based on remote `fix/heathland-client-scope` at `8807430`; `local-baseline-20261110` preserves the fetched baseline. The October archive was not treated as current source. Two additive migrations have now been applied to the persistent, isolated Neon branch `heathland-release-20261019` (not production), and Vercel's `DATABASE_URL` scoped only to Preview branch `fix/heathland-client-scope` now points to that branch. Production Neon/Vercel configuration remains unchanged. GitHub push and a new Expo/Apple build are still pending.

Architecture: Expo SDK 54 / React Native mobile app in `mobile/src/app`; React Router 7 API and web app in `web/src/app`; PostgreSQL schema in `web/schema.sql` and `web/migrations`. This repository is not a Next.js app. The API uses server sessions, owner checks, friendship/block state, and SQL transaction helpers. Existing data and production credentials were not used for destructive testing.

| # | Client request | Local implementation and remaining verification |
|---|---|---|
| 1 | Passport privacy | Existing owner/friend/public server authorization retained; profile and favourites paths reviewed. Full direct-route permission matrix remains necessary. |
| 2 | 30-day reviews | Transactional per-user/course lock and server timestamp restriction; boundary and concurrent tests pass. |
| 3 | Rounds count | Passport green summary uses actual round count; deletion path updates source rows. |
| 4 | Testing elements | No new testing controls shipped; complete release-only UI/content audit remains open. |
| 5 | Feed privacy | Public feed and course activity/gallery now filter private and blocked users; notification filtering added. Comprehensive post-detail and push audit remains open. |
| 6 | Flags | Shared mapping adds New Zealand and consistent country identity. Unknown countries still use globe fallback; graphical coverage needs review. |
| 7 | Map pins | Invalid coordinates/IDs and rapid taps guarded. Root cause and Android/iOS device reproduction remain open. |
| 8 | Community images | Tap opens existing full-screen multi-image viewer. Pinch zoom, loading/error polish and device verification remain open. |
| 9 | Completion feed | Transactional list-completion event with deduplication; deletion revokes dependent event. Local DB integration tests pass. |
| 10 | List achievement | Additive awards table, backfill, revoke/reactivate, Passport statistics. Local migration integration tests pass. |
| 11 | Achievement shortcut | Passport collection route and authorized social-profile link added. Visual device QA remains. |
| 12 | Explore lists | Dedicated shortcut/list view and genuine distinct-starter sorting added. |
| 13 | Passport layout | Compact horizontal activity tabs and shortcuts added, but lower legacy sections still need design review on small devices. |
| 14 | NI/Hawaii flags | UK/USA parent-country identity retained; dedicated regional graphics remain open. Hawaii is not classified as sovereign. |
| 15 | Action buttons | Course actions and mark-played screen use review eligibility; backend cooldown enforced. Offline behavior and old-client direct round calls need review. |
| 16 | Grammar | Exact two category titles updated in backend and mobile shared definitions. |
| 17 | Lists/descriptions | Lists loading/empty and progress refined; neutral course-description fallback; admin-only description editor with audit persistence and test. Editorial review of source descriptions remains open. |
| 18 | Delete round | Owner-only DELETE API and confirmed mobile edit-screen action added; integration tested. |
| 19 | Deletion consistency | Transactionally reconcile played course, lists, awards, feed and aggregates, retaining course if another review/round exists; integration tests cover key scenarios. Legacy and ranking audit still needed. |
| 20 | Notifications | Block/privacy filters and read scope improved; server tests cover malformed/unauthorized writes. Real push and Paul test not performed. |

Verification to date (rerun 10 November): 39 web Vitest tests passed; web and mobile TypeScript checks passed; web build and Android/iOS JavaScript exports passed. The intentionally broken test-only route was removed; the web build now completes without that missing-export warning. Both additive migrations were first applied and rerun on disposable Neon child branch `release-preflight-20261110` (expires 17 November), then applied to persistent isolated release branch `heathland-release-20261019`. On the persistent branch, both migration records exist, the award backfill produced 1 active award, six lists are published, and both notification reference columns are present. Neon `production` was inspected read-only and remains unchanged. Vercel confirms the preview `DATABASE_URL` is scoped only to `fix/heathland-client-scope`; a new deployment is required before the setting takes effect. The successful Expo submission is build 9 / version 2.0.2 from commit `abc7394` (submitted 31 October), not this candidate. The exports are **not** native installable builds. No Android SDK, iOS/Xcode toolchain, simulators, or physical devices are available here. Native visual QA, push delivery, complete release acceptance, and a new installable candidate are therefore **not verified**.

Before release: finish open items above, inspect all production API authorization surfaces, test on both device platforms with an isolated backend, rehearse migrations on a production-schema snapshot, review editorial descriptions, run notification testing with Paul, build signed EAS candidates, obtain client approval, then separately authorize production migration/deployment/store submission. Never apply these SQL files directly to live production without backup and schema review.

Release-service checkpoint: GitHub PR #1 remains a draft on `fix/heathland-client-scope` at remote commit `8807430`, with 3/3 checks passing and no merge conflict. This candidate is local and has not yet been pushed. The Expo project configuration resolves to slug `anything`, bundle ID `com.heathlandlinks.app`, and EAS project ID `0571c258-6004-4ae8-9604-7463c9403e91`; the `client-testflight` profile targets the PR preview URL and App Store Connect app ID `6806807118`. The Expo submission page confirms build 9 / version 2.0.2 from `abc7394` was submitted successfully on 31 October; that is not this candidate, and Expo does not expose the current App Store Connect processing state or tester roster. No new EAS build or Apple upload has been made.
