# Heathland Links release candidate — 10 November 2026

## Current state

PR #3, “Heathland Links: November 10 release candidate and release gates,” is open as a draft from `dev/heathland-20-requirements-20261110` into `fix/heathland-client-scope`. It contains 41 changed files and is not merged into `main`. The PR branch's Vercel deployment is shown as Preview and Ready. The current commit status reports Vercel success; no GitHub Actions run was found. The release candidate has not been accepted as a final store build.

The PR adds two November migrations and a release-health gate. The source history records rehearsal and application on isolated Neon branches; production remains explicitly out of scope and must remain unchanged. Before any release, re-verify the isolated database identity, migration records, six-list readiness, and endpoint response against the deployed Preview.

## Client request coverage

| # | Request | Source changes in candidate | Remaining work |
|---|---|---|---|
| 1 | Passport privacy | Owner/friend/public authorization paths retained and profile/favourites flows reviewed. | Full direct-link/API matrix: owner, public visitor, accepted/pending friend, non-friend, blocked user. |
| 2 | 30-day review cooldown | Server timestamp and transactional per-user/course restriction. | Recheck boundary and concurrent requests in deployed integration environment. |
| 3 | Passport rounds count | Real round total shown and sourced from records. | Verify after add/edit/delete on devices. |
| 4 | Remove test elements | No new testing controls added; obsolete test-only routes removed. | Complete production UI/content audit. |
| 5 | Feed privacy | Public feed, course activity/gallery, and notification visibility filters updated. | Audit post details, privacy changes, blocks, and push payloads end to end. |
| 6 | Country flags | Shared mapping includes New Zealand and common countries; unknowns use globe fallback. | Review graphical coverage across all screens. |
| 7 | Map pins | Invalid coordinates/IDs and rapid repeated taps guarded. | Reproduce and verify on Android and iOS; confirm crash root cause. |
| 8 | Community images | Tap opens existing full-screen multi-image viewer. | Zoom, loading/failure polish, and Android/iOS QA. |
| 9 | List completion feed | Transactional, deduplicated completion activity; reversal removes dependent event. | End-to-end device flow. |
| 10 | List achievements | Additive awards table, backfill, revoke/reactivate, Passport stats. | Rehearse against production-schema snapshot and verify eligibility. |
| 11 | Passport achievements shortcut | Collection route and authorized social-profile link. | Visual and privacy QA on devices. |
| 12 | Explore lists | Dedicated shortcut/view and distinct-starter sorting. | Device navigation QA. |
| 13 | Passport layout | Compact horizontal activity tabs and shortcuts. | Review lower legacy sections and small-phone layout. |
| 14 | Northern Ireland/Hawaii flags | Correct UK/USA parent-country identity; Hawaii is not treated as sovereign. | Dedicated regional graphics remain outstanding. |
| 15 | Course actions | Review eligibility shown in course/mark-played actions; backend cooldown enforced. | Check offline behavior and older-client direct round calls. |
| 16 | Exact grammar | Requested category wording updated in backend/mobile definitions. | Final editorial check. |
| 17 | Lists/descriptions | Loading/empty/progress polish, neutral fallback, audited admin editor. | Review course descriptions for factual accuracy. |
| 18 | Delete round | Owner-only API and confirmed mobile delete action. | Device flow and error handling. |
| 19 | Deletion consistency | Reconciles played courses, lists, awards, feed, and aggregates while retaining other valid activity. | Audit legacy records and ranking dependencies. |
| 20 | Notifications | Privacy/block/read-scope changes and malformed/unauthorized-write tests. | Verify real push delivery and complete the planned test with Paul. |

## Validation recorded

The local candidate status reports 39 web tests, web/mobile TypeScript checks, web build, and Android/iOS JavaScript exports passing on 10 November. Those checks were not rerun after the final release-health gate patch; CI has not reported a GitHub Actions run for the PR head. The Vercel Preview check is Ready. Confirm its database target and verify the endpoint returns `ready: true`, `lists: 6`, and `feature_set: heathland-20261110` before relying on that deployment.

The successful TestFlight build 9 / version 2.0.2 came from older source, not this candidate. No new signed installable Android or iOS build, physical-device acceptance, real push test, or client acceptance is recorded. JavaScript exports are not native installable builds.

## Remaining release gates

- Complete the device, privacy, map, image, deletion, notification, and editorial checks above.
- Independently rehearse migrations on a production-schema snapshot and verify the isolated Preview backend and recovery path.
- Build signed Android and iOS candidates from the reviewed PR source; install and test them, then obtain client acceptance.
- Keep PR #3 in draft until reviewers decide it is ready. Do not merge this release into `main`, run production migrations, deploy production, or submit a store build as part of this checkpoint.

No claim of bug-free behavior or final release readiness is made.
