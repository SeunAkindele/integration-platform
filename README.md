# Integration Platform

A webhook ingestion, processing, and integration platform built with NestJS. It receives webhooks from external providers (GitHub, Stripe, Slack), queues them via NATS JetStream, verifies signatures, routes validated events through provider-specific adapters, and persists everything into PostgreSQL. Failed events are captured in a dead letter queue with full replay support.

## Architecture

```
                          POST /webhooks/:provider
┌──────────────┐          (accepts any payload)          ┌────────────────┐
│   External   │ ──────────────────────────────────────► │  API Gateway   │
│   Provider   │ ◄── 202 { eventId } ─────────────────── │  :3000         │
│ (GitHub,     │                                         │                │
│  Stripe,     │         GET/POST/PATCH /dlq/*           │  DLQ Replay    │
│  Slack)      │         (inspect & replay)              │  Endpoints     │
└──────────────┘                                         └───────┬────────┘
                                                                 │
                                                          publish │
                                                                 ▼
                                                        ┌────────────────┐
                              webhook.received.v1       │ NATS JetStream │
                         ┌───────────────────────────── │ :4222          │
                         │                              │ Stream:WEBHOOKS│
                         │   webhook.validated.v1       └───────┬────────┘
                         │ ┌────────────────────────────────────┤
                         ▼ │                                    │ advisory
                ┌────────────────┐                              │ (max_deliver)
                │    Webhook     │  1. Idempotency check        ▼
                │   Processor   │  2. Store event        ┌──────────────┐
                │  (no HTTP)    │  3. Verify signature   │  DLQ Stream  │
                │               │  4. Update status      │  dlq.webhook │
                │               │  5. Publish validated  └──────┬───────┘
                │               │  6. Record processed          │
                │               │  7. DLQ advisory ─────────────┘
                └───────┬───────┘        │
                        │                │ save to DB
                        │                ▼
                        │         ┌──────────────┐
                        │         │ dead_letter_ │
                   ┌────┘         │ events       │
                   │              └──────────────┘
                   │
                   │  webhook.validated.v1
                   ▼
          ┌─────────────────┐
          │  Integration    │  1. Mark processing
          │  Service        │  2. Route to adapter
          │  (no HTTP)      │  3. Mark processed/failed
          │                 │  4. Publish integration.
          │  Adapters:      │     processed.v1
          │  - GitHub       │
          │  - Slack        │
          │  - Stripe       │
          └────────┬────────┘
                   │
                   │ TypeORM
                   ▼
          ┌────────────────┐
          │  PostgreSQL    │
          │  :5434         │
          │  integration_  │
          │  platform      │
          └────────────────┘
```

## Project Structure

```
integration-platform/
├── apps/
│   ├── api-gateway/                 # HTTP API — receives webhooks, DLQ replay
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       └── modules/
│   │           ├── webhook/
│   │           │   ├── controllers/ # POST /webhooks/:provider
│   │           │   ├── services/    # Publish to NATS
│   │           │   ├── dto/
│   │           │   ├── interfaces/
│   │           │   └── constants/   # Signature header mapping
│   │           └── dlq/
│   │               ├── controllers/ # GET/POST/PATCH /dlq/*
│   │               └── services/    # Replay, inspect, update payload
│   │
│   ├── webhook-processor/           # NATS consumer — validates & persists
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── consumers/           # JetStream pull consumers + DLQ advisory
│   │       ├── services/            # Verification, idempotency, storage, DLQ
│   │       ├── entities/            # TypeORM entities (webhook, processed, DLQ)
│   │       ├── migrations/          # Database migrations
│   │       └── data-source.ts
│   │
│   └── integration-service/         # NATS consumer — business logic processing
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── adapters/            # GitHub, Slack, Stripe adapters
│           ├── consumers/           # WebhookValidatedConsumer
│           ├── entities/            # IntegrationEntity
│           ├── types/               # Adapter result types
│           ├── services/            # Router + integration store
│           ├── migrations/          # Database migrations
│           └── data-source.ts
│
├── libs/
│   ├── common/                      # Shared enums
│   │   └── enums/
│   ├── contracts/                   # Event schemas & NATS subjects
│   │   ├── subjects.ts
│   │   └── events/
│   └── messaging/                   # NATS JetStream utilities
│       ├── nats.module.ts
│       ├── jetstream.service.ts
│       ├── publisher.ts
│       └── consumer.factory.ts
│
├── infrastructure/
│   └── docker/
│       ├── docker-compose.yml
│       └── nats/nats-server.conf
│
├── docs/
│   └── openapi.yaml                 # OpenAPI 3.0 spec (importable to Apidog)
│
├── nest-cli.json
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| Language | TypeScript 5 |
| Message Broker | NATS 2.11 with JetStream |
| Database | PostgreSQL 16 |
| ORM | TypeORM 0.3 |
| Runtime | Node.js |
| Package Manager | pnpm (workspace) |
| Containerization | Docker Compose |

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start infrastructure

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

This starts:

| Service | Port | Purpose |
|---------|------|---------|
| NATS | 4222 (client), 8222 (monitoring) | Message broker with JetStream |
| PostgreSQL | 5434 | Database |

### 3. Run database migrations

```bash
pnpm migration:run:webhook
pnpm migration:run:integration
```

### 4. Start the services

```bash
# Terminal 1 — API Gateway
pnpm start:api-gateway:dev

# Terminal 2 — Webhook Processor
pnpm start:webhook-processor:dev

# Terminal 3 — Integration Service
pnpm start:integration-service:dev
```

### 5. Send a test webhook

```bash
curl -X POST http://localhost:3000/webhooks/github \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=test" \
  -d '{"action":"opened","repository":{"name":"test-repo"}}'
```

Expected response:

```json
{
  "message": "Webhook accepted",
  "accepted": true,
  "eventId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## API Reference

### Webhook Ingestion

#### `POST /webhooks/:provider`

Accepts a webhook from an external provider and queues it for asynchronous processing.

| Parameter | Location | Description |
|-----------|----------|-------------|
| `provider` | Path | `github`, `stripe`, or `slack` |
| Body | Request | Raw provider payload (any JSON) |

**Provider-specific signature headers:**

| Provider | Header |
|----------|--------|
| GitHub | `x-hub-signature-256` |
| Stripe | `stripe-signature` |
| Slack | `x-slack-signature` |

**Response:** `202 Accepted`

```json
{
  "message": "Webhook accepted",
  "accepted": true,
  "eventId": "<uuid>"
}
```

### Dead Letter Queue (DLQ)

#### `GET /dlq`

List all dead-lettered events. Optional query param `?status=pending` or `?status=replayed`.

#### `GET /dlq/:id`

Get a single DLQ entry by UUID.

#### `PATCH /dlq/:id/payload`

Update the payload of a DLQ entry before replaying. Use this when the original payload was the cause of failure.

#### `POST /dlq/:id/replay`

Replay a dead-lettered event. Re-publishes the stored payload to the original NATS subject, clears the idempotency record, and marks the entry as `replayed`.

**Response:** `200 OK`

```json
{
  "replayedTo": "webhook.received.v1"
}
```

Full API documentation is available in `docs/openapi.yaml` — import it into [Apidog](https://apidog.com) or any OpenAPI-compatible tool.

## Database Schema

```mermaid
erDiagram
    webhook_events {
        uuid id PK
        varchar(255) event_id UK "Unique event identifier"
        varchar(100) provider "github | stripe | slack"
        timestamptz received_at
        varchar(100) source_ip "nullable"
        varchar(500) signature "nullable"
        jsonb headers "Request headers"
        text raw_body "Original payload"
        jsonb parsed_body "nullable — JSON-parsed body"
        varchar(50) status "received | validated | failed"
        text failure_reason "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    processed_events {
        uuid id PK
        varchar(255) event_id UK "Idempotency key"
        varchar(100) provider "github | stripe | slack"
        varchar(50) status "processed | failed"
        text notes "nullable"
        timestamptz processed_at
        timestamptz created_at
    }

    integrations {
        uuid id PK
        varchar(191) eventId "Correlates to webhook event"
        varchar(50) provider "github | stripe | slack"
        varchar(120) action "e.g. github.push"
        varchar(50) status "processing | processed | failed"
        text summary "nullable"
        jsonb payload "nullable — validated event payload"
        jsonb result "nullable — adapter output"
        text errorMessage "nullable"
        timestamptz receivedAt "nullable"
        timestamptz validatedAt "nullable"
        timestamptz processedAt "nullable"
        timestamptz createdAt
        timestamptz updatedAt
    }

    dead_letter_events {
        uuid id PK
        varchar(255) event_id "nullable — extracted from payload"
        varchar(255) original_subject "NATS subject"
        varchar(100) original_stream "NATS stream"
        int original_sequence "Stream sequence number"
        varchar(255) failed_consumer "Durable consumer name"
        varchar(100) dead_letter_reason "e.g. max_deliver_exceeded"
        jsonb payload "nullable — original or corrected payload"
        varchar(50) status "pending | replayed"
        timestamptz dead_lettered_at
        timestamptz replayed_at "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    webhook_events ||--o| processed_events : "event_id"
    webhook_events ||--o| integrations : "eventId"
    webhook_events ||--o| dead_letter_events : "event_id"
```

### `webhook_events`

Stores every received webhook with its full payload and processing status.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `event_id` | varchar(255) | Unique identifier assigned by the API Gateway |
| `provider` | varchar(100) | `github`, `stripe`, or `slack` |
| `received_at` | timestamptz | When the webhook was received |
| `source_ip` | varchar(100) | Client IP address |
| `signature` | varchar(500) | Provider signature header value |
| `headers` | jsonb | Full request headers |
| `raw_body` | text | Original request body |
| `parsed_body` | jsonb | JSON-parsed body (null if not valid JSON) |
| `status` | varchar(50) | `received` &rarr; `validated` or `failed` |
| `failure_reason` | text | Reason for failure (if status = `failed`) |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Last update time |

### `processed_events`

Idempotency table that prevents duplicate processing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `event_id` | varchar(255) | Same as `webhook_events.event_id` |
| `provider` | varchar(100) | `github`, `stripe`, or `slack` |
| `status` | varchar(50) | `processed` or `failed` |
| `notes` | text | Additional context |
| `processed_at` | timestamptz | When processing completed |
| `created_at` | timestamptz | Row creation time |

### `integrations`

Tracks business-level processing of validated webhooks through provider-specific adapters.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `eventId` | varchar(191) | Correlates back to the original webhook event |
| `provider` | varchar(50) | `github`, `stripe`, or `slack` |
| `action` | varchar(120) | Adapter-determined action (e.g. `github.push`) |
| `status` | varchar(50) | `processing` &rarr; `processed` or `failed` |
| `summary` | text | Human-readable description of what was processed |
| `payload` | jsonb | The validated event payload |
| `result` | jsonb | Output data from the adapter |
| `errorMessage` | text | Error details if status is `failed` |
| `receivedAt` | timestamptz | When the original webhook was received |
| `validatedAt` | timestamptz | When signature verification passed |
| `processedAt` | timestamptz | When adapter processing completed |
| `createdAt` | timestamptz | Row creation time |
| `updatedAt` | timestamptz | Last update time |

### `dead_letter_events`

Stores events that exhausted all delivery attempts. Supports payload correction and replay.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `event_id` | varchar(255) | Extracted from payload if available |
| `original_subject` | varchar(255) | NATS subject the message was published to |
| `original_stream` | varchar(100) | NATS stream the message belonged to |
| `original_sequence` | int | Stream sequence number |
| `failed_consumer` | varchar(255) | Durable consumer that exhausted retries |
| `dead_letter_reason` | varchar(100) | e.g. `max_deliver_exceeded` |
| `payload` | jsonb | Original or corrected event payload |
| `status` | varchar(50) | `pending` &rarr; `replayed` |
| `dead_lettered_at` | timestamptz | When the event was dead-lettered |
| `replayed_at` | timestamptz | When the event was replayed (null if pending) |
| `created_at` | timestamptz | Row creation time |
| `updated_at` | timestamptz | Last update time |

## NATS Subjects & Streams

| Subject | Stream | Purpose |
|---------|--------|---------|
| `webhook.received.v1` | `WEBHOOKS` | API Gateway publishes incoming webhooks |
| `webhook.validated.v1` | `WEBHOOKS` | Processor publishes after signature verification |
| `dlq.webhook.v1` | `WEBHOOKS_DLQ` | Dead-letter queue for messages exceeding max delivery |
| `integration.processed.v1` | `INTEGRATIONS` | Integration service publishes after adapter processing |

**Consumer configuration:**

| Consumer | Durable Name | Stream | Subject | Ack Wait | Max Deliver |
|----------|-------------|--------|---------|----------|-------------|
| Webhook Processor | `webhook-processor-received-v1` | `WEBHOOKS` | `webhook.received.v1` | 30s | 5 |
| Integration Service | `integration-service-webhook-validated-v1` | `WEBHOOKS` | `webhook.validated.v1` | 30s | 5 |

## Processing Pipeline

1. **Receive** — API Gateway accepts the webhook, assigns an `eventId`, and publishes a `WebhookReceivedEvent` to NATS
2. **Idempotency check** — Webhook Processor checks `processed_events` to skip duplicates
3. **Store** — Webhook is saved to `webhook_events` with status `received`
4. **Signature verification** — HMAC-SHA256 for GitHub; Stripe and Slack are stub implementations
5. **Status update** — `webhook_events.status` is set to `validated` or `failed`
6. **Publish validated** — A `WebhookValidatedEvent` is published to `webhook.validated.v1`
7. **Record** — An entry is added to `processed_events` for idempotency
8. **Route** — Integration Service consumes the validated event and routes it to the appropriate adapter (GitHub, Slack, or Stripe)
9. **Process** — The adapter extracts provider-specific data and returns a result; the `integrations` table tracks the lifecycle (`processing` &rarr; `processed` / `failed`)
10. **Publish result** — An `IntegrationProcessedEvent` is published to `integration.processed.v1`
11. **DLQ** — If a message fails after 5 delivery attempts, the max-delivery advisory triggers and the event is moved to the `dead_letter_events` table and `WEBHOOKS_DLQ` stream
12. **Replay** — Dead-lettered events can be inspected, their payload corrected, and replayed via the DLQ API endpoints

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm start:api-gateway:dev` | Start API Gateway in watch mode |
| `pnpm start:webhook-processor:dev` | Start Webhook Processor in watch mode |
| `pnpm start:integration-service:dev` | Start Integration Service in watch mode |
| `pnpm migration:run:webhook` | Run Webhook Processor migrations |
| `pnpm migration:revert:webhook` | Revert last Webhook Processor migration |
| `pnpm migration:generate:webhook` | Generate migration from entity changes |
| `pnpm migration:run:integration` | Run Integration Service migrations |
| `pnpm migration:revert:integration` | Revert last Integration Service migration |
| `pnpm migration:generate:integration` | Generate migration from entity changes |
| `pnpm lint` | Lint and auto-fix |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run end-to-end tests |
| `pnpm format` | Format code with Prettier |

## Environment Variables

### API Gateway (`apps/api-gateway/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `NATS_SERVERS` | `nats://localhost:4222` | NATS connection URL |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `integration_platform` | Database name |

### Webhook Processor (`apps/webhook-processor/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NATS_SERVERS` | `nats://localhost:4222` | NATS connection URL |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `integration_platform` | Database name |
| `GITHUB_WEBHOOK_SECRET` | — | Secret for GitHub HMAC verification |

### Integration Service (`apps/integration-service/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | HTTP server port (unused, service has no HTTP) |
| `NATS_SERVERS` | `nats://localhost:4222` | NATS connection URL |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `integration_platform` | Database name |
| `GITHUB_WEBHOOK_SECRET` | — | Secret for GitHub HMAC verification |

## License

UNLICENSED
