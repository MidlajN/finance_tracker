# Mobile Application

This directory contains the Expo React Native mobile client defined in `docs/mobile-architecture.md`.

The app uses Expo SDK 57, Expo Prebuild / Continuous Native Generation, TypeScript, React Navigation, Zustand, SQLite, Supabase and the shared platform packages.

## Commands

```sh
npm run start --workspace @finance/mobile
npm run android --workspace @finance/mobile
npm run mobile:prebuild:android
npm run mobile:android:assembleDebug
npm run mobile:android:bundleRelease
npm run release:android:check-env
npm run release:android:bundle
npm run typecheck --workspace @finance/mobile
npm run lint --workspace @finance/mobile
```

## Release Configuration

Production Supabase configuration and Android upload signing are provided by
environment variables. Copy `apps/mobile/.env.example` for local variable names,
but keep real production values and upload keystores outside Git.

The release bundle command validates the production environment before running
Expo Prebuild and generating the Android App Bundle.
