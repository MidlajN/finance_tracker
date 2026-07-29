# Notification Pipeline

> Version: 1.0
>
> This document defines the complete notification processing pipeline for the Personal Finance Platform.
>
> Every notification received by the Mobile Client must follow this pipeline.
>
> No notification should bypass any stage described here.

---

# Purpose

The Notification Pipeline transforms raw Android notifications into structured Financial Events.

Notifications are untrusted, inconsistent, and application-specific.

The pipeline exists to normalize those notifications into a deterministic financial model before they enter the Finance Engine.

Every notification follows exactly the same lifecycle regardless of which application generated it.

---

# Design Principles

The pipeline should always be:

- Deterministic
- Repeatable
- Idempotent
- Auditable
- Extensible
- Platform independent after parsing

Every stage has a single responsibility.

---

# High Level Flow

```
Android Notification

↓

Notification Listener

↓

Notification Parser

↓

Parsed Financial Event

↓

Validation

↓

Deduplication

↓

Rule Engine

↓

Merchant Intelligence

↓

Financial Event

↓

Synchronization

↓

User Review

↓

Transaction

↓

Dashboard

↓

Analytics
```

No stage should be skipped.

---

# Stage 1 — Android Notification

Source:

Android NotificationListenerService

Input:

```
StatusBarNotification
```

Responsibilities:

- Observe notifications.
- Capture notification metadata.
- Assign a deterministic capture ID.
- Durably queue the raw capture.
- Perform conservative financial-notification classification.
- Show an immediate native review preview for likely transactions.
- Forward notification to the parser.

Must not:

- Treat native classification as financial parsing.
- Confirm or ignore a capture before a Financial Event exists.
- Apply rules.
- Access Supabase.
- Create Financial Events.

The native preview is an attention mechanism only. It does not represent a
persisted Financial Event and therefore exposes Review, not Confirm or Ignore.

---

# Stage 2 — Notification Parser

Purpose:

Extract structured information from the raw notification.

Input:

```
Raw Notification
```

Output:

```
ParsedFinancialEvent
```

Example fields:

- source
- packageName
- applicationName
- title
- message
- merchantName
- amount
- currency
- direction
- occurredAt
- reference
- confidence
- rawNotification

The parser should normalize information only.

No financial intelligence belongs here.

---

# Stage 3 — Validation

Purpose:

Ensure the parsed notification is usable.

Validation examples:

- Amount exists.
- Currency exists.
- Timestamp is valid.
- Merchant is present when required.

Invalid notifications should not continue through the pipeline.

They should be recorded for diagnostics if appropriate.

---

# Stage 4 — Deduplication

Purpose:

Prevent duplicate Financial Events.

Duplicate detection may consider:

- Notification ID
- Reference number
- Timestamp
- Amount
- Merchant
- Hash of normalized payload

The deduplication strategy should be deterministic.

No duplicate notification should create multiple Financial Events.

---

# Stage 5 — Rule Engine

Purpose:

Apply deterministic financial rules.

Examples:

Merchant mapping

```
"AMZN"

↓

Amazon
```

Category mapping

```
Amazon

↓

Shopping
```

Automation

```
Salary

↓

Income
```

Rules may:

- Assign merchant
- Assign category
- Auto-confirm
- Ignore
- Add tags (future)

Rules should never modify historical transactions.

---

# Stage 6 — Merchant Intelligence

Purpose:

Improve financial information.

Responsibilities:

- Normalize merchant names.
- Match known merchants.
- Learn aliases.
- Apply default categories.
- Increase usage counts.

Merchant Intelligence improves data quality before review.

Matching is deterministic and lives in `finance-core`
(`matchMerchantFromRaw`):

1. Exact — the normalized raw name equals a merchant's normalized name.
2. Alias — the normalized raw name equals a stored merchant alias.
3. Containment — exactly one merchant name (4+ characters) appears
   inside the raw name. Any ambiguity resolves to no match.

Matching runs after the Rule Engine; an explicit rule always wins and
the matcher only fills events that are still unlinked. Matches stamp
`merchant_id` on the Financial Event, so confirmation propagates the
merchant to the Transaction, applies its default category, and updates
usage counts.

Aliases are learned only from explicit user action: linking a merchant
during review stores the raw captured name as an alias of that
merchant. Canonical merchants are never created automatically from raw
names.

---

# Stage 7 — Financial Event Creation

Purpose:

Persist a Financial Event.

Financial Events represent pending financial activity.

Financial Events are editable.

Financial Events are reviewable.

Financial Events are temporary.

A Financial Event is not a Transaction.

---

# Stage 8 — Synchronization

Purpose:

Synchronize the Financial Event.

Flow:

```
Financial Event

↓

Local Queue

↓

Supabase

↓

Realtime

↓

Other Clients
```

Synchronization must be reliable.

Failed synchronization should retry automatically.

---

# Stage 9 — User Review

Purpose:

Allow the user to validate financial information.

The user may:

- Confirm
- Ignore
- Edit merchant
- Edit category
- Edit amount
- Edit notes

The review stage is the final human validation step.

---

# Stage 10 — Transaction Creation

Purpose:

Create a permanent Transaction.

Only confirmed Financial Events create Transactions.

The confirmation process must:

- Preserve history.
- Synchronize related entities.
- Update merchant intelligence.
- Update dashboard summaries.

Transactions become the source for analytics.

---

# Stage 11 — Dashboard

The Dashboard consumes confirmed Transactions.

The Dashboard should never calculate business rules.

It displays:

- Income
- Expenses
- Budgets
- Trends
- Reports

Dashboard calculations belong to shared business logic.

---

# Notification Sources

The architecture supports multiple notification providers.

Examples:

- Google Pay
- PhonePe
- Paytm
- BHIM
- Amazon Pay
- Bank applications
- Credit card applications
- Future providers

Provider-specific logic belongs inside parsers.

The remainder of the pipeline remains unchanged.

---

# Parser Registry

Notification parsing should be provider-based.

```
Notification

↓

Parser Registry

↓

Provider Parser

↓

Parsed Financial Event
```

Each provider parser should expose a common interface.

Current implementation:

- Android notification payloads are represented as `RawNotificationPayload`.
- The shared `parser` package normalizes supported notification payloads into `ParsedFinancialEvent`.
- Parsed notifications are converted into Financial Event inputs.
- Transactions are never created directly from notifications.

---

# Parsed Financial Event

Every parser should produce the same structure.

Example:

```ts
interface ParsedFinancialEvent {
    source: string;
    packageName: string;
    merchantName: string | null;
    amount: number;
    currency: string;
    direction: "credit" | "debit";
    occurredAt: string;
    reference: string | null;
    confidence: number;
    rawNotification: string;
}
```

The Finance Engine should never know which parser produced the event.

---

# Error Handling

Failures should stop at the appropriate stage.

Examples:

Parser failure

↓

Reject notification

Validation failure

↓

Reject notification

Duplicate

↓

Ignore

Synchronization failure

↓

Retry Queue

Errors should never create inconsistent financial data.

---

# Background and Cold-Start Processing

The Android notification listener runs independently from the React Native UI.

When the UI runtime is unavailable:

1. The listener assigns a stable capture ID.
2. The raw notification is stored in the native durable queue.
3. A likely financial notification produces an immediate native Review alert.
4. Tapping Review starts the Finance Tracker activity directly, avoiding
   Android's blocked broadcast-to-activity notification trampoline.
5. Startup drains captures sequentially and persists Financial Events.
6. Only after persistence are queued actions drained.
7. The preliminary alert is replaced with Confirm, Review and Ignore actions
   using the same Android notification identity.
8. The capture ID resolves the exact Financial Event and opens its Review screen.

Processed capture IDs are retained in a bounded native deduplication history.
The Financial Event also stores the capture ID in metadata so a native Review
action can resolve the exact event.

Android force-stop is an operating-system boundary. If the user force-stops the
application, notification listener delivery and background work are suspended
until the application is opened again. Swiping the application from recents is
not equivalent to force-stop, although manufacturer battery policies may still
delay background work.

---

# Logging

Every stage should be observable.

Recommended log points:

- Notification received
- Parsing complete
- Validation result
- Duplicate detection
- Rule execution
- Event creation
- Synchronization
- Confirmation

Logs should never expose sensitive user information.

---

# Extensibility

New notification providers should require only:

- A new parser.
- Parser registration.

No modifications should be required elsewhere in the pipeline.

---

# Pipeline Guarantees

Every notification entering the Finance Platform is guaranteed to:

- Be parsed.
- Be validated.
- Be deduplicated.
- Pass through the Rule Engine.
- Benefit from Merchant Intelligence.
- Become a Financial Event.
- Be synchronized.
- Be reviewed.
- Become a Transaction only after confirmation.

This guarantee must remain true for every current and future notification source.

---

# Relationship to Other Documents

This document defines notification processing.

Related documents:

- `platform.md`
- `architecture.md`
- `mobile-architecture.md`
- `shared-packages.md`
- `sync-architecture.md`
- `api-contract.md`
- `database.md`

Together these documents define the complete lifecycle of financial notifications from Android to Financial Insight.
