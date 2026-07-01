# Personal Finance Platform

This repository contains the Personal Finance Platform monorepo.

## Structure

- `apps/web` contains the existing React, TypeScript and Vite web client.
- `apps/mobile` is the reserved application boundary for the future React Native client.
- `packages` contains shared platform packages for finance logic, contracts, API models, utilities and parsers.
- `supabase` contains database migrations and backend resources.
- `docs` is the single source of truth for architecture, workflow and roadmap decisions.

## Commands

Run the web application from the repository root:

```sh
npm run dev
npm run build
npm run typecheck
npm run lint
```
