# FinAce — Personal Finance Platform

Offline-first personal finance platform. Monorepo with an Expo (React Native) Android app, a React web client, shared TypeScript packages, and a Supabase backend.

## Structure

- `apps/mobile` — Expo React Native mobile client (Android). Offline-first: local SQLite cache with a sync queue against Supabase. Includes a native notification-listener module (`apps/mobile/modules/finance-notification-listener`) that parses payment notifications (GPay, bank SMS-style alerts) into transaction events.
- `apps/web` — React + TypeScript + Vite web client.
- `packages/finance-core` — pure finance domain logic (budget windows, overviews, validation).
- `packages/parser` — payment-notification parsing.
- `packages/shared-types`, `packages/shared-api`, `packages/shared-utils` — shared contracts and utilities.
- `supabase` — database migrations and backend resources.
- `docs` — architecture, workflow and roadmap decisions.

## Prerequisites

- Node.js 20+ and npm (workspaces are used; install from the repo root only).
- A [Supabase](https://supabase.com) project (free tier works).
- [Supabase CLI](https://supabase.com/docs/guides/cli) — installed as a dev dependency, available via `npx supabase`.
- For the mobile app: Android SDK + JDK 17 (Android Studio is the easiest way to get both), and an emulator or a physical Android device with USB debugging.

## Setup

### 1. Install dependencies

```sh
npm install
```

### 2. Set up Supabase

Create a Supabase project, then link and push the migrations:

```sh
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies everything in `supabase/migrations` (schema, RLS policies, budget templates, etc.).

Grab your project URL and publishable (anon) key from the Supabase dashboard under **Project Settings → API**.

### 3. Configure environment variables

**Web** — create `apps/web/.env`:

```sh
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

**Mobile** — create `apps/mobile/.env`:

```sh
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

`.env` files are gitignored — never commit them.

## Running

### Web

From the repo root:

```sh
npm run dev
```

Other root scripts: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.

### Mobile (Android)

The app uses native modules, so Expo Go will not work — build the dev client:

```sh
npm run mobile:prebuild:android
npm run mobile:android:assembleDebug
```

The debug APK lands in `apps/mobile/android/app/build/outputs/apk/debug/`. Install it on an emulator or device:

```sh
adb install apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Then start the Metro dev server:

```sh
npm start --workspace @finance/mobile
```

Notes:

- `apps/mobile/android/local.properties` must point at your SDK, e.g. `sdk.dir=/Users/<you>/Library/Android/sdk`. `expo prebuild` may delete it; recreate if the build complains.
- Keep `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties` on Gradle 9.3.1 — `expo prebuild` may bump it to a version incompatible with the React Native Gradle plugin.
- To use notification-based transaction capture, grant the app Notification Access in Android settings when prompted.

## Release build & key signing (Android)

Release builds are signed via environment variables — no keystore or password ever lives in the repo.

### 1. Generate a keystore (one time)

```sh
mkdir -p ~/keystores
keytool -genkeypair -v \
  -keystore ~/keystores/finance-release.keystore \
  -alias finance-release \
  -keyalg RSA -keysize 2048 -validity 10000
```

Keep the keystore file and both passwords somewhere safe (password manager). Losing them means you can never update the app under the same signature. Keystore files (`*.keystore`, `*.jks`) are gitignored.

### 2. Export signing variables

```sh
export FINANCE_ANDROID_KEYSTORE_FILE=~/keystores/finance-release.keystore
export FINANCE_ANDROID_KEYSTORE_PASSWORD=<keystore-password>
export FINANCE_ANDROID_KEY_ALIAS=finance-release
export FINANCE_ANDROID_KEY_PASSWORD=<key-password>
```

The Gradle config reads these at build time (`apps/mobile/android/app/build.gradle`). All four must be set together — a partial set fails validation. If none are set, the release build falls back to the debug signing key (installable for local testing, not distributable).

### 3. Build the release bundle

From the repo root:

```sh
npm run release:android:bundle
```

This validates the environment (Supabase vars + complete signing set), runs `expo prebuild`, and produces a signed AAB at `apps/mobile/android/app/build/outputs/bundle/release/app-release.aab`.

To check the environment without building:

```sh
npm run release:android:check-env
```

## Tests

```sh
npm test
```

Runs workspace tests, including `packages/finance-core` budget-window tests and `packages/parser` notification-parsing tests (both use the built-in `node --test` runner).
