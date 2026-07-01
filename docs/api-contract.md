# API Contract

> Version: 1.0
>
> This document defines the communication contract between every client and the Personal Finance Platform.
>
> Every application, service and future integration must communicate using the contracts defined here.
>
> This document defines **what** is exchanged, not **how** it is implemented.

---

# Purpose

The Personal Finance Platform consists of multiple clients.

Examples:

- Web Client
- Mobile Client
- Future Desktop Client
- Future Import Services

Every client communicates with the Finance Engine through a common API contract.

The objective is:

- Consistency
- Type Safety
- Predictability
- Forward Compatibility

---

# Design Principles

The API should always be:

- Deterministic
- Stateless
- Versioned
- Type-safe
- Secure
- Idempotent where applicable

Business rules belong inside the Finance Engine.

Clients submit requests.

The Finance Engine owns all financial intelligence.

---

# Communication Model

```
Client

↓

API Contract

↓

Finance Engine

↓

Database
```

Clients never communicate directly with the database.

---

# Authentication

Every authenticated request must include a valid user session.

Authentication Provider:

- Supabase Authentication

Clients must never send another user's identifier.

The authenticated session determines ownership.

---

# Content Type

All requests and responses use JSON.

```
Content-Type:

application/json
```

Binary uploads should use dedicated upload endpoints.

---

# API Versioning

Every endpoint belongs to an API version.

Example:

```
/api/v1/
```

Breaking changes require a new version.

Backward-compatible additions should remain within the same version.

---

# Resource Philosophy

Resources represent business entities.

Examples:

```
Financial Events

Transactions

Merchants

Categories

Budgets

Rules

Reports
```

Endpoints should remain resource-oriented.

---

# Request Lifecycle

```
Client

↓

Validate

↓

Authenticate

↓

Authorize

↓

Business Logic

↓

Persistence

↓

Response
```

No request should bypass validation.

---

# Response Philosophy

Every response should be deterministic.

Responses should contain:

- Requested data
- Operation status
- Validation errors when applicable

Responses should never expose internal implementation details.

---

# Error Philosophy

Errors should be meaningful.

Errors should never expose:

- SQL
- Internal stack traces
- Database implementation
- Server internals

Instead return structured error responses.

Example:

```json
{
    "code": "validation_failed",
    "message": "Amount must be greater than zero."
}
```

---

# Financial Event Contract

Purpose:

Represents pending financial activity.

Fields include:

- id
- merchant
- amount
- currency
- direction
- occurredAt
- notes
- source
- status

Financial Events remain editable until confirmed.

---

# Parsed Financial Event Contract

Purpose:

Represents normalized external financial input.

Produced by:

- Notification Parser
- CSV Parser
- Email Parser

Example structure:

```ts
interface ParsedFinancialEvent {
    source: string;

    packageName?: string;

    merchantName: string | null;

    amount: number;

    currency: string;

    direction: "credit" | "debit";

    occurredAt: string;

    reference?: string;

    confidence: number;

    rawPayload: string;
}
```

Clients submit Parsed Financial Events.

The Finance Engine creates Financial Events.

---

# Transaction Contract

Transactions represent permanent financial records.

Fields include:

- id
- merchant
- category
- amount
- currency
- occurredAt
- notes

Transactions should only be created by confirming Financial Events.

---

# Merchant Contract

Merchant fields include:

- id
- name
- normalizedName
- category
- usageCount
- lastSeenAt

Merchants improve automatically over time.

---

# Category Contract

Category fields include:

- id
- name
- icon
- color

Categories describe financial behavior.

---

# Budget Contract

Budget fields include:

- id
- category
- period
- limit
- spent
- remaining

Budget calculations belong to the Finance Engine.

---

# Rule Contract

Rules contain:

- id
- priority
- condition
- action
- enabled

Rules are deterministic.

Clients manage rules.

The Finance Engine evaluates them.

---

# Report Contract

Reports contain generated financial summaries.

Examples:

- Monthly Report
- Category Summary
- Merchant Summary
- Income Summary
- Expense Summary

Reports are read-only.

---

# Synchronization Contract

Synchronization requests should contain:

- operation
- payload
- timestamp
- device identifier
- request identifier

Responses acknowledge synchronization.

---

# Idempotency

Operations that create resources should support idempotency.

Duplicate submissions should never create duplicate financial records.

Clients should generate stable identifiers whenever practical.

---

# Validation

Every request should be validated before business logic executes.

Validation includes:

- Required fields
- Value ranges
- Ownership
- Referential integrity
- Business constraints

Validation failures return structured errors.

---

# Pagination

Collection endpoints should support pagination.

Typical response:

- items
- page
- pageSize
- totalItems
- totalPages

Pagination should remain consistent across resources.

---

# Filtering

Collections may support filtering.

Examples:

Financial Events

- status
- source
- date

Transactions

- category
- merchant
- date
- amount

Filtering behavior should be documented per endpoint.

---

# Sorting

Collections should support deterministic sorting.

Common sort fields:

- occurredAt
- createdAt
- amount
- merchant
- updatedAt

Sorting defaults should remain predictable.

---

# Realtime Events

Realtime events notify clients of server-side changes.

Examples:

- Financial Event Created
- Financial Event Updated
- Transaction Created
- Merchant Updated
- Budget Updated

Realtime payloads should match shared contracts.

---

# Security

Every endpoint should:

- Authenticate users.
- Authorize ownership.
- Validate input.
- Respect Row Level Security.
- Reject malformed requests.

The API should never trust client input.

---

# Future Compatibility

The API should support future clients without redesign.

Examples:

- Mobile Client
- Desktop Client
- Bank Connectors
- Email Importers
- OCR Pipelines

Future integrations should consume existing contracts rather than introducing new ones.

---

# Relationship to Other Documents

This document defines platform communication.

Related documents:

- `platform.md`
- `architecture.md`
- `shared-packages.md`
- `notification-pipeline.md`
- `sync-architecture.md`
- `database.md`
- `development-workflow.md`

Together these documents define how every client communicates consistently with the Personal Finance Platform while preserving deterministic behavior and long-term compatibility.