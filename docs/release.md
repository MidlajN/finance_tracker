# Release Strategy

> Version: 1.0
>
> This document defines the production release strategy for the Personal Finance Platform.

---

# Philosophy

Production releases must be reproducible.

No release step should rely on undocumented manual procedures.

---

# Android Distribution

Platform:

- Google Play Store

Application:

- Personal Finance Platform

Minimum Android Version:

- As defined by the current React Native / Expo SDK support.

---

# Release Signing

Signing Strategy:

- Play App Signing

The Android App Bundle (.aab) is uploaded to Google Play.

Google Play manages the final distribution signing key.

The upload keystore remains owned by the project owner.

Never commit signing credentials into the repository.

---

# Secrets

Secrets must never exist inside Git.

Examples:

- Upload keystore
- Keystore password
- Key alias
- Key password
- Supabase production keys
- Play Store credentials

Use environment variables or CI secrets.

Production mobile configuration:

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Android upload signing configuration:

```
FINANCE_ANDROID_KEYSTORE_FILE
FINANCE_ANDROID_KEYSTORE_PASSWORD
FINANCE_ANDROID_KEY_ALIAS
FINANCE_ANDROID_KEY_PASSWORD
```

The upload keystore file path points to a file supplied by the local shell or
CI runtime. The keystore itself must not be committed.

---

# Build Artifact

Production artifact:

```
Android App Bundle (.aab)
```

Debug APKs are development artifacts only.

Repository command:

```
npm run release:android:bundle
```

This validates release environment variables, runs Expo Prebuild for Android
and generates the release Android App Bundle.

---

# Release Workflow

Developer

↓

Build Verification

↓

Lint

↓

TypeScript

↓

Android Build

↓

Generate Release AAB

↓

Internal Testing

↓

Production Release

---

# Quality Gates

Before every release:

- TypeScript passes
- Lint passes
- Build passes
- Android release build succeeds
- Offline mode verified
- Synchronization verified
- Notification Listener verified
- Authentication verified

---

# Store Assets

Required:

- Application Icon
- Feature Graphic
- Phone Screenshots
- Privacy Policy
- Application Description

---

# Versioning

Versioning follows Semantic Versioning.

Examples:

1.0.0

1.1.0

2.0.0

---

# CI

Future releases should be automated.

Preferred pipeline:

GitHub Actions

↓

Android Release Build

↓

Artifact Generation

↓

Internal Testing

↓

Production Release

Implemented repository workflow:

```
.github/workflows/android-release.yml
```

The workflow performs TypeScript, lint and build checks, generates the Android
project with Expo Prebuild, builds the release Android App Bundle and uploads
the `.aab` as a workflow artifact. It reads production configuration and upload
signing material from GitHub Actions secrets only.

---

# Repository Rule

Release assets must never be committed.

Only source code belongs in the repository.

Signing credentials remain external.
