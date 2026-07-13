-- ==========================================================================
-- Nox Cheats — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard > SQL > New query).
-- Users are handled by Supabase Auth; roles live in auth user app_metadata.
-- ==========================================================================

-- ---- License key inventory ----------------------------------------------
-- One row per key. "inventory_slug" is "<product-slug>-<variant-slug>",
-- e.g. "crusader-r6-1-day-key". A key is claimed on successful purchase.
create table if not exists public.license_keys (
  id             uuid primary key default gen_random_uuid(),
  inventory_slug text not null,
  key_value      text not null,
  status         text not null default 'unused' check (status in ('unused', 'used')),
  order_id       uuid,
  created_at     timestamptz not null default now(),
  used_at        timestamptz
);
create index if not exists license_keys_inventory_idx on public.license_keys (inventory_slug, status);
create unique index if not exists license_keys_value_uniq on public.license_keys (inventory_slug, key_value);

-- ---- Orders --------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  product_slug       text not null,
  product_name       text not null,
  variant_slug       text not null,
  variant_name       text not null,
  amount_cents       integer not null,
  currency           text not null default 'usd',
  method             text not null default 'card' check (method in ('card', 'balance')),
  status             text not null default 'pending'
                       check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  stripe_session_id  text,
  license_key        text,
  created_at         timestamptz not null default now(),
  fulfilled_at       timestamptz
);
create index if not exists orders_user_idx    on public.orders (user_id, created_at desc);
create index if not exists orders_session_idx on public.orders (stripe_session_id);

-- ---- Wallet (balance) ----------------------------------------------------
create table if not exists public.wallets (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  balance_cents integer not null default 0,
  updated_at   timestamptz not null default now()
);
-- Append-only ledger so every balance change is traceable.
create table if not exists public.wallet_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  delta_cents integer not null,
  reason      text not null,
  created_at  timestamptz not null default now()
);
create index if not exists wallet_ledger_user_idx on public.wallet_ledger (user_id, created_at desc);

-- ---- Reviews -------------------------------------------------------------
-- Only created by the server after verifying the user bought the product.
create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  username     text not null,
  rating       integer not null check (rating between 1 and 5),
  review_text  text not null,
  created_at   timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews (product_slug, created_at desc);
create unique index if not exists reviews_one_per_user_product on public.reviews (user_id, product_slug);

-- ---- Support desk (tickets) ---------------------------------------------
create table if not exists public.tickets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  subject           text not null,
  status            text not null default 'open' check (status in ('open', 'closed')),
  discord_thread_id text,               -- Discord thread this ticket is mirrored to (two-way desk)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists tickets_user_idx   on public.tickets (user_id, updated_at desc);
create index if not exists tickets_thread_idx on public.tickets (discord_thread_id);

-- author_id is nullable: staff replies that arrive from Discord have no site user.
create table if not exists public.ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.tickets (id) on delete cascade,
  author_id   uuid references auth.users (id) on delete set null,
  author_name text not null,
  is_staff    boolean not null default false,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists ticket_messages_idx on public.ticket_messages (ticket_id, created_at);

-- ---- Site settings (key/value) ------------------------------------------
-- Used for the store on/off switch and any future toggles.
create table if not exists public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);
insert into public.settings (key, value) values ('store_open', 'true')
  on conflict (key) do nothing;

-- ---- Row Level Security --------------------------------------------------
-- The server uses the service-role key, which BYPASSES RLS. These policies
-- only matter for anon-key reads from the browser. Public can read reviews;
-- users read their own orders/wallet/tickets; nobody reads license_keys.
alter table public.orders          enable row level security;
alter table public.license_keys    enable row level security;
alter table public.wallets         enable row level security;
alter table public.wallet_ledger   enable row level security;
alter table public.reviews         enable row level security;
alter table public.tickets         enable row level security;
alter table public.ticket_messages enable row level security;

drop policy if exists "orders: owner reads" on public.orders;
create policy "orders: owner reads" on public.orders for select using (auth.uid() = user_id);

drop policy if exists "wallet: owner reads" on public.wallets;
create policy "wallet: owner reads" on public.wallets for select using (auth.uid() = user_id);

drop policy if exists "reviews: public reads" on public.reviews;
create policy "reviews: public reads" on public.reviews for select using (true);

drop policy if exists "tickets: owner reads" on public.tickets;
create policy "tickets: owner reads" on public.tickets for select using (auth.uid() = user_id);
-- license_keys / wallet_ledger / ticket_messages: no anon policies => server only.
