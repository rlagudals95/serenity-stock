# X Ingestion Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Rettiwt ingestion stop durably after authentication failure, run at randomized 30–45 minute intervals, deliver failure alerts through a durable Telegram outbox, and depend on an extensible X source contract.

**Architecture:** Both Node and Supabase Edge runtimes expose the same `XPostSource` contract and wrap Rettiwt in `RettiwtSource`. Postgres owns the random schedule, credential-fingerprint circuit breaker, and Telegram outbox; the Edge handler acquires its existing lease before claiming schedule state, drains Telegram independently of X, and never retries an authentication failure with the same credential.

**Tech Stack:** TypeScript 5.9, Vitest 4, Rettiwt-API 7.1.2, Supabase Edge Functions, PostgreSQL/PLpgSQL, pgTAP-style SQL assertions, pg_cron, Telegram Bot API.

**Working-tree safety:** The workspace already contains user-owned uncommitted analyst-source, filtering, DeepSeek, Telegram recovery, and ingestion edits that overlap several files in this plan. Preserve those edits and do not stage or commit implementation files unless the user explicitly requests it. The design and plan documents may be committed separately.

---

## File Map

- Modify `src/lib/pipeline/config.ts`: parse `X_POST_PROVIDER`.
- Modify `src/lib/pipeline/config.test.ts`: provider configuration tests.
- Modify `src/lib/pipeline/x.ts`: normalized source contract, Rettiwt adapter, error classification, and random request delay.
- Modify `src/lib/pipeline/x.test.ts`: Node adapter behavior tests.
- Modify `src/lib/pipeline/sync.ts`: consume `XPostSource`.
- Modify `src/lib/pipeline/backfill.ts`: consume `XPostSource`.
- Modify `supabase/functions/_shared/x.ts`: Edge equivalent of the source contract and Rettiwt adapter.
- Modify `src/lib/pipeline/edge-shared.test.ts`: Edge source and control helper tests.
- Create `supabase/functions/_shared/ingestion-control.ts`: request-mode parsing, SHA-256 fingerprinting, alert event keys, and retry-delay helpers.
- Create `supabase/migrations/20260719131500_x_ingestion_resilience.sql`: schedule, circuit breaker, outbox, and atomic RPCs.
- Modify `supabase/tests/serenity_scheduled_pipeline.sql`: schedule, breaker, alert uniqueness, and RLS assertions.
- Modify `supabase/functions/_shared/database.ts`: typed wrappers for the new RPCs and outbox updates.
- Modify `supabase/functions/_shared/telegram.ts`: blocked-auth message and durable delivery support types.
- Modify `src/lib/pipeline/telegram.test.ts`: exact alert content and retry tests.
- Modify `supabase/functions/ingest-x/index.ts`: schedule gate, breaker transition, outbox drain, and source abstraction.
- Modify `src/lib/pipeline/edge-functions.ts`: send manual mode to hosted ingestion.
- Modify `src/lib/pipeline/edge-functions.test.ts`: manual mode request test.
- Modify `supabase/sql/configure_scheduled_pipeline.sql`: five-minute wake-up and scheduled mode.
- Modify `.env.example`: provider selection documentation.
- Modify `README.md`: operating behavior and credential-replacement runbook.

## Task 1: Add the X Provider Contract in the Node Runtime

**Files:**
- Modify: `src/lib/pipeline/config.ts`
- Modify: `src/lib/pipeline/config.test.ts`
- Modify: `src/lib/pipeline/x.ts`
- Modify: `src/lib/pipeline/x.test.ts`
- Modify: `src/lib/pipeline/sync.ts`
- Modify: `src/lib/pipeline/backfill.ts`

- [ ] **Step 1: Write failing provider configuration tests**

Add these expectations to `src/lib/pipeline/config.test.ts`:

```ts
it("defaults the X post provider to Rettiwt", () => {
  const result = resolvePipelineConfig({
    SUPABASE_URL: "https://serenity.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_test",
    RETTIWT_API_KEY: "rettiwt-session",
    DEEPSEEK_API_KEY: "deepseek-token",
  });

  expect(result).toMatchObject({
    configured: true,
    value: { xPostProvider: "rettiwt" },
  });
});

it("rejects an unsupported X post provider", () => {
  expect(() =>
    resolvePipelineConfig({
      SUPABASE_URL: "https://serenity.supabase.co",
      SUPABASE_SECRET_KEY: "sb_secret_test",
      RETTIWT_API_KEY: "rettiwt-session",
      DEEPSEEK_API_KEY: "deepseek-token",
      X_POST_PROVIDER: "unknown",
    }),
  ).toThrow("Unsupported X_POST_PROVIDER: unknown");
});
```

- [ ] **Step 2: Run the configuration tests and verify RED**

Run:

```bash
pnpm test src/lib/pipeline/config.test.ts
```

Expected: FAIL because `xPostProvider` and unsupported-provider validation do not exist.

- [ ] **Step 3: Add the provider type and configuration parsing**

Add to `src/lib/pipeline/config.ts`:

```ts
export type XPostProvider = "rettiwt";

export interface PipelineConfig {
  // keep every existing field
  xPostProvider: XPostProvider;
}

function xPostProvider(input: string | undefined): XPostProvider {
  const provider = value(input) ?? "rettiwt";
  if (provider !== "rettiwt") {
    throw new Error(`Unsupported X_POST_PROVIDER: ${provider}`);
  }
  return provider;
}
```

Populate `xPostProvider: xPostProvider(environment.X_POST_PROVIDER)` in the
configured result and update the existing complete-object expectation.

- [ ] **Step 4: Run the configuration tests and verify GREEN**

Run:

```bash
pnpm test src/lib/pipeline/config.test.ts
```

Expected: all configuration tests PASS.

- [ ] **Step 5: Write failing source-adapter tests**

Extend `src/lib/pipeline/x.test.ts` with:

```ts
import {
  RettiwtSource,
  XSourceAuthenticationError,
  createXPostSource,
  isRettiwtAuthenticationError,
  rettiwtDelayMs,
} from "./x";

it("maps deterministic random values to a 750–1500 ms delay", () => {
  expect(rettiwtDelayMs(() => 0)).toBe(750);
  expect(rettiwtDelayMs(() => 0.5)).toBe(1125);
  expect(rettiwtDelayMs(() => 0.999999)).toBe(1500);
});

it("creates the Rettiwt provider and rejects unsupported providers", () => {
  expect(
    createXPostSource({
      provider: "rettiwt",
      apiKey: "session",
      random: () => 0,
    }),
  ).toBeInstanceOf(RettiwtSource);

  expect(() =>
    createXPostSource({
      provider: "official",
      apiKey: "session",
    }),
  ).toThrow("Unsupported X post provider: official");
});

it.each([
  { status: 401 },
  { status: 403 },
  { status: 500, details: [{ code: 89, message: "Invalid token" }] },
  { status: 500, message: "Invalid authentication data" },
])("recognizes definite authentication failures: %o", (error) => {
  expect(isRettiwtAuthenticationError(error)).toBe(true);
});

it.each([
  { status: 429, message: "Too many requests" },
  { status: 500, message: "Internal server error" },
  { name: "TimeoutError", message: "timed out" },
])("does not block on transient failures: %o", (error) => {
  expect(isRettiwtAuthenticationError(error)).toBe(false);
});

it("translates an authentication failure and performs no second request", async () => {
  const client = clientWithPages([]);
  vi.mocked(client.user.details).mockRejectedValueOnce({
    status: 401,
    message: "Unauthorized",
  });
  const source = new RettiwtSource(client);

  await expect(source.resolveUser("aleabitoreddit")).rejects.toBeInstanceOf(
    XSourceAuthenticationError,
  );
  expect(client.user.details).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 6: Run the adapter tests and verify RED**

Run:

```bash
pnpm test src/lib/pipeline/x.test.ts
```

Expected: FAIL because the source adapter API does not exist.

- [ ] **Step 7: Implement the source contract and Rettiwt adapter**

Add these public contracts to `src/lib/pipeline/x.ts`, retaining all current
normalization, author filtering, and cursor helpers:

```ts
export interface XResolvedUser {
  id: string;
  username: string;
}

export interface XPostPageInput {
  userId: string;
  username: string;
  sinceId?: string;
  startTime?: string;
  endTime?: string;
  paginationToken?: string;
  pageSize?: number;
}

export interface XPostSource {
  resolveUser(username: string): Promise<XResolvedUser>;
  fetchPostPage(input: XPostPageInput): Promise<XPostPage>;
}

export class XSourceAuthenticationError extends Error {
  override readonly name = "X_SOURCE_AUTHENTICATION_ERROR";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
  }
}

const AUTHENTICATION_CODES = new Set([32, 64, 89, 99, 135, 215, 239, 326]);
const AUTHENTICATION_MESSAGE =
  /(failed to authenticate|invalid authentication data|invalid or expired token|could not authenticate|account.*(locked|suspended))/i;

interface RettiwtErrorLike {
  status?: unknown;
  message?: unknown;
  details?: unknown;
}

export function isRettiwtAuthenticationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as RettiwtErrorLike;
  if (candidate.status === 401 || candidate.status === 403) return true;
  if (
    typeof candidate.message === "string" &&
    AUTHENTICATION_MESSAGE.test(candidate.message)
  ) {
    return true;
  }
  if (!Array.isArray(candidate.details)) return false;
  return candidate.details.some((detail) => {
    if (!detail || typeof detail !== "object") return false;
    const item = detail as { code?: unknown; message?: unknown };
    return (
      (typeof item.code === "number" &&
        AUTHENTICATION_CODES.has(item.code)) ||
      (typeof item.message === "string" &&
        AUTHENTICATION_MESSAGE.test(item.message))
    );
  });
}

function translateRettiwtError(error: unknown): never {
  if (isRettiwtAuthenticationError(error)) {
    throw new XSourceAuthenticationError(
      "Rettiwt authentication failed; X collection is blocked until the credential changes.",
      { cause: error },
    );
  }
  throw error;
}

export function rettiwtDelayMs(random: () => number = Math.random) {
  return Math.min(1500, 750 + Math.floor(random() * 751));
}

export function createRettiwtClient(
  apiKey: string,
  random: () => number = Math.random,
): RettiwtClient {
  return new Rettiwt({
    apiKey,
    delay: () => rettiwtDelayMs(random),
    maxRetries: 1,
    timeout: 20_000,
  }) as unknown as RettiwtClient;
}

export class RettiwtSource implements XPostSource {
  constructor(private readonly client: RettiwtClient) {}

  async resolveUser(username: string) {
    try {
      return await fetchRettiwtUser(this.client, username);
    } catch (error) {
      translateRettiwtError(error);
    }
  }

  async fetchPostPage(input: XPostPageInput) {
    try {
      return await fetchRettiwtPostPage(this.client, input);
    } catch (error) {
      translateRettiwtError(error);
    }
  }
}

export function createXPostSource({
  provider,
  apiKey,
  random,
}: {
  provider: string;
  apiKey: string;
  random?: () => number;
}): XPostSource {
  if (provider !== "rettiwt") {
    throw new Error(`Unsupported X post provider: ${String(provider)}`);
  }
  return new RettiwtSource(createRettiwtClient(apiKey, random));
}
```

- [ ] **Step 8: Move local sync and backfill to `XPostSource`**

In `src/lib/pipeline/sync.ts` and `src/lib/pipeline/backfill.ts`, create one
source:

```ts
const xSource = createXPostSource({
  provider: config.xPostProvider,
  apiKey: config.rettiwtApiKey,
});
```

Replace `fetchRettiwtUser(client, username)` with
`xSource.resolveUser(username)`, replace page calls with
`xSource.fetchPostPage(input)`, and update the local multi-page helper to accept
`XPostSource` rather than `RettiwtClient`. Preserve all current source filtering,
pagination, and metadata behavior.

- [ ] **Step 9: Run focused and related Node tests**

Run:

```bash
pnpm test src/lib/pipeline/config.test.ts src/lib/pipeline/x.test.ts
pnpm typecheck
```

Expected: focused tests PASS and TypeScript reports no errors.

## Task 2: Add the Provider Contract and Pure Controls to the Edge Runtime

**Files:**
- Modify: `supabase/functions/_shared/x.ts`
- Create: `supabase/functions/_shared/ingestion-control.ts`
- Modify: `src/lib/pipeline/edge-shared.test.ts`

- [ ] **Step 1: Write failing Edge adapter and control tests**

Add to `src/lib/pipeline/edge-shared.test.ts`:

```ts
import {
  RettiwtSource,
  XSourceAuthenticationError,
  createXPostSource,
  rettiwtDelayMs,
} from "../../../supabase/functions/_shared/x";
import {
  alertRetryMinutes,
  credentialFingerprint,
  parseIngestionMode,
} from "../../../supabase/functions/_shared/ingestion-control";

it("parses scheduled and manual ingestion modes", () => {
  expect(parseIngestionMode({ mode: "scheduled" })).toBe("scheduled");
  expect(parseIngestionMode({ mode: "manual" })).toBe("manual");
  expect(parseIngestionMode({})).toBe("manual");
  expect(() => parseIngestionMode({ mode: "other" })).toThrow(
    "Unsupported ingestion mode: other",
  );
});

it("uses capped Telegram retry delays", () => {
  expect([0, 1, 2, 3, 10].map(alertRetryMinutes)).toEqual([
    5, 15, 60, 60, 60,
  ]);
});

it("hashes credentials without returning the credential", async () => {
  const fingerprint = await credentialFingerprint("secret-cookie-value");
  expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
  expect(fingerprint).not.toContain("secret-cookie-value");
});

it("provides the same Rettiwt source boundary in Edge", async () => {
  expect(rettiwtDelayMs(() => 0)).toBe(750);
  expect(
    createXPostSource({
      provider: "rettiwt",
      apiKey: "session",
      random: () => 0,
    }),
  ).toBeInstanceOf(RettiwtSource);

  const client: RettiwtClient = {
    user: {
      details: vi.fn().mockRejectedValue({ status: 401 }),
      replies: vi.fn(),
    },
  };
  await expect(
    new RettiwtSource(client).resolveUser("test"),
  ).rejects.toBeInstanceOf(XSourceAuthenticationError);
});
```

- [ ] **Step 2: Run the Edge shared tests and verify RED**

Run:

```bash
pnpm test src/lib/pipeline/edge-shared.test.ts
```

Expected: FAIL because the adapter and control helpers are missing.

- [ ] **Step 3: Mirror the source contract in Edge**

Apply the same `XPostSource`, `RettiwtSource`,
`XSourceAuthenticationError`, `isRettiwtAuthenticationError`,
`rettiwtDelayMs`, and `createXPostSource` implementation from Task 1 to
`supabase/functions/_shared/x.ts`. Keep the Edge-only cursor transition helpers
and current author filtering intact.

- [ ] **Step 4: Implement pure ingestion controls**

Create `supabase/functions/_shared/ingestion-control.ts`:

```ts
export type IngestionMode = "scheduled" | "manual";

export function parseIngestionMode(body: unknown): IngestionMode {
  const mode =
    body && typeof body === "object" && "mode" in body
      ? (body as { mode?: unknown }).mode
      : undefined;
  if (mode === undefined) return "manual";
  if (mode === "scheduled" || mode === "manual") return mode;
  throw new Error(`Unsupported ingestion mode: ${String(mode)}`);
}

export async function credentialFingerprint(credential: string) {
  const bytes = new TextEncoder().encode(credential);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function authenticationAlertEventKey(
  jobName: string,
  fingerprint: string,
) {
  return `${jobName}:auth:${fingerprint}`;
}

export function runAlertEventKey(jobName: string, runId: string) {
  return `${jobName}:run:${runId}`;
}

export function alertRetryMinutes(completedAttempts: number) {
  if (completedAttempts <= 0) return 5;
  if (completedAttempts === 1) return 15;
  return 60;
}
```

- [ ] **Step 5: Run the Edge shared tests and verify GREEN**

Run:

```bash
pnpm test src/lib/pipeline/edge-shared.test.ts
```

Expected: all Edge shared helper tests PASS.

## Task 3: Add Persistent Scheduling, Circuit Breaking, and the Alert Outbox

**Files:**
- Create: `supabase/migrations/20260719131500_x_ingestion_resilience.sql`
- Modify: `supabase/tests/serenity_scheduled_pipeline.sql`

- [ ] **Step 1: Write failing SQL assertions**

Before the final `rollback` in
`supabase/tests/serenity_scheduled_pipeline.sql`, add a `do` block that:

```sql
declare
  decision record;
  fingerprint_a text := repeat('a', 64);
  fingerprint_b text := repeat('b', 64);
begin
  select * into decision
  from public.claim_pipeline_schedule(
    'test-x-ingestion',
    'scheduled',
    fingerprint_a
  );

  if decision.decision not in ('due', 'credential_changed') then
    raise exception 'first schedule claim must be due';
  end if;

  if decision.delay_minutes not in (30, 35, 40, 45) then
    raise exception 'schedule delay must be a supported jitter bucket';
  end if;

  select * into decision
  from public.claim_pipeline_schedule(
    'test-x-ingestion',
    'scheduled',
    fingerprint_a
  );
  if decision.decision <> 'not_due' then
    raise exception 'early scheduled claim must skip';
  end if;

  perform public.block_pipeline_auth(
    'test-x-ingestion',
    fingerprint_a,
    'test-x-ingestion:auth:' || fingerprint_a,
    'Authentication failed'
  );

  select * into decision
  from public.claim_pipeline_schedule(
    'test-x-ingestion',
    'manual',
    fingerprint_a
  );
  if decision.decision <> 'auth_blocked' then
    raise exception 'same fingerprint must remain blocked';
  end if;

  select * into decision
  from public.claim_pipeline_schedule(
    'test-x-ingestion',
    'manual',
    fingerprint_b
  );
  if decision.decision <> 'credential_changed' then
    raise exception 'new fingerprint must reopen the circuit';
  end if;

  perform public.block_pipeline_auth(
    'test-x-ingestion',
    fingerprint_b,
    'test-x-ingestion:auth:' || fingerprint_b,
    'Authentication failed'
  );
  perform public.block_pipeline_auth(
    'test-x-ingestion',
    fingerprint_b,
    'test-x-ingestion:auth:' || fingerprint_b,
    'Authentication failed'
  );

  if (
    select count(*)
    from public.pipeline_alerts
    where event_key = 'test-x-ingestion:auth:' || fingerprint_b
  ) <> 1 then
    raise exception 'authentication event must be unique';
  end if;
end;
```

Also assert `anon` and `authenticated` have no table privileges on
`pipeline_schedules` or `pipeline_alerts`.

- [ ] **Step 2: Run database tests and verify RED**

Run:

```bash
pnpm supabase db start
pnpm supabase db reset
pnpm supabase test db supabase/tests/serenity_scheduled_pipeline.sql
```

Expected: SQL test FAIL because the new tables and RPCs do not exist. If Docker
or the local Supabase runtime is unavailable, record that environment blocker
and continue only after verifying the SQL later through an available database.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/20260719131500_x_ingestion_resilience.sql` with:

```sql
begin;

create table public.pipeline_schedules (
  job_name text primary key,
  state text not null default 'active'
    check (state in ('active', 'auth_blocked')),
  next_run_at timestamptz not null default now(),
  blocked_credential_fingerprint text,
  auth_blocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (btrim(job_name) <> ''),
  check (
    (state = 'active'
      and blocked_credential_fingerprint is null
      and auth_blocked_at is null)
    or
    (state = 'auth_blocked'
      and blocked_credential_fingerprint ~ '^[0-9a-f]{64}$'
      and auth_blocked_at is not null)
  )
);

create table public.pipeline_alerts (
  id bigint generated always as identity primary key,
  event_key text not null unique check (btrim(event_key) <> ''),
  kind text not null check (
    kind in ('ingestion_failure', 'authentication_blocked', 'ingestion_recovery')
  ),
  message text not null check (btrim(message) <> ''),
  status text not null default 'pending'
    check (status in ('pending', 'sent')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'pending' and sent_at is null)
    or (status = 'sent' and sent_at is not null)
  ),
  check (last_error is null or jsonb_typeof(last_error) = 'object')
);

create index pipeline_schedules_next_run_idx
  on public.pipeline_schedules (next_run_at)
  where state = 'active';
create index pipeline_alerts_due_idx
  on public.pipeline_alerts (next_attempt_at, id)
  where status = 'pending';

create trigger pipeline_schedules_set_updated_at
before update on public.pipeline_schedules
for each row execute function private.set_updated_at();

create trigger pipeline_alerts_set_updated_at
before update on public.pipeline_alerts
for each row execute function private.set_updated_at();

alter table public.pipeline_schedules enable row level security;
alter table public.pipeline_alerts enable row level security;

create or replace function public.claim_pipeline_schedule(
  p_job_name text,
  p_mode text,
  p_credential_fingerprint text
)
returns table (
  decision text,
  next_run_at timestamptz,
  delay_minutes integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  schedule public.pipeline_schedules%rowtype;
  chosen_delay integer;
  was_blocked boolean;
begin
  if p_job_name is null or btrim(p_job_name) = '' then
    raise exception 'job_name is required' using errcode = '22023';
  end if;
  if p_mode not in ('scheduled', 'manual') then
    raise exception 'mode must be scheduled or manual' using errcode = '22023';
  end if;
  if p_credential_fingerprint is null
    or p_credential_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'credential fingerprint must be SHA-256 hex'
      using errcode = '22023';
  end if;

  insert into public.pipeline_schedules (job_name)
  values (p_job_name)
  on conflict (job_name) do nothing;

  select * into schedule
  from public.pipeline_schedules
  where job_name = p_job_name
  for update;

  was_blocked := schedule.state = 'auth_blocked';

  if schedule.state = 'auth_blocked'
    and schedule.blocked_credential_fingerprint = p_credential_fingerprint then
    return query select
      'auth_blocked'::text,
      schedule.next_run_at,
      null::integer;
    return;
  end if;

  if schedule.state = 'active'
    and p_mode = 'scheduled'
    and schedule.next_run_at > now() then
    return query select
      'not_due'::text,
      schedule.next_run_at,
      null::integer;
    return;
  end if;

  chosen_delay := 30 + floor(random() * 4)::integer * 5;
  update public.pipeline_schedules
  set
    state = 'active',
    next_run_at = now() + make_interval(mins => chosen_delay),
    blocked_credential_fingerprint = null,
    auth_blocked_at = null
  where job_name = p_job_name
  returning * into schedule;

  return query select
    case
      when was_blocked then 'credential_changed'::text
      else 'due'::text
    end,
    schedule.next_run_at,
    chosen_delay;
end;
$$;
```

Complete the migration with:

```sql
create or replace function public.block_pipeline_auth(
  p_job_name text,
  p_credential_fingerprint text,
  p_event_key text,
  p_message text
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  update public.pipeline_schedules
  set
    state = 'auth_blocked',
    blocked_credential_fingerprint = p_credential_fingerprint,
    auth_blocked_at = now()
  where job_name = p_job_name;

  if not found then
    insert into public.pipeline_schedules (
      job_name,
      state,
      blocked_credential_fingerprint,
      auth_blocked_at
    )
    values (
      p_job_name,
      'auth_blocked',
      p_credential_fingerprint,
      now()
    );
  end if;

  insert into public.pipeline_alerts (event_key, kind, message)
  values (p_event_key, 'authentication_blocked', p_message)
  on conflict (event_key) do nothing;
end;
$$;

revoke all on public.pipeline_schedules, public.pipeline_alerts
  from anon, authenticated;
grant all on public.pipeline_schedules, public.pipeline_alerts
  to service_role;
revoke all on sequence public.pipeline_alerts_id_seq
  from anon, authenticated;
grant usage, select on sequence public.pipeline_alerts_id_seq
  to service_role;
revoke execute on function public.claim_pipeline_schedule(text, text, text)
  from public, anon, authenticated;
revoke execute on function public.block_pipeline_auth(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.claim_pipeline_schedule(text, text, text)
  to service_role;
grant execute on function public.block_pipeline_auth(text, text, text, text)
  to service_role;

commit;
```

- [ ] **Step 4: Run database reset and tests and verify GREEN**

Run:

```bash
pnpm supabase db reset
pnpm supabase test db supabase/tests/serenity_scheduled_pipeline.sql
pnpm supabase db lint
```

Expected: migration applies, SQL assertions PASS, and database lint reports no
new issues.

## Task 4: Add Typed Schedule and Outbox Database Helpers

**Files:**
- Modify: `supabase/functions/_shared/database.ts`
- Modify: `src/lib/pipeline/edge-shared.test.ts`

- [ ] **Step 1: Write failing pure result-normalization tests**

Add to `src/lib/pipeline/edge-shared.test.ts`:

```ts
import {
  normalizeScheduleClaim,
  type ScheduleClaim,
} from "../../../supabase/functions/_shared/database";

it("normalizes the single-row schedule RPC response", () => {
  expect(
    normalizeScheduleClaim([
      {
        decision: "not_due",
        next_run_at: "2026-07-19T13:00:00.000Z",
        delay_minutes: null,
      },
    ]),
  ).toEqual({
    decision: "not_due",
    nextRunAt: "2026-07-19T13:00:00.000Z",
    delayMinutes: null,
  } satisfies ScheduleClaim);
});

it("rejects an invalid schedule decision", () => {
  expect(() =>
    normalizeScheduleClaim([{ decision: "unknown" }]),
  ).toThrow("Invalid pipeline schedule claim response");
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm test src/lib/pipeline/edge-shared.test.ts
```

Expected: FAIL because the database helper API is absent.

- [ ] **Step 3: Add database helpers**

Add to `supabase/functions/_shared/database.ts`:

```ts
export type ScheduleDecision =
  | "due"
  | "not_due"
  | "auth_blocked"
  | "credential_changed";

export interface ScheduleClaim {
  decision: ScheduleDecision;
  nextRunAt: string;
  delayMinutes: number | null;
}

export function normalizeScheduleClaim(value: unknown): ScheduleClaim {
  const row = Array.isArray(value) ? value[0] : undefined;
  if (!row || typeof row !== "object") {
    throw new Error("Invalid pipeline schedule claim response");
  }
  const candidate = row as Record<string, unknown>;
  if (
    !["due", "not_due", "auth_blocked", "credential_changed"].includes(
      String(candidate.decision),
    ) ||
    typeof candidate.next_run_at !== "string" ||
    !(
      candidate.delay_minutes === null ||
      typeof candidate.delay_minutes === "number"
    )
  ) {
    throw new Error("Invalid pipeline schedule claim response");
  }
  return {
    decision: candidate.decision as ScheduleDecision,
    nextRunAt: candidate.next_run_at,
    delayMinutes: candidate.delay_minutes as number | null,
  };
}

export async function claimPipelineSchedule(
  client: SupabaseClient,
  jobName: string,
  mode: "scheduled" | "manual",
  credentialFingerprint: string,
) {
  const { data, error } = await client.rpc("claim_pipeline_schedule", {
    p_job_name: jobName,
    p_mode: mode,
    p_credential_fingerprint: credentialFingerprint,
  });
  if (error) throw new Error(`Schedule claim failed: ${error.message}`);
  return normalizeScheduleClaim(data);
}

export async function enqueuePipelineAlert(
  client: SupabaseClient,
  alert: { eventKey: string; kind: string; message: string },
) {
  const { error } = await client.from("pipeline_alerts").upsert(
    {
      event_key: alert.eventKey,
      kind: alert.kind,
      message: alert.message,
    },
    { onConflict: "event_key", ignoreDuplicates: true },
  );
  if (error) throw new Error(`Pipeline alert enqueue failed: ${error.message}`);
}

export async function blockPipelineAuthentication(
  client: SupabaseClient,
  input: {
    jobName: string;
    credentialFingerprint: string;
    eventKey: string;
    message: string;
  },
) {
  const { error } = await client.rpc("block_pipeline_auth", {
    p_job_name: input.jobName,
    p_credential_fingerprint: input.credentialFingerprint,
    p_event_key: input.eventKey,
    p_message: input.message,
  });
  if (error) throw new Error(`Authentication block failed: ${error.message}`);
}
```

Add the following typed helpers. Import `alertRetryMinutes` from
`./ingestion-control.ts`.

```ts
export interface PendingPipelineAlert {
  id: number;
  message: string;
  attempts: number;
}

export async function listDuePipelineAlerts(
  client: SupabaseClient,
  limit = 10,
): Promise<PendingPipelineAlert[]> {
  const { data, error } = await client
    .from("pipeline_alerts")
    .select("id,message,attempts")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("id")
    .limit(limit);
  if (error) throw new Error(`Pipeline alert lookup failed: ${error.message}`);
  return (data ?? []) as PendingPipelineAlert[];
}

export async function markPipelineAlertSent(
  client: SupabaseClient,
  alertId: number,
) {
  const { error } = await client
    .from("pipeline_alerts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      last_error: null,
    })
    .eq("id", alertId)
    .eq("status", "pending");
  if (error) throw new Error(`Pipeline alert update failed: ${error.message}`);
}

export async function reschedulePipelineAlert(
  client: SupabaseClient,
  alert: PendingPipelineAlert,
  error: unknown,
) {
  const nextAttemptAt = new Date(
    Date.now() + alertRetryMinutes(alert.attempts) * 60_000,
  ).toISOString();
  const { error: updateError } = await client
    .from("pipeline_alerts")
    .update({
      attempts: alert.attempts + 1,
      next_attempt_at: nextAttemptAt,
      last_error: errorDetails(error),
    })
    .eq("id", alert.id)
    .eq("status", "pending");
  if (updateError) {
    throw new Error(
      `Pipeline alert reschedule failed: ${updateError.message}`,
    );
  }
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
pnpm test src/lib/pipeline/edge-shared.test.ts
```

Expected: database normalization and all earlier shared tests PASS.

## Task 5: Make Telegram Alerts Durable and Explicit

**Files:**
- Modify: `supabase/functions/_shared/telegram.ts`
- Modify: `src/lib/pipeline/telegram.test.ts`

- [ ] **Step 1: Write failing authentication-message tests**

Add to `src/lib/pipeline/telegram.test.ts`:

```ts
import { formatAuthenticationBlocked } from
  "../../../supabase/functions/_shared/telegram";

it("states that authentication failure stops X collection", () => {
  const message = formatAuthenticationBlocked({
    sourceKey: "x:stocksavvyshay",
    error: "Rettiwt authentication failed",
    fetched: 0,
    inserted: 0,
    pages: 1,
    occurredAt: "2026-07-19T12:04:48.000Z",
  });

  expect(message).toContain("🔴 X 인증 실패 · 수집 중단");
  expect(message).toContain("같은 인증정보로 재시도하지 않습니다");
  expect(message).toContain("Supabase RETTIWT_API_KEY를 교체");
  expect(message).not.toMatch(/auth_token|ct0|twid|fingerprint/i);
});
```

Retain the existing success, recovery, ordinary failure, and Telegram API tests.

- [ ] **Step 2: Run Telegram tests and verify RED**

Run:

```bash
pnpm test src/lib/pipeline/telegram.test.ts
```

Expected: FAIL because `formatAuthenticationBlocked` is missing.

- [ ] **Step 3: Implement the blocked-auth formatter**

Add to `supabase/functions/_shared/telegram.ts`:

```ts
export function formatAuthenticationBlocked(summary: FailureSummary) {
  return [
    "🔴 X 인증 실패 · 수집 중단",
    "",
    `대상: ${summary.sourceKey ?? "확인 불가"}`,
    `오류: ${singleLine(summary.error) || "알 수 없는 오류"}`,
    `진행: 조회 ${summary.fetched}개 / 저장 ${summary.inserted}개 / ${summary.pages}페이지`,
    "상태: 같은 인증정보로 재시도하지 않습니다.",
    "조치: Supabase RETTIWT_API_KEY를 교체하세요.",
    `시각: ${kstTimestamp(summary.occurredAt)} KST`,
  ].join("\n");
}
```

- [ ] **Step 4: Run Telegram tests and verify GREEN**

Run:

```bash
pnpm test src/lib/pipeline/telegram.test.ts
```

Expected: all Telegram formatting and transport tests PASS.

## Task 6: Integrate Schedule, Breaker, Source, and Outbox in `ingest-x`

**Files:**
- Modify: `supabase/functions/ingest-x/index.ts`
- Modify: `src/lib/pipeline/edge-shared.test.ts`

- [ ] **Step 1: Add a failing decision-gate test**

Extract and test a pure helper in
`supabase/functions/_shared/ingestion-control.ts`:

```ts
export function shouldContactX(
  decision: "due" | "not_due" | "auth_blocked" | "credential_changed",
) {
  return decision === "due" || decision === "credential_changed";
}
```

Test:

```ts
it("contacts X only for due or changed credentials", () => {
  expect(shouldContactX("due")).toBe(true);
  expect(shouldContactX("credential_changed")).toBe(true);
  expect(shouldContactX("not_due")).toBe(false);
  expect(shouldContactX("auth_blocked")).toBe(false);
});
```

- [ ] **Step 2: Run the helper test and verify RED, then implement it**

Run:

```bash
pnpm test src/lib/pipeline/edge-shared.test.ts
```

Expected before implementation: FAIL because `shouldContactX` is missing.
Add the helper exactly as above and rerun until PASS.

- [ ] **Step 3: Replace direct Rettiwt dependencies**

In `supabase/functions/ingest-x/index.ts`:

- import `createXPostSource`, `XSourceAuthenticationError`, and
  `XPostSource`;
- change `loadOrCreateCursor` to accept `XPostSource`;
- call `source.resolveUser(username)` and `source.fetchPostPage(input)`;
- create the source with:

```ts
const provider = Deno.env.get("X_POST_PROVIDER")?.trim() || "rettiwt";
const xSource = createXPostSource({
  provider,
  apiKey: rettiwtApiKey,
});
```

Validate the runtime value in `createXPostSource` and throw for unsupported
providers.

- [ ] **Step 4: Gate requests with lease, mode, fingerprint, and schedule**

After authorization and environment validation:

```ts
const body = await request.json().catch(() => ({}));
const mode = parseIngestionMode(body);
const fingerprint = await credentialFingerprint(rettiwtApiKey);

hasLease = await acquireLease(client, jobName, ownerId);
if (!hasLease) {
  return jsonResponse({ status: "skipped", reason: "lease_held", counts });
}

const schedule = await claimPipelineSchedule(
  client,
  jobName,
  mode,
  fingerprint,
);
await drainPendingTelegramAlerts(client, telegram);

if (!shouldContactX(schedule.decision)) {
  return jsonResponse({
    status: "skipped",
    reason: schedule.decision,
    nextRunAt: schedule.nextRunAt,
    counts,
  });
}
```

Create the pipeline run only after this gate. Include provider, mode,
`schedule.delayMinutes`, and runtime in metadata, but never the fingerprint.

- [ ] **Step 5: Add durable alert draining**

Replace direct `notifyTelegram` with a helper that:

1. returns immediately when Telegram config is absent;
2. selects due `pending` alerts in ID order with a small fixed limit;
3. calls `sendTelegramMessage`;
4. marks success as `sent`;
5. on failure, logs a sanitized error and calls the reschedule helper;
6. never throws into X ingestion.

Call it:

- once after the schedule claim, including skipped calls;
- after enqueueing a success/recovery alert;
- after enqueueing an ordinary failure alert;
- after atomically blocking authentication.

- [ ] **Step 6: Implement distinct failure paths**

In the handler catch:

```ts
const details = errorDetails(error);
if (runId) await finishRun(client, runId, "failed", counts, error);
if (activeSourceKey) {
  await client
    .from("ingestion_cursors")
    .update({ last_error: details })
    .eq("source_key", activeSourceKey);
}

if (error instanceof XSourceAuthenticationError) {
  const message = formatAuthenticationBlocked({
    sourceKey: activeSourceKey,
    error: details.message,
    fetched: counts.fetched,
    inserted: counts.inserted,
    pages: counts.pages,
    occurredAt: new Date().toISOString(),
  });
  await blockPipelineAuthentication(client, {
    jobName,
    credentialFingerprint: fingerprint,
    eventKey: authenticationAlertEventKey(jobName, fingerprint),
    message,
  });
  await drainPendingTelegramAlerts(client, telegram);
  return jsonResponse(
    {
      error: {
        code: "x_auth_blocked",
        message: "X authentication failed; collection is blocked until the credential changes.",
      },
      counts,
    },
    503,
  );
}

await enqueuePipelineAlert(client, {
  eventKey: runAlertEventKey(jobName, runId ?? crypto.randomUUID()),
  kind: "ingestion_failure",
  message: formatIngestionFailure({
    sourceKey: activeSourceKey,
    error: details.message,
    fetched: counts.fetched,
    inserted: counts.inserted,
    pages: counts.pages,
    occurredAt: new Date().toISOString(),
  }),
});
await drainPendingTelegramAlerts(client, telegram);
return jsonResponse({ error: details, counts }, 500);
```

On successful ingestion, enqueue the existing success/recovery message with the
run ID as its unique event key, drain it, and preserve the current rule that a
normal empty successful run sends no message.

- [ ] **Step 7: Run all focused ingestion helper tests**

Run:

```bash
pnpm test src/lib/pipeline/edge-shared.test.ts src/lib/pipeline/telegram.test.ts src/lib/pipeline/x.test.ts
pnpm typecheck
```

Expected: focused tests PASS and TypeScript reports no errors.

## Task 7: Update Manual Invocation, Cron Wake-Up, and Operator Docs

**Files:**
- Modify: `src/lib/pipeline/edge-functions.ts`
- Modify: `src/lib/pipeline/edge-functions.test.ts`
- Modify: `supabase/sql/configure_scheduled_pipeline.sql`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Write a failing manual-mode request test**

Add to `src/lib/pipeline/edge-functions.test.ts`:

```ts
it("marks hosted ingestion as a manual request", async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify({ status: "completed" }), { status: 200 }),
  );

  await invokeScheduledFunction("ingest-x", config, fetcher);

  expect(fetcher).toHaveBeenCalledWith(
    "https://serenity.supabase.co/functions/v1/ingest-x",
    expect.objectContaining({
      body: JSON.stringify({ mode: "manual" }),
    }),
  );
});
```

- [ ] **Step 2: Run the invocation tests and verify RED**

Run:

```bash
pnpm test src/lib/pipeline/edge-functions.test.ts
```

Expected: FAIL because the request body is currently `{}`.

- [ ] **Step 3: Send explicit manual mode**

In `invokeScheduledFunction`, use:

```ts
body: JSON.stringify(
  functionName === "ingest-x" ? { mode: "manual" } : {},
),
```

Retain the current headers, timeout, error propagation, and sequential
ingest-before-analysis behavior.

- [ ] **Step 4: Run invocation tests and verify GREEN**

Run:

```bash
pnpm test src/lib/pipeline/edge-functions.test.ts
```

Expected: all hosted invocation tests PASS.

- [ ] **Step 5: Change the scheduled wake-up**

In `supabase/sql/configure_scheduled_pipeline.sql`, change only ingestion:

```sql
select cron.schedule(
  'serenity-ingest-x',
  '*/5 * * * *',
  $$
  select net.http_post(
    -- preserve the current URL and secret headers
    body := '{"mode":"scheduled"}'::jsonb,
    timeout_milliseconds := 140000
  );
  $$
);
```

Leave the analysis schedule unchanged at `2-59/15 * * * *`; analysis may safely
process queued work independently of skipped ingestion wake-ups.

- [ ] **Step 6: Document provider and recovery behavior**

Add to `.env.example`:

```dotenv
X_POST_PROVIDER=rettiwt
```

Update `README.md` without overwriting the current analyst-source edits:

- the cron wakes every five minutes but X calls occur every random
  30/35/40/45 minutes;
- Rettiwt waits 750–1,500 ms and does not retry a request in-process;
- authentication failure opens a persistent circuit and produces an outbox
  Telegram alert;
- the same key is never tried again by scheduled or manual sync;
- replace `RETTIWT_API_KEY` to reopen automatically;
- Telegram delivery retries do not cause X retries;
- `X_POST_PROVIDER` currently accepts only `rettiwt`;
- the official X API adapter remains future work.

## Task 8: Full Verification and Diff Audit

**Files:**
- Review every file listed in the File Map.
- Do not modify unrelated user-owned files.

- [ ] **Step 1: Run the complete automated verification**

Run fresh:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: every command exits 0 with no test failures, lint errors, type errors,
or build failures.

- [ ] **Step 2: Run database verification**

When the local Supabase runtime is available:

```bash
pnpm supabase db reset
pnpm supabase test db supabase/tests/serenity_scheduled_pipeline.sql
pnpm supabase db lint
```

Expected: migration applies, scheduled-pipeline SQL tests PASS, and DB lint
reports no new errors. If unavailable, capture the exact Docker/Supabase error
and report database verification as outstanding.

- [ ] **Step 3: Audit secret handling and request paths**

Run:

```bash
rg -n --hidden -S \
  "auth_token=|ct0=|twid=|blocked_credential_fingerprint|RETTIWT_API_KEY" \
  src supabase README.md .env.example \
  -g '!node_modules'
```

Confirm:

- no real credential value exists in tracked files;
- fingerprint never appears in logs, HTTP responses, or Telegram formatting;
- `auth_blocked` paths do not call `resolveUser` or `fetchPostPage`;
- Telegram retries only invoke Telegram.

- [ ] **Step 4: Review the final diff against the pre-existing dirty tree**

Run:

```bash
git status --short
git diff --check
git diff -- \
  .env.example \
  README.md \
  src/lib/pipeline/config.ts \
  src/lib/pipeline/config.test.ts \
  src/lib/pipeline/x.ts \
  src/lib/pipeline/x.test.ts \
  src/lib/pipeline/sync.ts \
  src/lib/pipeline/backfill.ts \
  src/lib/pipeline/edge-functions.ts \
  src/lib/pipeline/edge-functions.test.ts \
  src/lib/pipeline/edge-shared.test.ts \
  src/lib/pipeline/telegram.test.ts \
  supabase/functions/_shared/x.ts \
  supabase/functions/_shared/ingestion-control.ts \
  supabase/functions/_shared/database.ts \
  supabase/functions/_shared/telegram.ts \
  supabase/functions/ingest-x/index.ts \
  supabase/migrations/20260719131500_x_ingestion_resilience.sql \
  supabase/tests/serenity_scheduled_pipeline.sql \
  supabase/sql/configure_scheduled_pipeline.sql
```

Confirm every approved requirement is represented and all pre-existing analyst,
filtering, DeepSeek, Telegram recovery, and ingestion edits remain present.

- [ ] **Step 5: Report verified outcomes without committing user-owned edits**

Report:

- provider abstraction status;
- random request and schedule behavior;
- breaker and credential-change behavior;
- Telegram outbox delivery semantics;
- exact verification commands and results;
- any database-runtime blocker;
- the migration and deployment commands the operator must run.
