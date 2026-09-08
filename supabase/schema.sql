-- GoliDawayi — addresses and order history, per Clerk user.
--
-- Run this once in the Supabase SQL editor. It is written to be re-runnable:
-- every statement is guarded, so pasting it again after a change is safe.
--
-- Authentication is Clerk, not Supabase Auth. Clerk is registered as a
-- third-party auth provider, so the session token it issues arrives here as a
-- normal JWT and `auth.jwt() ->> 'sub'` is the Clerk user id. Every policy
-- below compares that to the row's user_id, which is what stops one customer
-- reading another's orders — the app holds only a publishable key, so row
-- level security is the whole of the protection.

-- ---------------------------------------------------------------- addresses

create table if not exists public.addresses (
  -- The Clerk user id, e.g. "user_2abc…". Text rather than uuid: it is Clerk's
  -- identifier, not one Postgres generated, and it is not a uuid.
  user_id text primary key,

  -- The composed line the WhatsApp message quotes. Kept alongside the parts
  -- because it is what was actually sent, and the parts can change after.
  text text not null default '',

  -- The parts, split by who owns them. `area` comes from the geocoder; the
  -- rest are typed by the customer and never overwritten by the app.
  area text,
  flat text,
  building text,
  landmark text,
  label text,

  latitude double precision,
  longitude double precision,
  accuracy double precision,

  -- "gps" | "search" | "manual". Not an enum: the app owns this vocabulary and
  -- an enum here would need a migration every time it gains a value.
  source text not null default 'manual',

  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.addresses enable row level security;

drop policy if exists "addresses are private to their owner" on public.addresses;
create policy "addresses are private to their owner"
  on public.addresses
  for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- ------------------------------------------------------------------- orders
--
-- One row per order the customer sent to WhatsApp. Nothing here was placed or
-- accepted in any system sense — the pharmacy answers on WhatsApp — so this is
-- the customer's own record of what they asked for.

create table if not exists public.orders (
  user_id text not null,

  -- The display id quoted in the message, e.g. "GD1042". Unique per customer
  -- rather than globally, which is all the message needs.
  id text not null,

  sent_at timestamptz not null default now(),
  kind text not null default 'medicines',

  -- Catalogue lines and hand-typed medicines, stored whole.
  --
  -- JSONB rather than an order_items table on purpose: these are read back as
  -- one blob to redisplay an order and are never queried across rows. A join
  -- table would buy nothing and cost a second round trip on every read.
  lines jsonb not null default '[]'::jsonb,
  typed_items jsonb not null default '[]'::jsonb,

  prescription_count integer not null default 0,

  -- Flattened at send time. The saved address can change afterwards, and the
  -- history has to keep saying where the order actually went.
  delivery_text text not null default '',

  needs_pharmacist_review boolean not null default false,

  primary key (user_id, id)
);

alter table public.orders enable row level security;

drop policy if exists "orders are private to their owner" on public.orders;
create policy "orders are private to their owner"
  on public.orders
  for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- Newest first is the only order the history is ever read in.
create index if not exists orders_user_sent_at_idx
  on public.orders (user_id, sent_at desc);
