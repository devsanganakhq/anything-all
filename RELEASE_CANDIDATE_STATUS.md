# Heathland Links release candidate — 13 November 2026

## Build for client testing

- **Version:** 2.0.3 (Android and iOS)
- **Branch:** `dev/heathland-20-requirements-20261110`
- **Profiles:** `client-preview` (Android APK) and `client-testflight` (iOS TestFlight)
- **Backend:** Vercel preview of this branch, database branch `heathland-release-20261019`. Production is not used by these builds.

## What changed since the 10 November candidate

**Sign-in and password reset (tester reports)**
- The preview backend's `AUTH_URL` pointed at production, so sign-in redirected to the wrong site (the "Signing in…" loop) and reset links opened on production (reported as "expired"). Fixed in Vercel.
- The native session is saved before Home opens; the token fallback runs inside the WebView; failed handoffs return to sign-in with a message. A golfer's name can no longer inject script into the sign-in page.
- iOS: a reinstalled app no longer restores an old session from the Keychain.

**Push notifications (#20)**
- Phones never registered for push: the app called `AbortSignal.timeout()`, which React Native does not provide, so the device token was never sent. Fixed. Firebase, Expo token issue and FCM delivery were each verified working.
- Duplicate notifications removed: every notification now has a dedupe key (likes, friend requests, community invites, join requests, joins).

**Client changes and testing findings**
- A round can be recorded before the first review; rounds stay available during the 30-day review cooldown, which the screen explains (#2, #15).
- Course actions on two rows so no label is clipped (B15).
- Deleting a round closes the editor cleanly (#18); achievements and milestone posts are withdrawn when deleted activity no longer qualifies, and awarded again on re-qualifying (#19).
- List reviews are hidden, not deleted, while a list is incomplete, and restored on re-completion.
- Photo viewer: pinch-zoom, double-tap zoom, solid background (#8); "No photos yet" on empty course galleries.
- Internal import notes no longer shown on curated lists (#4).
- Hollinwell (ENG-00169) club and course names corrected (B03). The England master workbook carries the same swap and should be corrected.
- Shared course, feed and list links open the app on Android (B05).

**Backend and database**
- 31 indexes for the feed, privacy checks, notifications, course pages and sign-in.
- `npm run migrate` applies migrations in order and refuses production hosts unless confirmed.
- API errors return JSON with real status codes instead of a 200 HTML page with a stack trace.

## Verified

- 59 automated web tests, web and mobile type checks, Android bundle build.
- Preview backend end to end: sign-up, sign-in (mixed-case email), session handoff, token fallback, authenticated APIs, 401 without a session, password reset, account deletion.
- On an Android emulator with the 13 Nov build: the client's change list item by item, with screenshots (`test-screenshots/TEST-REPORT.md` in the handover folder).

## Still open

- **#14:** dedicated Northern Ireland and Hawaii graphics (awaiting artwork).
- **B17:** the three Hollinwell test photos (IDs 28–30) are already removed; awaiting client confirmation.
- **Physical-device checks:** push delivery with the app closed, community images and mute, other golfers' private Passports, reset email delivery, large font sizes, iOS.

## Before production

1. Neon backup branch of `production`.
2. Run `npm run migrate` against production, including `20261113_list_review_hidden`, **before** promoting this code.
3. Merge into the release branch and deploy production through Git.
4. Add the Google Play app-signing SHA-256 to `ANDROID_SIGNING_CERT_SHA256` before the Play release.
