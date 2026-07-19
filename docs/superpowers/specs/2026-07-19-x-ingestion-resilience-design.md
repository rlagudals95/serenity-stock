# X Ingestion Resilience Design

## Purpose

Make the existing Rettiwt-based X ingestion safer to operate without adding the
official X API yet. The system must avoid repeated requests with a rejected X
session, reduce steady-state request frequency, deliver durable Telegram failure
alerts, and establish a provider boundary that can accept an official X API
implementation later.

## Scope

This change will:

- introduce an `XPostSource` interface and a `RettiwtSource` implementation;
- select the source through `X_POST_PROVIDER`, defaulting to `rettiwt`;
- use a random 750–1,500 ms delay before Rettiwt requests and make each request
  only once;
- run the scheduling trigger every five minutes while performing X ingestion at
  random 30, 35, 40, or 45 minute intervals;
- persist an authentication circuit breaker keyed by a SHA-256 credential
  fingerprint;
- stop the current run immediately after an authentication failure;
- prevent scheduled and manual X requests with the same rejected credential;
- resume automatically after `RETTIWT_API_KEY` changes;
- persist Telegram alerts in an outbox and retry Telegram delivery without
  retrying X;
- document the operating and credential-rotation procedure.

This change will not:

- implement `OfficialXApiSource`;
- automate X login, cookie refresh, account rotation, or proxy rotation;
- bypass an open authentication circuit breaker through the manual sync action;
- guarantee exactly-once Telegram delivery, because Telegram `sendMessage`
  provides no idempotency key.

## Architecture

### Provider boundary

`XPostSource` is the ingestion-facing contract. It exposes:

- `resolveUser(username)`, returning the normalized X user ID and username;
- `fetchPostPage(input)`, returning the existing normalized `XPostPage` and
  `StoredPost` values.

`RettiwtSource` owns the Rettiwt client, Rettiwt-specific response types,
authentication error translation, request delay, and mapping to the normalized
domain model. Pipeline and Edge Function code depend on `XPostSource`, not on
`RettiwtClient`.

`createXPostSource(config)` selects the implementation. An absent
`X_POST_PROVIDER` means `rettiwt`; any other value fails during configuration
instead of silently falling back.

The local Next.js pipeline and Supabase Edge Function retain their existing
runtime-specific modules, but both expose the same provider contract and
behavior. The change will preserve current author filtering, cursor handling,
deduplication, and `StoredPost` mapping.

### Rettiwt request behavior

Each Rettiwt request waits for a random integer delay from 750 through 1,500 ms.
The random source is injectable in tests. Rettiwt is configured for one total
attempt so that its 404 retry loop cannot produce repeated requests.

The adapter never logs in, refreshes cookies, invokes an authentication CLI, or
mutates the X account. It only uses the supplied `RETTIWT_API_KEY`.

### Scheduling

The Supabase cron trigger invokes `ingest-x` every five minutes with
`{"mode":"scheduled"}`. A persisted schedule row decides whether an actual X
request is due.

When a scheduled run is claimed, the database atomically advances
`next_run_at` by a random choice of 30, 35, 40, or 45 minutes. Calls that arrive
before `next_run_at` return a successful skipped result without creating an
ingestion run or contacting X.

A manual sync uses `{"mode":"manual"}`. It may ignore `next_run_at`, but it must
still obey the authentication circuit breaker and the existing pipeline lease.
This keeps the manual action useful without allowing it to hammer a rejected
session.

## Persistent State

### `pipeline_schedules`

One service-role-only row per scheduled pipeline:

- `job_name text primary key`;
- `state text` constrained to `active` or `auth_blocked`;
- `next_run_at timestamptz`;
- `blocked_credential_fingerprint text null`;
- `auth_blocked_at timestamptz null`;
- standard created and updated timestamps.

Database constraints require blocked fields to be present only in
`auth_blocked` state. RLS is enabled with no browser-role policies.

An atomic service-role RPC claims a due run and returns one of:

- `due`: perform ingestion;
- `not_due`: skip without contacting X;
- `auth_blocked`: skip without contacting X;
- `credential_changed`: clear the breaker and perform one ingestion attempt.

The RPC accepts the SHA-256 fingerprint, never the credential. The application
computes the fingerprint in memory. The API key, cookies, and fingerprint are
excluded from application logs, run metadata, HTTP responses, and Telegram
messages.

### `pipeline_alerts`

The Telegram outbox contains:

- alert ID and unique `event_key`;
- alert kind and message text;
- `pending` or `sent` status;
- delivery attempt count;
- `next_attempt_at`, `sent_at`, and sanitized `last_error`;
- standard created and updated timestamps.

RLS is enabled with no browser-role policies. The unique event key prevents
normal duplicate creation:

- authentication alerts use the job and rejected credential fingerprint;
- ordinary run failures use the pipeline run ID;
- recovery messages use the successful recovery run ID.

The authentication alert event key is derived from the job name and credential
fingerprint so the same rejected credential creates one normal alert event. The
fingerprint is never placed in the user-facing message or logs.

## Authentication Circuit Breaker

`RettiwtSource` translates definite session failures into
`XSourceAuthenticationError`. Definite failures include HTTP 401/403,
Rettiwt/Twitter known authentication codes, and explicit invalid-session or
failed-authentication messages. Network failures, timeouts, HTTP 429, HTTP 5xx,
payload changes, and unknown errors remain ordinary source errors.

On `XSourceAuthenticationError`, ingestion:

1. stops immediately and does not request remaining analyst timelines;
2. marks the current pipeline run failed;
3. atomically changes the schedule to `auth_blocked` for the current credential
   fingerprint and inserts one pending Telegram alert;
4. persists the sanitized failure on the active ingestion cursor when one
   exists;
5. releases the pipeline lease.

Subsequent scheduled and manual invocations with the same fingerprint may drain
Telegram alerts but must not call X.

After the operator replaces the Supabase `RETTIWT_API_KEY`, the fingerprint
changes. The next scheduled or manual invocation clears the old breaker and
makes one request. A successful run emits the existing recovery notification.
If the replacement credential also fails authentication, it opens a new breaker
and creates one alert for the new event.

Ordinary source failures fail and alert only that run. They do not open the
authentication breaker and receive no immediate in-process retry. The next X
attempt is the next randomly scheduled run or an authorized manual sync.

## Telegram Delivery

Failure and recovery notifications are written to `pipeline_alerts` before a
Telegram call is attempted. Each Edge invocation drains due pending alerts even
when X ingestion is `not_due` or `auth_blocked`.

After a Telegram delivery failure, only the Telegram message is retried. Retry
delays progress through 5, 15, and then a maximum of 60 minutes. Pending alerts
continue at the 60-minute interval until delivery succeeds. A successful
delivery marks the row `sent`, after which it is not selected again.

Messages include:

- failure category;
- affected source when known;
- fetched, inserted, and page counts;
- whether future X requests are blocked;
- the required operator action;
- event time.

An authentication alert explicitly states that collection is stopped and that
the Supabase Rettiwt secret must be replaced. It contains no API key, cookie,
credential fingerprint, token, or raw upstream payload.

The outbox provides at-least-once delivery. A Telegram request that succeeds
while its response is lost can cause a duplicate, which cannot be eliminated
without a Telegram idempotency mechanism.

## HTTP Behavior

Scheduled calls return HTTP 200 with a structured skipped reason for
`not_due`, `lease_held`, and an already-open `auth_blocked` circuit. The first
run that detects an authentication failure returns a failed response with a
stable `x_auth_blocked` error code. Manual sync exposes the same stable reason
and does not bypass the circuit.

Responses contain only sanitized error details and operational counts.

## Testing

Implementation follows red-green-refactor.

Vitest coverage will verify:

- default and invalid provider selection;
- Rettiwt normalization through `XPostSource`;
- request delay boundaries with deterministic random inputs;
- one total Rettiwt request attempt;
- definite authentication error classification;
- exclusion of network, 429, 5xx, and unknown errors from authentication
  classification;
- immediate stop after the first authentication failure;
- no X call for `not_due` or an unchanged blocked fingerprint;
- one X call after a credential fingerprint change;
- one outbox event per authentication-breaker transition;
- Telegram pending, retry, and sent transitions;
- alert content and secret redaction;
- ordinary failures leaving the circuit active.

pgTAP coverage will verify:

- table constraints and browser-role denial;
- atomic schedule claims;
- 30/35/40/45 minute scheduling choices;
- unchanged-fingerprint blocking;
- changed-fingerprint reopening;
- unique alert event keys;
- due-alert claim behavior.

Final verification includes the complete Vitest suite, ESLint, TypeScript
checking, and Next.js production build. Supabase database tests are also run
when Docker and the local Supabase runtime are available; otherwise the exact
environment blocker is reported without claiming database verification.

## Rollout and Operations

The database migration is applied before deploying the Edge Function. The
scheduled SQL is then updated to the five-minute trigger and explicit scheduled
mode.

`X_POST_PROVIDER` is optional and defaults to `rettiwt`. Existing
`RETTIWT_API_KEY` storage remains server-only.

When an authentication alert arrives, the operator:

1. does not repeatedly log in or rerun manual sync with the same credential;
2. creates a replacement Rettiwt API key manually;
3. replaces the Supabase `RETTIWT_API_KEY` secret;
4. waits for the next scheduled claim or invokes manual sync once;
5. confirms the recovery notification and successful pipeline run.

Existing uncommitted analyst-source, filtering, recovery-notification, and
pipeline changes in the working tree must be preserved during implementation.
