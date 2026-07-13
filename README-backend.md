# Nox Cheats — backend

The frontend (`index.html`, `store.html`, `collection.html`, `product.html`) works on
its own as a static site. `server.js` adds the store's brains: accounts, checkout,
license‑key delivery, and an admin panel — the same feature set Halo Cheats ran on.

Nothing secret is committed. All keys live in `.env` (which is git‑ignored). The
server starts even with an empty `.env`; each unconfigured service simply returns a
clear "not configured" response instead of crashing.

---

## What `server.js` contains

**Auth (Supabase Auth, sessions in httpOnly cookies)**
- `POST /api/auth/sign-up` — email + password, optional username.
- `POST /api/auth/sign-in` — email + password.
- `POST /api/auth/sign-out` — clears the session cookies.
- `GET  /api/auth/session` — the current user, or `null`.
- `GET  /api/auth/role` — the signed‑in user's role.
- `GET  /api/auth/discord` → `GET /api/auth/discord/callback` — Discord OAuth login.
  A Discord login maps to a Supabase user with a synthetic email and a
  server‑derived password, so it gets a normal session. The Discord id/username
  are stored in the user's `app_metadata`.

**Products**
- `GET /api/products` — the catalog from `data/catalog.json`, with live in/out‑of‑stock
  per variant based on unused keys. **Prices come from the server, never the browser.**

**Checkout (Stripe)**
- `POST /api/create-checkout-session` — buy‑now for one variant. Signed‑in only.
  Verifies stock, creates a `pending` order, returns a Stripe Checkout URL.
- `POST /api/cart/checkout` — multi‑item cart. One Stripe session, one order row
  per unit, so each delivered key maps to its own order. Checks stock for every line.
- `POST /api/stripe/webhook` — the only place orders become `fulfilled`. On
  `checkout.session.completed` it claims an unused key per order, attaches it, and
  (if a Discord bot token is set and the buyer used Discord) DMs the key.

**Wallet / balance**
- `GET /api/balance` — the signed‑in user's balance.
- `POST /api/wallet/topup` — add funds via Stripe (credited by the webhook).
- `POST /api/purchase-with-balance` / `POST /api/cart/checkout-balance` — pay from balance, delivers keys immediately.

**Reviews** (verified‑purchase only)
- `GET /api/reviews`, `GET /api/reviews/product/:slug` — public.
- `GET /api/reviews/eligible`, `POST /api/reviews` — signed‑in.

**Support desk**
- `GET/POST /api/desk/tickets`, `GET /api/desk/tickets/:id`, `POST /api/desk/tickets/:id/messages`.

**Promo codes**
- `POST /api/promo/validate`. Codes come from `PROMO_CODES` in `.env` (e.g. `WELCOME:10`) and apply across all checkout paths.

**Account**
- `GET /api/orders` — the signed‑in user's own orders and delivered keys.

**Extra pages:** `/reviews`, `/instructions` (setup guides), `/desk`, `/terms`, `/privacy`, `/refund`.

**Admin** (open to everyone while `ADMIN_OPEN=true`; set `false` to require the `admin` role)
- `GET  /api/admin/stats` — revenue, orders, stock, open tickets, reviews, store state.
- `GET  /api/admin/orders`, `POST /api/admin/orders/:id/status` — view + change order status (fulfilling delivers a key).
- `GET/POST /api/admin/keys` — key stock and bulk add.
- `GET  /api/admin/users`, `POST /api/admin/users/:id/role`, `POST /api/admin/users/:id/balance` — roles + wallet adjustments.
- `GET  /api/admin/reviews`, `DELETE /api/admin/reviews/:id` — moderate reviews.
- `GET  /api/admin/tickets`, `POST /api/admin/tickets/:id/close` — manage support tickets.
- `GET/POST /api/admin/settings` — store on/off switch.

**Pages served:** the static site, plus `/account.html` and `/admin.html`.
`.env`, `server.js`, `data/`, and `db/` are blocked from the web.

---

## Setup

### 1. Install
```
npm install
cp .env.example .env    # then edit .env
```

### 2. Supabase (accounts, orders, keys)
1. Create a project at supabase.com.
2. **SQL Editor → New query →** paste `db/schema.sql` and run it.
3. **Project Settings → API →** copy into `.env`:
   - Project URL → `SUPABASE_URL`
   - `anon` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_KEY` (server only — keep secret)
4. Optional: **Authentication → Providers → Email →** turn off "Confirm email" for
   instant sign‑in during testing.

### 3. Stripe (payments)
1. **Developers → API keys →** copy the secret key → `STRIPE_SECRET_KEY`.
2. **Developers → Webhooks → Add endpoint →** URL `{SITE_URL}/api/stripe/webhook`,
   event `checkout.session.completed`. Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
   - Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

### 4. Discord login (optional)
1. discord.com/developers → New Application → **OAuth2**.
2. Copy Client ID / Client Secret → `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`.
3. Add redirect `{SITE_URL}/api/auth/discord/callback` and match it in
   `DISCORD_REDIRECT_URI`.
4. Optional: a bot token in `DISCORD_BOT_TOKEN` lets the server DM keys to buyers.

### 4b. Discord order + support desk (optional)
Two integrations, both skipped if left blank:

- **Orders → purchases channel.** On the channel, open **Edit Channel → Integrations
  → Webhooks → New Webhook**, copy its URL into `DISCORD_ORDER_WEBHOOK_URL`. Every
  paid order (card or balance) is posted there automatically.
- **Two-way support desk.** Set `DISCORD_DESK_CHANNEL_ID` to a text channel's ID
  (enable **Developer Mode** in Discord settings, then right-click the channel →
  **Copy Channel ID**). Each web ticket opens a thread in that channel; a staff
  reply typed in the thread is written back to the member's ticket on the site, and
  member replies are echoed into the thread. This needs `DISCORD_BOT_TOKEN` set,
  the bot invited to your server (with **Manage Threads / Send Messages** in that
  channel), and the **Message Content Intent** enabled under Developer Portal → Bot.

### 5. Admin access
The admin panel is **open to everyone by default** (`ADMIN_OPEN=true` in `.env`) so
you can build and demo without logging in. To lock it down, set `ADMIN_OPEN=false`
and give yourself the admin role: put your email in `ADMIN_EMAILS`, and you're
granted `admin` on your first sign‑in. After that, manage roles from the panel.

### 6. Run
```
npm start
```
Open http://localhost:3000. Add keys in the admin panel before buying — checkout
refuses a variant with zero stock.

---

## Deploying
Host anywhere that runs Node (Render, Railway, Fly, a VPS). Set the same `.env`
variables in the host's dashboard, point `SITE_URL` at your real domain, and update
the Stripe webhook and Discord redirect URLs to match. **Never upload `.env` or
`node_modules`.**
