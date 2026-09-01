-- Husk tables. Ignore other tables already in this Supabase project.
create extension if not exists pgcrypto;

create schema if not exists husk_lg;

create table if not exists calendar_snapshots (
  id uuid primary key default gen_random_uuid(),
  fetched_at timestamptz not null default now(),
  report_date text,
  hard_expiry_at timestamptz,
  horizon_days int,
  schema_version text,
  raw jsonb not null,
  stale boolean not null default false
);

create table if not exists calendar_events (
  id text primary key,
  source text not null,
  name text not null,
  category text not null,
  importance text not null,
  assets text[] not null default '{}',
  ts_utc timestamptz not null,
  ts_precision text not null,
  thesis text,
  stale boolean not null default false,
  snapshot_id uuid references calendar_snapshots (id),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key,
  wallet text not null,
  status text not null,
  intent jsonb not null,
  quote jsonb not null,
  route text,
  structure text,
  expiry_unix bigint,
  created_at timestamptz not null default now()
);

create table if not exists rfq_keypairs (
  id uuid primary key default gen_random_uuid(),
  wallet text not null,
  quotation_id text,
  public_key text not null,
  ciphertext text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists rfq_keypairs_wallet_qid
  on rfq_keypairs (wallet, quotation_id)
  where quotation_id is not null;

create table if not exists coverages (
  id uuid primary key,
  quote_id uuid references quotes (id),
  wallet text not null,
  asset text not null,
  event_id text,
  status text not null,
  route text not null,
  structure text not null,
  option_address text,
  quotation_id text,
  open_tx text,
  settle_tx text,
  payout_tx text,
  premium_usdc_onchain text,
  broker_fee_usdc text,
  max_payout_usdc text,
  expiry_unix bigint not null,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists fill_verifications (
  tx_hash text primary key,
  wallet text,
  option_address text,
  buyer_in_event text,
  ok boolean,
  reason text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  wallet text,
  langsmith_run_id text,
  input_text text,
  output jsonb,
  refused boolean,
  created_at timestamptz not null default now()
);

create index if not exists coverages_wallet_status on coverages (wallet, status);
create index if not exists coverages_expiry on coverages (expiry_unix);
create index if not exists calendar_events_ts on calendar_events (ts_utc);
create index if not exists quotes_wallet_created on quotes (wallet, created_at desc);

alter table calendar_snapshots enable row level security;
alter table calendar_events enable row level security;
alter table quotes enable row level security;
alter table rfq_keypairs enable row level security;
alter table coverages enable row level security;
alter table fill_verifications enable row level security;
alter table agent_runs enable row level security;

drop policy if exists calendar_events_public_read on calendar_events;
create policy calendar_events_public_read on calendar_events
  for select to anon, authenticated using (true);

grant select on calendar_events to anon, authenticated;
