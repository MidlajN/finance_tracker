# Synchronization Architecture

> Version: 1.0
>
> This document defines how every client synchronizes financial data with the Personal Finance Platform.
>
> Synchronization must be deterministic, reliable, offline-capable, and transparent to the user.
>
> Every client must follow this architecture.

---

# Purpose

Synchronization ensures that every client observes the same financial state while allowing each client to continue operating when connectivity is unavailable.

The synchronization system is responsible for:

- Offline operation
- Reliable uploads
- Reliable downloads
- Conflict handling
- Retry
- Data consistency

Synchronization is infrastructure.

It must never contain business logic.

---

# Design Principles

Synchronization should always be:

- Offline First
- Eventually Consistent
- Deterministic
- Idempotent
- Secure
- Observable

Business logic must never depend on synchronization state.

---

# High-Level Flow

```
User Action

↓

Local Storage

↓

Sync Queue

↓

Synchronization Service

↓

Supabase

↓

Realtime Events

↓

Other Clients

↓

Local Database
```

Every client follows the same flow.

---

# Offline First

Clients should always write to local storage first.

Never block user interaction waiting for network requests.

```
User

↓

SQLite

↓

UI Updated

↓

Queue

↓

Upload

↓

Server
```

The user should never notice whether synchronization is online or offline.

---

# Source of Truth

The authoritative data source is:

```
Supabase
```

Local databases are caches with pending synchronization support.

Clients may rebuild local storage entirely from the server if necessary.

---

# Local Database

Each client maintains its own local database.

Responsibilities:

- Offline access
- Fast startup
- Cached queries
- Pending synchronization
- Retry queue

Local storage should mirror the server schema whenever practical.

---

# Synchronization Queue

Every client maintains a durable synchronization queue.

Queue items represent pending operations.

Example operations:

- Create Financial Event
- Update Financial Event
- Confirm Event
- Ignore Event
- Create Merchant
- Update Merchant
- Update Transaction
- Create Budget

Queue items remain until acknowledged by the server.

---

# Queue Processing

Synchronization follows this sequence.

```
Queue Item

↓

Validate

↓

Upload

↓

Server Response

↓

Success

↓

Remove Queue Item
```

If upload fails:

```
Retry
```

---

# Retry Strategy

Synchronization failures should never discard data.

Recommended strategy:

```
Attempt 1

↓

Attempt 2

↓

Attempt 3

↓

Exponential Backoff

↓

Network Restored

↓

Retry
```

Permanent failures should be surfaced to the user.

Temporary failures should retry automatically.

---

# Synchronization States

Each queue item should expose a synchronization state.

Possible states:

- Pending
- Uploading
- Synced
- Failed
- Retrying

Applications should render synchronization status when appropriate.

---

# Upload Flow

```
Financial Event

↓

Queue

↓

Upload

↓

Supabase

↓

Acknowledgement

↓

Mark Synced
```

Uploads should be transactional whenever possible.

---

# Download Flow

```
Supabase

↓

Realtime Event

↓

Synchronization Service

↓

Local Database

↓

UI Refresh
```

Clients should not poll continuously when realtime updates are available.

---

# Realtime Updates

Supabase Realtime is responsible for distributing server-side changes.

Clients subscribe to:

- Financial Events
- Transactions
- Merchants
- Categories
- Budgets
- Rules

Realtime events update the local database.

---

# Conflict Resolution

The synchronization layer should detect conflicting updates.

Conflicts should be resolved predictably.

General policy:

- Server remains authoritative.
- User modifications should never be silently discarded.
- Business rules should never execute twice.

Complex conflicts may require user intervention.

---

# Idempotency

Synchronization operations must be safe to repeat.

Duplicate uploads should not create duplicate records.

Operations should include stable identifiers whenever possible.

Examples:

- UUIDs
- Event IDs
- Queue IDs

---

# Ordering

Operations should preserve logical order.

Example:

```
Create Event

↓

Update Event

↓

Confirm Event
```

These operations must arrive in sequence.

Queue ordering must be maintained until completion.

---

# Batch Synchronization

Multiple operations may be synchronized together.

Example:

```
5 Queue Items

↓

Single Upload Request

↓

5 Responses
```

Batching improves efficiency while preserving ordering.

---

# Authentication

Every synchronization request requires authentication.

Authentication uses:

- Supabase Auth

Synchronization should pause if authentication expires.

Resume after successful re-authentication.

---

# Security

Synchronization must:

- Use encrypted communication
- Respect Row Level Security
- Validate ownership
- Prevent unauthorized writes
- Avoid exposing sensitive information

The synchronization layer should never bypass platform security.

---

# Network Awareness

The client should monitor network connectivity.

States:

- Online
- Offline
- Reconnecting

Synchronization behavior should adapt automatically.

Users should not manually trigger synchronization in normal operation.

---

# Synchronization Events

Applications may observe synchronization events.

Examples:

- Queue Updated
- Upload Started
- Upload Finished
- Upload Failed
- Sync Complete

These events should improve UI responsiveness without introducing business logic.

---

# Background Synchronization

The Mobile Client should support background synchronization.

Responsibilities:

- Process pending queue items
- Receive realtime updates
- Retry failed uploads
- Minimize battery usage

Background synchronization should remain independent from the UI.

---

# Error Recovery

Synchronization should recover automatically from:

- Temporary network failures
- Application restarts
- Device reboots
- Token refresh
- Background execution interruptions

Recovery should not require user interaction.

---

# Performance

Synchronization should prioritize:

- Minimal bandwidth
- Incremental updates
- Batched uploads
- Efficient retries
- Low battery usage

Avoid synchronizing unchanged data.

---

# Logging

Synchronization should emit structured diagnostic events.

Examples:

- Queue Created
- Upload Started
- Upload Completed
- Retry Scheduled
- Conflict Detected
- Sync Finished

Logs should avoid sensitive financial information.

---

# Future Expansion

The synchronization architecture should support:

- Desktop Client
- Bank Connectors
- Email Importers
- OCR Pipelines
- Public APIs

New clients should integrate through the same synchronization model.

---

# Synchronization Guarantees

The platform guarantees:

- No financial event is lost because of temporary connectivity.
- Offline work is preserved.
- Queue processing is durable.
- Duplicate uploads are prevented.
- Realtime updates keep clients synchronized.
- Synchronization remains transparent to users.

---

# Relationship to Other Documents

This document defines synchronization.

Related documents:

- `platform.md`
- `architecture.md`
- `mobile-architecture.md`
- `notification-pipeline.md`
- `shared-packages.md`
- `api-contract.md`
- `database.md`

Together these documents define how financial data moves safely between clients and the Personal Finance Platform while preserving consistency, reliability and offline capability.