# Mobile Architecture

> Version: 1.0
>
> This document defines the architecture of the Mobile Client for the Personal Finance Platform.
>
> The Mobile Client is a first-class application within the platform. It is not a companion application or a wrapper around the web application.
>
> Its primary responsibilities are collecting financial events, operating offline, and providing a native mobile experience while sharing the same finance engine as every other client.

---

# Purpose

The Mobile Client provides the fastest way for users to interact with their financial information.

Unlike the Web Client, the Mobile Client has access to native Android capabilities such as:

- Notification Listener
- Background Services
- SQLite
- Biometrics
- Secure Storage
- File System
- Camera (future)

The Mobile Client is responsible for exposing these platform capabilities to the Finance Engine.

---

# Goals

The Mobile Client should:

- Feel like a native Android application.
- Operate without internet connectivity.
- Synchronize automatically.
- Share business logic with the Web Client.
- Never duplicate financial intelligence.
- Never bypass the Finance Engine.

---

# Technology Stack

Framework

- React Native

Language

- TypeScript

State Management

- Zustand

Navigation

- React Navigation

Local Database

- SQLite

Authentication

- Supabase Authentication

Synchronization

- Supabase

Native Android

- Notification Listener Service
- Foreground Services
- Secure Storage
- Biometrics

---

# Responsibilities

The Mobile Client owns:

- Native Android capabilities
- Mobile user interface
- Offline storage
- Local synchronization queue
- Authentication
- Background synchronization

The Mobile Client does NOT own:

- Rule Engine
- Merchant Intelligence
- Budget calculations
- Reports
- Dashboard calculations
- Financial analytics

Those belong to the Finance Engine.

---

# High-Level Architecture

```
React Native UI

↓

Feature Screens

↓

Stores

↓

Services

↓

Repositories

↓

Finance Core

↓

SQLite

↓

Synchronization

↓

Supabase
```

---

# Application Structure

```
mobile/

src/

components/

features/

navigation/

stores/

services/

repositories/

hooks/

lib/

utils/

native/

types/
```

The Mobile Client mirrors the architectural principles of the Web Client while remaining optimized for mobile interaction.

---

# Navigation

Navigation should remain simple.

```
Authentication

↓

Dashboard

↓

Transactions

↓

Events

↓

Budgets

↓

Reports

↓

Settings
```

The navigation hierarchy should remain shallow.

Avoid deeply nested navigation structures.

---

# Feature Responsibilities

## Dashboard

Provides a summary of financial health.

Displays:

- Balance
- Income
- Expenses
- Budgets
- Recent Transactions

Dashboard never calculates business logic.

---

## Events

Displays pending Financial Events.

Allows:

- Review
- Confirmation
- Ignore
- Editing

Confirmation follows the same pipeline as the Web Client.

---

## Transactions

Displays confirmed Transactions.

Allows:

- View
- Edit
- Search

Transaction editing must synchronize Financial Events when necessary.

---

## Budgets

Displays:

- Monthly budgets
- Progress
- Remaining balance

Budget calculations remain inside the Finance Engine.

---

## Reports

Displays generated reports.

Report generation belongs to shared business logic.

---

# Notification Listener

The Notification Listener is a native Android component.

Responsibilities:

- Listen for notifications.
- Forward notification payloads to the parser.
- Never evaluate financial rules.
- Never communicate directly with Supabase.

Notification processing continues through the Finance Engine.

---

# Notification Flow

```
Android Notification

↓

Notification Listener

↓

Notification Parser

↓

Parsed Financial Event

↓

Finance Engine

↓

Financial Event
```

The Mobile Client never creates Transactions directly.

---

# Local Storage

SQLite is the local source of cached data.

Local storage exists to provide:

- Offline access
- Fast loading
- Synchronization queue
- Notification persistence

SQLite is not the permanent source of truth.

Supabase remains authoritative.

---

# Offline Architecture

```
Notification

↓

SQLite

↓

React Native UI

↓

Sync Queue

↓

Supabase
```

The user should never lose data because of connectivity.

---

# Synchronization

Synchronization should happen automatically.

The Mobile Client should:

- Detect connectivity.
- Retry failed synchronization.
- Preserve ordering.
- Avoid duplicate uploads.
- Recover automatically.

Synchronization logic is defined in:

```
docs/sync-architecture.md
```

---

# Authentication

Authentication is shared across the platform.

The Mobile Client uses:

- Supabase Authentication

Supported authentication methods:

- Email
- Magic Link
- OAuth (future)

Authentication should remain independent of synchronization.

---

# Native Modules

Native modules expose Android capabilities.

Examples:

Notification Listener

SQLite

Biometrics

Secure Storage

Background Services

Permissions

These modules should expose TypeScript interfaces.

Business logic should never exist inside native modules.

---

# Permissions

Permissions should be requested only when required.

Examples:

Notification Access

Storage

Camera (future)

Location (future if required)

Permission handling should remain isolated from business logic.

---

# Background Processing

Background work includes:

- Synchronization
- Notification collection
- Retry queue
- Cleanup

Background work should not modify financial business rules.

---

# Local Queue

Synchronization should use a durable queue.

```
Create Event

↓

Queue

↓

Upload

↓

Confirmed

↓

Remove From Queue
```

Failed uploads remain queued until successfully synchronized.

---

# Error Handling

Errors should be categorized.

Examples:

Authentication

Network

Synchronization

Permission

Storage

Unknown

The UI should display meaningful errors without exposing implementation details.

---

# Performance

The Mobile Client should prioritize:

- Fast startup
- Minimal battery usage
- Efficient synchronization
- Responsive scrolling
- Offline responsiveness

Avoid unnecessary background work.

---

# Security

The Mobile Client should:

- Store authentication securely.
- Protect local storage.
- Never expose sensitive data in logs.
- Validate synchronization responses.
- Use encrypted communication.

Financial information should remain protected at all times.

---

# Future Native Features

The architecture should support future native capabilities.

Examples:

- OCR Receipts
- Barcode Scanner
- NFC Payments
- Home Screen Widgets
- Push Notifications
- Wear OS Integration

These additions should integrate through the existing architecture without introducing parallel business logic.

---

# Relationship to Other Documents

This document defines the Mobile Client.

Related documents:

- `platform.md`
- `architecture.md`
- `monorepo.md`
- `shared-packages.md`
- `notification-pipeline.md`
- `sync-architecture.md`
- `api-contract.md`
- `database.md`

Together these documents define how the Mobile Client integrates into the Personal Finance Platform while remaining a native application built on the same deterministic finance engine as every other client.