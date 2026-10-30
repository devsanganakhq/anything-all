# TestFlight signing checkpoint — 30 October 2026

- Remote release branch fetched and matched local base cf1aacb.
- Apple team G76V639A9J and bundle com.heathlandlinks.app verified.
- Push Notifications and Associated Domains enabled with user approval.
- APNs key N887Q6VKLC created with user approval and assigned in the client Expo project.
- Separate Distribution certificate 9A34YNC66U created with user approval; Cameron's certificate was not revoked.
- App Store profile DG685R7UN9 / UUID 776652fc-2db0-40d1-9c5e-1c0bfad22058 created and uploaded to EAS.
- Certificate, private key, profile certificate, team, bundle, production APNs entitlement and Associated Domains entitlement verified locally. Private keys and passwords are excluded from source control and EAS source archives.
- Release uses a separate production push entitlement file and the matching App Store profile. Debug entitlements remain development.
- EAS confirms all build credentials ready for @heathlandlinkss-team/heathland-links.
- 31 activity/auth/push backend tests and web typecheck pass. Mobile typecheck and Preview release readiness (six lists) passed earlier in this setup.

Use client-testflight for the isolated Preview backend. Native build, Apple upload, physical-device push/reset/functional acceptance and client delivery remain pending until separately verified. Signing setup does not prove push delivery or an error-free app.
