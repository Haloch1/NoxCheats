/* ==========================================================================
   Nox Cheats — backend server
   Express app that serves the static storefront and provides:
     - Email/password + Discord OAuth login (cookie sessions, Supabase Auth)
     - Stripe Checkout + webhook
     - License-key delivery from inventory
     - Account orders/keys
     - Admin panel API (orders, key inventory, users + roles)

   Nothing here contains secrets — everything sensitive comes from .env.
   The server degrades gracefully: if a service isn't configured, its routes
   return a clear "not configured" error instead of crashing.
   ========================================================================== */

import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------- config -- */
const {
  PORT = 3000,
  SITE_URL = `http://localhost:${PORT}`,
  SESSION_SECRET = "",
  SUPABASE_URL = "",
  SUPABASE_ANON_KEY = "",
  SUPABASE_SERVICE_KEY = "",
  STRIPE_SECRET_KEY = "",
  STRIPE_WEBHOOK_SECRET = "",
  DISCORD_CLIENT_ID = "",
  DISCORD_CLIENT_SECRET = "",
  DISCORD_REDIRECT_URI = `${SITE_URL}/api/auth/discord/callback`,
  DISCORD_BOT_TOKEN = "",
  /* Text channel where a web ticket opens a Discord thread (two-way desk). */
  DISCORD_DESK_CHANNEL_ID = "",
  /* Webhook for the purchases channel — every paid order is posted here. */
  DISCORD_ORDER_WEBHOOK_URL = "",
  GOOGLE_CLIENT_ID = "",
  GOOGLE_CLIENT_SECRET = "",
  GOOGLE_REDIRECT_URI = `${SITE_URL}/api/auth/google/callback`,
  PROMO_CODES = "",
  ADMIN_EMAILS = "",
  /* "true" (default for now) lets ANYONE open the admin panel and its APIs.
     Set ADMIN_OPEN=false in .env to lock it back down to admins only. */
  ADMIN_OPEN = "true",
  /* Dev-only: DEV_LOGIN=true exposes a one-click test login (button + /api/dev/login).
     Leave blank/false in production and in the copy you ship to anyone else. */
  DEV_LOGIN = "",
} = process.env;

const ACCESS_COOKIE = "nox_access";
const REFRESH_COOKIE = "nox_refresh";
const adminEmails = ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
const adminOpen = ADMIN_OPEN !== "false";
const devLogin = DEV_LOGIN === "true";

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_KEY && SUPABASE_ANON_KEY);
const hasStripe = Boolean(STRIPE_SECRET_KEY);
const hasDiscord = Boolean(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET);
const hasGoogle = Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
const hasDeskBot = Boolean(DISCORD_BOT_TOKEN && DISCORD_DESK_CHANNEL_ID);
/* Set once the Discord desk bot has logged in. Routes use it to mirror
   tickets to Discord threads; stays null when the bot isn't configured. */
let deskBot = null;

/* Promo codes: "WELCOME:10,SAVE20:20" -> Map { WELCOME: 10, ... } */
const promoMap = new Map(
  PROMO_CODES.split(",")
    .map((pair) => pair.split(":"))
    .filter((p) => p.length === 2 && p[0].trim() && Number(p[1]) > 0)
    .map(([code, pct]) => [code.trim().toUpperCase(), Math.min(100, Number(pct))])
);
function lookupPromo(code) {
  const pct = promoMap.get(String(code || "").trim().toUpperCase());
  return pct ? { code: String(code).trim().toUpperCase(), percent: pct } : null;
}
/* Apply a percent discount to a cents amount, with a 50c floor (Stripe min). */
function applyPromo(amountCents, promo) {
  if (!promo) return amountCents;
  return Math.max(50, Math.round(amountCents * (1 - promo.percent / 100)));
}

/* Service-role client (server only — bypasses RLS). Anon client for password
   auth flows. Both null when unconfigured, guarded at every call site. */
const supabaseAdmin = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;
const supabaseAuth = hasSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;
const stripe = hasStripe ? new Stripe(STRIPE_SECRET_KEY) : null;

/* ---------------------------------------------------------------- catalog -- */
/* Server-authoritative product catalog. Prices come from here, never from the
   client, so the browser can't change what it's charged. */
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "catalog.json"), "utf8"));
const productBySlug = new Map(catalog.map((p) => [p.slug, p]));

function findVariant(productSlug, variantSlug) {
  const product = productBySlug.get(productSlug);
  if (!product) return null;
  const variant = (product.variants || []).find((v) => v.slug === variantSlug);
  if (!variant) return null;
  return { product, variant };
}

function inventorySlug(productSlug, variantSlug) {
  return `${productSlug}-${variantSlug}`;
}

/* ------------------------------------------------------------------- app --- */
const app = express();
app.set("trust proxy", 1);
app.use(cookieParser());

/* Stripe needs the RAW body to verify the webhook signature, so mount it
   BEFORE express.json(). Everything else uses parsed JSON. */
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });

/* ------------------------------------------------------------- auth utils -- */
function setSessionCookies(res, session) {
  const secure = SITE_URL.startsWith("https");
  const base = { httpOnly: true, sameSite: "lax", secure, path: "/" };
  res.cookie(ACCESS_COOKIE, session.access_token, { ...base, maxAge: 60 * 60 * 1000 });
  if (session.refresh_token) {
    res.cookie(REFRESH_COOKIE, session.refresh_token, { ...base, maxAge: 30 * 24 * 60 * 60 * 1000 });
  }
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { path: "/" });
  res.clearCookie(REFRESH_COOKIE, { path: "/" });
}

function bearerToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.cookies?.[ACCESS_COOKIE] || null;
}

/* Resolve the current user from the access token (cookie or Bearer). */
async function getUser(req) {
  if (!supabaseAdmin) return null;
  const token = bearerToken(req);
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

function roleOf(user) {
  return user?.app_metadata?.role || "user";
}

async function requireUser(req, res, next) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Sign in to continue." });
  req.user = user;
  next();
}

async function requireAdmin(req, res, next) {
  const user = await getUser(req);
  req.user = user || null;
  /* Open mode: skip the role gate entirely (see ADMIN_OPEN). */
  if (!adminOpen) {
    if (!user) return res.status(401).json({ error: "Sign in to continue." });
    if (roleOf(user) !== "admin") return res.status(403).json({ error: "Admins only." });
  }
  /* Either way the admin APIs need the database. */
  if (!supabaseAdmin) return notConfigured(res, "Admin");
  next();
}

/* First-time role bootstrap: emails in ADMIN_EMAILS become admins. */
async function ensureBootstrapRole(user) {
  if (!supabaseAdmin || !user?.email) return;
  const email = user.email.toLowerCase();
  if (roleOf(user) === "user" && adminEmails.includes(email)) {
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: { ...user.app_metadata, role: "admin" },
    });
  }
}

function notConfigured(res, what) {
  return res.status(503).json({ error: `${what} is not configured on the server yet.` });
}

/* =====================================================================
   AUTH — email / password
   ===================================================================== */
app.post("/api/auth/sign-up", authLimiter, async (req, res) => {
  if (!supabaseAuth || !supabaseAdmin) return notConfigured(res, "Accounts");
  const { email, password, username } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  /* Create the account already-confirmed so the user is signed in right away.
     This bypasses Supabase's "Confirm email" step (no inbox round-trip), which
     otherwise leaves new members without a session — unable to buy or open a
     ticket. Works no matter how the Supabase project's email settings are set. */
  const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: username || email.split("@")[0] },
  });
  if (createErr) {
    const already = /already|registered|exists/i.test(createErr.message || "");
    return res.status(400).json({
      error: already ? "That email is already registered — try signing in instead." : createErr.message,
    });
  }

  /* Sign them in to mint a session + cookies. */
  const { data: signin, error: signErr } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (signErr) return res.status(400).json({ error: signErr.message });

  await ensureBootstrapRole(signin.user);
  setSessionCookies(res, signin.session);
  return res.json({ user: publicUser(signin.user), session: true });
});

app.post("/api/auth/sign-in", authLimiter, async (req, res) => {
  if (!supabaseAuth) return notConfigured(res, "Accounts");
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) return res.status(400).json({ error: error.message });

  await ensureBootstrapRole(data.user);
  setSessionCookies(res, data.session);
  res.json({ user: publicUser(data.user), session: true });
});

app.post("/api/auth/sign-out", (req, res) => {
  clearSessionCookies(res);
  res.json({ ok: true });
});

/* Dev-only one-click login for local testing. Signs in a fixed, confirmed test
   user (creating it the first time). Disabled unless DEV_LOGIN=true. */
async function devSignIn(res) {
  const email = "noxtester@gmail.com";
  const password = "noxtester-12345";
  let { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error) {
    await supabaseAdmin.auth.admin
      .createUser({ email, password, email_confirm: true, user_metadata: { username: "tester" } })
      .catch(() => {});
    ({ data, error } = await supabaseAuth.auth.signInWithPassword({ email, password }));
  }
  if (error) return { error: error.message };
  await ensureBootstrapRole(data.user);
  setSessionCookies(res, data.session);
  return { user: data.user };
}
app.post("/api/dev/login", async (req, res) => {
  if (!devLogin) return res.status(404).end();
  if (!supabaseAuth || !supabaseAdmin) return notConfigured(res, "Accounts");
  const r = await devSignIn(res);
  if (r.error) return res.status(500).json({ error: r.error });
  res.json({ ok: true, user: publicUser(r.user) });
});
app.get("/api/dev/login", async (req, res) => {
  if (!devLogin) return res.status(404).end();
  if (!supabaseAuth || !supabaseAdmin) return notConfigured(res, "Accounts");
  const r = await devSignIn(res);
  if (r.error) return res.status(500).send(r.error);
  res.redirect("/account.html");
});

app.get("/api/auth/session", async (req, res) => {
  const user = await getUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.get("/api/auth/role", requireUser, (req, res) => {
  res.json({ role: roleOf(req.user) });
});

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username || user.email?.split("@")[0],
    role: roleOf(user),
    discord: user.app_metadata?.discord_username || null,
    google: user.app_metadata?.google_id ? true : false,
  };
}

/* =====================================================================
   AUTH — Discord OAuth
   Mirrors the Halo pattern: a Discord login maps to a Supabase user with a
   synthetic email (discord_<id>@…) and a server-derived password, so we can
   issue a normal Supabase session. Discord identity is mirrored into
   app_metadata for lookups.
   ===================================================================== */
function discordPassword(discordId) {
  return crypto.createHmac("sha256", SESSION_SECRET || "nox").update(`discord:${discordId}`).digest("hex");
}
function discordEmail(discordId) {
  const host = new URL(SITE_URL).hostname.replace(/^www\./, "") || "nox.local";
  return `discord_${discordId}@${host}`;
}

app.get("/api/auth/discord", (req, res) => {
  if (!hasDiscord) return notConfigured(res, "Discord login");
  const url = new URL("https://discord.com/api/oauth2/authorize");
  url.searchParams.set("client_id", DISCORD_CLIENT_ID);
  url.searchParams.set("redirect_uri", DISCORD_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify email");
  res.redirect(url.toString());
});

app.get("/api/auth/discord/callback", async (req, res) => {
  if (!hasDiscord || !supabaseAdmin) return notConfigured(res, "Discord login");
  const { code } = req.query;
  if (!code) return res.redirect("/account/?error=discord");

  try {
    /* 1. Exchange the code for a Discord access token. */
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error("Discord token exchange failed");

    /* 2. Fetch the Discord profile. */
    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const dUser = await meRes.json();
    if (!dUser.id) throw new Error("Discord profile fetch failed");

    const email = dUser.email || discordEmail(dUser.id);
    const password = discordPassword(dUser.id);
    const username = dUser.global_name || dUser.username || `discord_${dUser.id}`;

    /* 3. Find or create the matching Supabase user. */
    let userId = null;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = (list?.users || []).find(
      (u) => u.email === email || u.app_metadata?.discord_id === dUser.id
    );

    if (existing) {
      userId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        app_metadata: { ...existing.app_metadata, discord_id: dUser.id, discord_username: username },
      });
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username },
        app_metadata: { discord_id: dUser.id, discord_username: username },
      });
      if (error) throw error;
      userId = created.user.id;
    }

    /* 4. Sign in as that user to mint a session, then bootstrap admin role. */
    const { data: signin, error: signErr } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (signErr) throw signErr;
    await ensureBootstrapRole(signin.user);
    setSessionCookies(res, signin.session);
    res.redirect("/account.html");
  } catch (err) {
    console.error("[discord]", err.message);
    res.redirect("/account.html?error=discord");
  }
});

/* =====================================================================
   PRODUCTS — public catalog with live key stock
   ===================================================================== */
app.get("/api/products", async (req, res) => {
  const open = await storeOpen();
  let stock = new Map();
  if (supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin
        .from("license_keys")
        .select("inventory_slug")
        .eq("status", "unused");
      for (const row of data || []) stock.set(row.inventory_slug, (stock.get(row.inventory_slug) || 0) + 1);
    } catch {
      /* stock stays empty; treated as out of stock */
    }
  }

  const products = catalog.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    status: p.status,
    variants: p.variants.map((v) => {
      const count = stock.get(inventorySlug(p.slug, v.slug)) || 0;
      const buyable = open && count > 0;
      return {
        slug: v.slug,
        name: v.name,
        priceDisplay: v.priceDisplay,
        amountCents: v.amountCents,
        inStock: buyable,
        stockLabel: !open ? "Store closed" : count > 0 ? "In Stock" : "Out of Stock",
      };
    }),
  }));

  res.json({ products, storeOpen: open, promoEnabled: promoMap.size > 0 });
});

/* =====================================================================
   CHECKOUT — Stripe
   ===================================================================== */
app.post("/api/create-checkout-session", requireUser, async (req, res) => {
  if (!stripe) return notConfigured(res, "Checkout");
  if (!(await storeOpen())) return res.status(409).json({ error: "The store is closed right now." });
  const { productSlug, variantSlug, promoCode } = req.body || {};
  const found = findVariant(productSlug, variantSlug);
  if (!found) return res.status(400).json({ error: "Unknown product or variant." });
  const { product, variant } = found;
  if (product.status !== "online") return res.status(409).json({ error: "That product isn't available for purchase yet." });
  const promo = lookupPromo(promoCode);
  const price = applyPromo(variant.amountCents, promo);

  /* Require at least one key in stock before taking money. */
  const { count } = await supabaseAdmin
    .from("license_keys")
    .select("id", { count: "exact", head: true })
    .eq("inventory_slug", inventorySlug(product.slug, variant.slug))
    .eq("status", "unused");
  if (!count) return res.status(409).json({ error: "That option is out of stock right now." });

  const { data: order, error: orderErr } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: req.user.id,
      product_slug: product.slug,
      product_name: product.name,
      variant_slug: variant.slug,
      variant_name: variant.name,
      amount_cents: price,
      status: "pending",
    })
    .select("id")
    .single();
  if (orderErr) return res.status(500).json({ error: "Could not start the order." });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: price,
          product_data: { name: `${product.name} — ${variant.name}${promo ? ` (${promo.code})` : ""}` },
        },
      },
    ],
    metadata: { order_id: order.id, user_id: req.user.id },
    success_url: `${SITE_URL}/account.html?checkout=success`,
    cancel_url: `${SITE_URL}/product.html?id=${product.slug}&checkout=cancel`,
  });

  await supabaseAdmin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);
  res.json({ url: session.url });
});

/* Multi-item cart checkout. One Stripe session, one order row per unit so each
   delivered key maps to its own order. */
app.post("/api/cart/checkout", requireUser, async (req, res) => {
  if (!stripe) return notConfigured(res, "Checkout");
  if (!(await storeOpen())) return res.status(409).json({ error: "The store is closed right now." });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Your cart is empty." });
  const promo = lookupPromo(req.body?.promoCode);

  /* Resolve + validate every line against the server catalog. */
  const lines = [];
  const wantByInv = new Map();
  for (const item of items) {
    const found = findVariant(item.productSlug, item.variantSlug);
    if (!found) return res.status(400).json({ error: "Your cart has an unknown item." });
    if (found.product.status !== "online") return res.status(409).json({ error: `${found.product.name} isn't available for purchase yet.` });
    const qty = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    const inv = inventorySlug(found.product.slug, found.variant.slug);
    wantByInv.set(inv, (wantByInv.get(inv) || 0) + qty);
    lines.push({ ...found, qty, inv });
  }

  /* Ensure enough unused keys exist for each variant in the cart. */
  for (const [inv, need] of wantByInv) {
    const { count } = await supabaseAdmin
      .from("license_keys")
      .select("id", { count: "exact", head: true })
      .eq("inventory_slug", inv)
      .eq("status", "unused");
    if ((count || 0) < need) {
      const p = lines.find((l) => l.inv === inv);
      return res.status(409).json({ error: `Not enough stock for ${p.product.name} — ${p.variant.name}.` });
    }
  }

  /* One pending order per unit. */
  const orderRows = [];
  for (const line of lines) {
    for (let i = 0; i < line.qty; i += 1) {
      orderRows.push({
        user_id: req.user.id,
        product_slug: line.product.slug,
        product_name: line.product.name,
        variant_slug: line.variant.slug,
        variant_name: line.variant.name,
        amount_cents: applyPromo(line.variant.amountCents, promo),
        status: "pending",
      });
    }
  }
  const { data: orders, error: orderErr } = await supabaseAdmin.from("orders").insert(orderRows).select("id");
  if (orderErr) return res.status(500).json({ error: "Could not start the order." });
  const orderIds = orders.map((o) => o.id);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lines.map((line) => ({
      quantity: line.qty,
      price_data: {
        currency: "usd",
        unit_amount: applyPromo(line.variant.amountCents, promo),
        product_data: { name: `${line.product.name} — ${line.variant.name}${promo ? ` (${promo.code})` : ""}` },
      },
    })),
    metadata: { order_ids: orderIds.join(","), user_id: req.user.id },
    success_url: `${SITE_URL}/account.html?checkout=success`,
    cancel_url: `${SITE_URL}/store.html?checkout=cancel`,
  });

  await supabaseAdmin.from("orders").update({ stripe_session_id: session.id }).in("id", orderIds);
  res.json({ url: session.url });
});

/* Pay for the whole cart with balance — delivers immediately, no Stripe. */
app.post("/api/cart/checkout-balance", requireUser, async (req, res) => {
  if (!(await storeOpen())) return res.status(409).json({ error: "The store is closed right now." });
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ error: "Your cart is empty." });
  const promo = lookupPromo(req.body?.promoCode);

  const lines = [];
  const wantByInv = new Map();
  let total = 0;
  for (const item of items) {
    const found = findVariant(item.productSlug, item.variantSlug);
    if (!found) return res.status(400).json({ error: "Your cart has an unknown item." });
    if (found.product.status !== "online") return res.status(409).json({ error: `${found.product.name} isn't available for purchase yet.` });
    const qty = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    const inv = inventorySlug(found.product.slug, found.variant.slug);
    wantByInv.set(inv, (wantByInv.get(inv) || 0) + qty);
    const price = applyPromo(found.variant.amountCents, promo);
    total += price * qty;
    lines.push({ ...found, qty, inv, price });
  }

  for (const [inv, need] of wantByInv) {
    const { count } = await supabaseAdmin.from("license_keys").select("id", { count: "exact", head: true })
      .eq("inventory_slug", inv).eq("status", "unused");
    if ((count || 0) < need) {
      const p = lines.find((l) => l.inv === inv);
      return res.status(409).json({ error: `Not enough stock for ${p.product.name} — ${p.variant.name}.` });
    }
  }

  const balance = await getBalance(req.user.id);
  if (balance < total) return res.status(402).json({ error: "Not enough balance.", balanceCents: balance });

  await adjustBalance(req.user.id, -total, "Cart purchase");
  const delivered = [];
  for (const line of lines) {
    for (let i = 0; i < line.qty; i += 1) {
      const { data: order } = await supabaseAdmin.from("orders").insert({
        user_id: req.user.id, product_slug: line.product.slug, product_name: line.product.name,
        variant_slug: line.variant.slug, variant_name: line.variant.name,
        amount_cents: line.price, method: "balance", status: "pending",
      }).select("id").single();
      await fulfillOrder(order.id);
      const { data: done } = await supabaseAdmin.from("orders").select("license_key").eq("id", order.id).single();
      if (done?.license_key) delivered.push(done.license_key);
    }
  }
  res.json({ ok: true, delivered, balanceCents: await getBalance(req.user.id) });
});

/* Stripe webhook — the ONLY place an order becomes paid + a key is delivered. */
async function handleStripeWebhook(req, res) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(503).end();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    /* Wallet top-up => credit balance. */
    if (session.metadata?.type === "topup") {
      try {
        await adjustBalance(session.metadata.user_id, Number(session.metadata.amount_cents), "Wallet top-up");
      } catch (err) {
        console.error("[topup]", err.message);
      }
    } else {
      /* Single buy-now => order_id; cart => comma-separated order_ids. */
      const ids = session.metadata?.order_ids
        ? session.metadata.order_ids.split(",").filter(Boolean)
        : session.metadata?.order_id
          ? [session.metadata.order_id]
          : [];
      for (const id of ids) {
        try {
          await fulfillOrder(id);
        } catch (err) {
          console.error("[fulfill]", id, err.message);
        }
      }
    }
  }
  res.json({ received: true });
}

/* Claim an unused key for the order's variant and attach it. */
async function fulfillOrder(orderId) {
  const { data: order } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single();
  if (!order || order.status === "fulfilled") return;
  /* Only post to the purchases channel on the first paid transition, so
     Stripe webhook retries never double-post. */
  const wasUnpaid = order.status === "pending";

  const invSlug = inventorySlug(order.product_slug, order.variant_slug);
  const { data: key } = await supabaseAdmin
    .from("license_keys")
    .select("id, key_value")
    .eq("inventory_slug", invSlug)
    .eq("status", "unused")
    .limit(1)
    .maybeSingle();

  if (!key) {
    /* Paid but no stock left — mark paid so an admin can follow up manually. */
    await supabaseAdmin.from("orders").update({ status: "paid" }).eq("id", orderId);
    if (wasUnpaid) await postOrderToDiscord({ ...order, status: "paid" }).catch(() => {});
    return;
  }

  await supabaseAdmin
    .from("license_keys")
    .update({ status: "used", order_id: orderId, used_at: new Date().toISOString() })
    .eq("id", key.id);

  await supabaseAdmin
    .from("orders")
    .update({ status: "fulfilled", license_key: key.key_value, fulfilled_at: new Date().toISOString() })
    .eq("id", orderId);

  if (wasUnpaid) await postOrderToDiscord({ ...order, status: "fulfilled" }).catch(() => {});

  /* Optional: DM the key over Discord if the buyer logged in with Discord. */
  await tryDiscordDeliver(order.user_id, order, key.key_value).catch(() => {});
}

async function tryDiscordDeliver(userId, order, keyValue) {
  if (!DISCORD_BOT_TOKEN) return;
  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const discordId = data?.user?.app_metadata?.discord_id;
  if (!discordId) return;

  const dm = await fetch("https://discord.com/api/users/@me/channels", {
    method: "POST",
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient_id: discordId }),
  }).then((r) => r.json());
  if (!dm.id) return;

  await fetch(`https://discord.com/api/channels/${dm.id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `Thanks for your purchase of **${order.product_name} — ${order.variant_name}**.\nYour key: \`${keyValue}\``,
    }),
  });
}

/* =====================================================================
   ACCOUNT — a user's own orders + keys
   ===================================================================== */
app.get("/api/orders", requireUser, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, product_name, variant_name, amount_cents, status, license_key, created_at")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: "Could not load your orders." });
  res.json({ orders: data || [] });
});

/* =====================================================================
   ADMIN — orders, key inventory, users + roles
   ===================================================================== */
app.get("/api/admin/orders", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return res.status(500).json({ error: error.message });
  const revenueCents = (data || [])
    .filter((o) => o.status === "fulfilled" || o.status === "paid")
    .reduce((sum, o) => sum + o.amount_cents, 0);
  res.json({ orders: data || [], revenueCents });
});

/* Stock counts for every variant in the catalog. */
app.get("/api/admin/keys", requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin.from("license_keys").select("inventory_slug, status");
  const counts = {};
  for (const row of data || []) {
    counts[row.inventory_slug] ||= { unused: 0, used: 0 };
    counts[row.inventory_slug][row.status] += 1;
  }
  const rows = [];
  for (const p of catalog) {
    for (const v of p.variants) {
      const slug = inventorySlug(p.slug, v.slug);
      rows.push({
        inventorySlug: slug,
        product: p.name,
        variant: v.name,
        unused: counts[slug]?.unused || 0,
        used: counts[slug]?.used || 0,
      });
    }
  }
  res.json({ rows });
});

/* Bulk add keys to a variant's inventory. */
app.post("/api/admin/keys", requireAdmin, async (req, res) => {
  const { productSlug, variantSlug, keys } = req.body || {};
  const found = findVariant(productSlug, variantSlug);
  if (!found) return res.status(400).json({ error: "Unknown product or variant." });

  const values = String(keys || "")
    .split(/[\r\n,]+/)
    .map((k) => k.trim())
    .filter(Boolean);
  if (!values.length) return res.status(400).json({ error: "Paste at least one key." });

  const slug = inventorySlug(productSlug, variantSlug);
  const payload = values.map((key_value) => ({ inventory_slug: slug, key_value, status: "unused" }));

  const { error, count } = await supabaseAdmin
    .from("license_keys")
    .upsert(payload, { onConflict: "inventory_slug,key_value", ignoreDuplicates: true, count: "exact" });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ added: count ?? values.length });
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return res.status(500).json({ error: error.message });

  /* Pull all wallet balances once and attach them. */
  const balances = new Map();
  const { data: wallets } = await supabaseAdmin.from("wallets").select("user_id, balance_cents");
  for (const w of wallets || []) balances.set(w.user_id, w.balance_cents);

  const users = (data.users || []).map((u) => ({
    id: u.id,
    email: u.email,
    username: u.user_metadata?.username || null,
    role: roleOf(u),
    discord: u.app_metadata?.discord_username || null,
    google: u.app_metadata?.google_id ? true : false,
    balanceCents: balances.get(u.id) || 0,
    createdAt: u.created_at,
  }));
  res.json({ users });
});

app.post("/api/admin/users/:id/role", requireAdmin, async (req, res) => {
  const { role } = req.body || {};
  if (!["user", "staff", "admin"].includes(role)) return res.status(400).json({ error: "Invalid role." });
  if (req.user && req.params.id === req.user.id && role !== "admin") {
    return res.status(400).json({ error: "You can't remove your own admin role." });
  }
  const { data: target } = await supabaseAdmin.auth.admin.getUserById(req.params.id);
  if (!target?.user) return res.status(404).json({ error: "User not found." });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(req.params.id, {
    app_metadata: { ...target.user.app_metadata, role },
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, role });
});

/* =====================================================================
   SETTINGS (store on/off switch)
   ===================================================================== */
async function getSetting(key, fallback) {
  if (!supabaseAdmin) return fallback;
  const { data } = await supabaseAdmin.from("settings").select("value").eq("key", key).maybeSingle();
  return data ? data.value : fallback;
}
async function setSetting(key, value) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("settings").upsert({ key, value: String(value), updated_at: new Date().toISOString() });
}
async function storeOpen() {
  return (await getSetting("store_open", "true")) !== "false";
}

/* =====================================================================
   WALLET / BALANCE
   ===================================================================== */
async function getBalance(userId) {
  const { data } = await supabaseAdmin.from("wallets").select("balance_cents").eq("user_id", userId).maybeSingle();
  return data ? data.balance_cents : 0;
}
async function adjustBalance(userId, deltaCents, reason) {
  const current = await getBalance(userId);
  const next = current + deltaCents;
  if (next < 0) throw new Error("Insufficient balance.");
  await supabaseAdmin.from("wallets").upsert({ user_id: userId, balance_cents: next, updated_at: new Date().toISOString() });
  await supabaseAdmin.from("wallet_ledger").insert({ user_id: userId, delta_cents: deltaCents, reason });
  return next;
}

app.get("/api/balance", requireUser, async (req, res) => {
  res.json({ balanceCents: await getBalance(req.user.id) });
});

/* Add funds via Stripe. The webhook credits the wallet on completion. */
app.post("/api/wallet/topup", requireUser, async (req, res) => {
  if (!stripe) return notConfigured(res, "Top-ups");
  const amountCents = Math.round(Number(req.body?.amountCents) || 0);
  if (amountCents < 500 || amountCents > 1_000_00) {
    return res.status(400).json({ error: "Enter an amount between $5 and $1000." });
  }
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: { currency: "usd", unit_amount: amountCents, product_data: { name: "Nox wallet top-up" } },
    }],
    metadata: { type: "topup", user_id: req.user.id, amount_cents: String(amountCents) },
    success_url: `${SITE_URL}/account.html?topup=success`,
    cancel_url: `${SITE_URL}/account.html?topup=cancel`,
  });
  res.json({ url: session.url });
});

/* Pay for one variant using balance — no Stripe, delivers immediately. */
app.post("/api/purchase-with-balance", requireUser, async (req, res) => {
  if (!(await storeOpen())) return res.status(409).json({ error: "The store is closed right now." });
  const { productSlug, variantSlug, promoCode } = req.body || {};
  const found = findVariant(productSlug, variantSlug);
  if (!found) return res.status(400).json({ error: "Unknown product or variant." });
  if (found.product.status !== "online") return res.status(409).json({ error: "That product isn't available for purchase yet." });

  const promo = lookupPromo(promoCode);
  const price = applyPromo(found.variant.amountCents, promo);

  const { count } = await supabaseAdmin
    .from("license_keys").select("id", { count: "exact", head: true })
    .eq("inventory_slug", inventorySlug(productSlug, variantSlug)).eq("status", "unused");
  if (!count) return res.status(409).json({ error: "That option is out of stock." });

  const balance = await getBalance(req.user.id);
  if (balance < price) return res.status(402).json({ error: "Not enough balance.", balanceCents: balance });

  const { data: order, error } = await supabaseAdmin.from("orders").insert({
    user_id: req.user.id, product_slug: found.product.slug, product_name: found.product.name,
    variant_slug: found.variant.slug, variant_name: found.variant.name,
    amount_cents: price, method: "balance", status: "pending",
  }).select("id").single();
  if (error) return res.status(500).json({ error: "Could not create the order." });

  await adjustBalance(req.user.id, -price, `Purchase: ${found.product.name} — ${found.variant.name}`);
  await fulfillOrder(order.id);

  const { data: done } = await supabaseAdmin.from("orders").select("license_key").eq("id", order.id).single();
  res.json({ ok: true, licenseKey: done?.license_key || null, balanceCents: await getBalance(req.user.id) });
});

/* =====================================================================
   REVIEWS
   ===================================================================== */
app.get("/api/reviews", async (req, res) => {
  if (!supabaseAdmin) return res.json({ reviews: [] });
  const { data } = await supabaseAdmin
    .from("reviews").select("product_slug, product_name, username, rating, review_text, created_at")
    .order("created_at", { ascending: false }).limit(Number(req.query.limit) || 30);
  res.json({ reviews: data || [] });
});

app.get("/api/reviews/product/:slug", async (req, res) => {
  if (!supabaseAdmin) return res.json({ reviews: [] });
  const { data } = await supabaseAdmin
    .from("reviews").select("username, rating, review_text, created_at")
    .eq("product_slug", req.params.slug).order("created_at", { ascending: false }).limit(50);
  res.json({ reviews: data || [] });
});

/* Products the user bought (fulfilled) but hasn't reviewed yet. */
app.get("/api/reviews/eligible", requireUser, async (req, res) => {
  const { data: orders } = await supabaseAdmin
    .from("orders").select("product_slug, product_name")
    .eq("user_id", req.user.id).eq("status", "fulfilled");
  const { data: mine } = await supabaseAdmin.from("reviews").select("product_slug").eq("user_id", req.user.id);
  const reviewed = new Set((mine || []).map((r) => r.product_slug));
  const seen = new Set();
  const eligible = [];
  for (const o of orders || []) {
    if (reviewed.has(o.product_slug) || seen.has(o.product_slug)) continue;
    seen.add(o.product_slug);
    eligible.push({ productSlug: o.product_slug, productName: o.product_name });
  }
  res.json({ eligible });
});

app.post("/api/reviews", requireUser, async (req, res) => {
  const { productSlug, rating, text } = req.body || {};
  const stars = Math.round(Number(rating));
  if (!productSlug || !(stars >= 1 && stars <= 5) || !String(text || "").trim()) {
    return res.status(400).json({ error: "Pick a rating and write a short review." });
  }
  /* Verified purchase only. */
  const { count } = await supabaseAdmin.from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", req.user.id).eq("product_slug", productSlug).eq("status", "fulfilled");
  if (!count) return res.status(403).json({ error: "You can only review products you've bought." });

  const product = productBySlug.get(productSlug);
  const username = req.user.user_metadata?.username || req.user.email?.split("@")[0] || "Anonymous";
  const { error } = await supabaseAdmin.from("reviews").upsert({
    user_id: req.user.id, product_slug: productSlug, product_name: product?.name || productSlug,
    username, rating: stars, review_text: String(text).trim().slice(0, 600),
  }, { onConflict: "user_id,product_slug" });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

/* =====================================================================
   SUPPORT DESK (tickets)
   ===================================================================== */
app.get("/api/desk/tickets", requireUser, async (req, res) => {
  const { data } = await supabaseAdmin.from("tickets")
    .select("id, subject, status, created_at, updated_at")
    .eq("user_id", req.user.id).order("updated_at", { ascending: false });
  res.json({ tickets: data || [] });
});

app.post("/api/desk/tickets", requireUser, async (req, res) => {
  const subject = String(req.body?.subject || "").trim();
  const message = String(req.body?.message || "").trim();
  if (!subject || !message) return res.status(400).json({ error: "Add a subject and a message." });
  const { data: ticket, error } = await supabaseAdmin.from("tickets")
    .insert({ user_id: req.user.id, subject }).select("id").single();
  if (error) return res.status(500).json({ error: error.message });
  const name = req.user.user_metadata?.username || req.user.email?.split("@")[0] || "You";
  await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: ticket.id, author_id: req.user.id, author_name: name, is_staff: false, body: message.slice(0, 2000),
  });
  /* Mirror the new ticket to a Discord thread in the desk-help channel. */
  await openTicketThread(ticket.id, subject, name, message, req.user).catch(() => {});
  res.json({ ok: true, id: ticket.id });
});

app.get("/api/desk/tickets/:id", requireUser, async (req, res) => {
  const { data: ticket } = await supabaseAdmin.from("tickets").select("*").eq("id", req.params.id).maybeSingle();
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  const isStaff = ["admin", "staff"].includes(roleOf(req.user));
  if (ticket.user_id !== req.user.id && !isStaff) return res.status(403).json({ error: "Not your ticket." });
  const { data: messages } = await supabaseAdmin.from("ticket_messages")
    .select("author_name, is_staff, body, created_at").eq("ticket_id", ticket.id).order("created_at");
  res.json({ ticket, messages: messages || [] });
});

app.post("/api/desk/tickets/:id/messages", requireUser, async (req, res) => {
  const body = String(req.body?.body || "").trim();
  if (!body) return res.status(400).json({ error: "Write a message." });
  const { data: ticket } = await supabaseAdmin.from("tickets").select("*").eq("id", req.params.id).maybeSingle();
  if (!ticket) return res.status(404).json({ error: "Ticket not found." });
  const isStaff = ["admin", "staff"].includes(roleOf(req.user));
  if (ticket.user_id !== req.user.id && !isStaff) return res.status(403).json({ error: "Not your ticket." });

  const name = req.user.user_metadata?.username || req.user.email?.split("@")[0] || (isStaff ? "Support" : "You");
  const label = isStaff ? `${name} (staff)` : name;
  await supabaseAdmin.from("ticket_messages").insert({
    ticket_id: ticket.id, author_id: req.user.id, author_name: label,
    is_staff: isStaff, body: body.slice(0, 2000),
  });
  await supabaseAdmin.from("tickets").update({ status: "open", updated_at: new Date().toISOString() }).eq("id", ticket.id);
  /* Echo web-side replies into the Discord thread so staff see them there too. */
  await relayMessageToThread(ticket, label, body).catch(() => {});
  res.json({ ok: true });
});

/* =====================================================================
   ADMIN — extra control (order actions, balances, reviews, tickets, settings)
   ===================================================================== */
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  const [orders, keys, reviews, tickets, users] = await Promise.all([
    supabaseAdmin.from("orders").select("amount_cents, status"),
    supabaseAdmin.from("license_keys").select("status"),
    supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("tickets").select("status"),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
  ]);
  const paid = (orders.data || []).filter((o) => ["paid", "fulfilled"].includes(o.status));
  res.json({
    revenueCents: paid.reduce((s, o) => s + o.amount_cents, 0),
    orders: (orders.data || []).length,
    keysInStock: (keys.data || []).filter((k) => k.status === "unused").length,
    reviews: reviews.count || 0,
    openTickets: (tickets.data || []).filter((t) => t.status === "open").length,
    storeOpen: await storeOpen(),
  });
});

/* Change an order's status. Choosing "fulfilled" delivers a key if none yet. */
app.post("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "paid", "fulfilled", "cancelled", "refunded"].includes(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }
  if (status === "fulfilled") {
    await fulfillOrder(req.params.id);
  } else {
    await supabaseAdmin.from("orders").update({ status }).eq("id", req.params.id);
  }
  res.json({ ok: true });
});

app.post("/api/admin/users/:id/balance", requireAdmin, async (req, res) => {
  const delta = Math.round(Number(req.body?.deltaCents) || 0);
  if (!delta) return res.status(400).json({ error: "Enter a non-zero amount (cents)." });
  try {
    const balance = await adjustBalance(req.params.id, delta, req.body?.reason || "Admin adjustment");
    res.json({ ok: true, balanceCents: balance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/admin/reviews", requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin.from("reviews")
    .select("id, product_name, username, rating, review_text, created_at")
    .order("created_at", { ascending: false }).limit(500);
  res.json({ reviews: data || [] });
});
app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
  await supabaseAdmin.from("reviews").delete().eq("id", req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
  const { data } = await supabaseAdmin.from("tickets").select("*").order("updated_at", { ascending: false }).limit(300);
  res.json({ tickets: data || [] });
});
app.post("/api/admin/tickets/:id/close", requireAdmin, async (req, res) => {
  await supabaseAdmin.from("tickets").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", req.params.id);
  res.json({ ok: true });
});

app.get("/api/admin/settings", requireAdmin, async (req, res) => {
  res.json({ storeOpen: await storeOpen() });
});
app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  if (typeof req.body?.storeOpen === "boolean") await setSetting("store_open", req.body.storeOpen);
  res.json({ ok: true, storeOpen: await storeOpen() });
});

/* =====================================================================
   AUTH — Google OAuth (same synthetic-session pattern as Discord)
   ===================================================================== */
app.get("/api/auth/google", (req, res) => {
  if (!hasGoogle) return notConfigured(res, "Google login");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", GOOGLE_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("access_type", "offline");
  res.redirect(url.toString());
});

app.get("/api/auth/google/callback", async (req, res) => {
  if (!hasGoogle || !supabaseAdmin) return notConfigured(res, "Google login");
  const { code } = req.query;
  if (!code) return res.redirect("/account.html?error=google");
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: "authorization_code", code: String(code), redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });
    const token = await tokenRes.json();
    if (!token.access_token) throw new Error("Google token exchange failed");
    const profile = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    }).then((r) => r.json());
    if (!profile.email) throw new Error("Google profile fetch failed");

    const email = profile.email;
    const password = crypto.createHmac("sha256", SESSION_SECRET || "nox").update(`google:${profile.id}`).digest("hex");
    const username = profile.name || email.split("@")[0];

    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = (list?.users || []).find((u) => u.email === email);
    if (existing) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password, app_metadata: { ...existing.app_metadata, google_id: profile.id },
      });
    } else {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { username }, app_metadata: { google_id: profile.id },
      });
      if (error) throw error;
    }
    const { data: signin, error: signErr } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (signErr) throw signErr;
    await ensureBootstrapRole(signin.user);
    setSessionCookies(res, signin.session);
    res.redirect("/account.html");
  } catch (err) {
    console.error("[google]", err.message);
    res.redirect("/account.html?error=google");
  }
});

/* =====================================================================
   PROMO
   ===================================================================== */
app.post("/api/promo/validate", (req, res) => {
  const promo = lookupPromo(req.body?.code);
  if (!promo) return res.json({ valid: false });
  res.json({ valid: true, code: promo.code, percent: promo.percent });
});

/* =====================================================================
   STATIC SITE + health
   ===================================================================== */
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    configured: { supabase: hasSupabase, stripe: hasStripe, discord: hasDiscord, google: hasGoogle },
    promoCount: promoMap.size,
    adminOpen,
    devLogin,
  });
});

/* Never serve secrets, server code, or the raw catalog/schema, even if the
   path is guessed. This runs before static so it actually blocks. */
app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  if (
    /\/(\.env|\.env\.example|server\.js|package(-lock)?\.json)$/.test(p) ||
    p.startsWith("/data/") ||
    p.startsWith("/db/") ||
    p.startsWith("/node_modules/")
  ) {
    return res.status(404).end();
  }
  next();
});

/* Serves index.html, store.html, product.html, account.html, admin.html, etc.
   extensions:["html"] lets /account resolve to account.html. */
app.use(express.static(__dirname, { extensions: ["html"] }));

/* =====================================================================
   DISCORD — order notifications + two-way support desk
   ---------------------------------------------------------------------
   Orders post to a purchases channel via a webhook (no bot needed).
   The desk runs a small Discord bot: each web ticket opens a thread in
   DISCORD_DESK_CHANNEL_ID, web replies are echoed into the thread, and a
   staff reply typed in that thread is written back to the site.
   Everything degrades gracefully — if it isn't configured, it's skipped.
   ===================================================================== */
async function sendDiscordWebhook(url, payload) {
  if (!url) return;
  try {
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  } catch (err) {
    console.error("[discord webhook]", err.message);
  }
}

async function postOrderToDiscord(order) {
  if (!DISCORD_ORDER_WEBHOOK_URL) return;
  let buyer = "Member";
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    buyer = data?.user?.user_metadata?.username || data?.user?.email?.split("@")[0] || "Member";
  } catch { /* keep default */ }
  const dollars = (cents) => "$" + (Number(cents || 0) / 100).toFixed(2);
  await sendDiscordWebhook(DISCORD_ORDER_WEBHOOK_URL, {
    username: "Nox Orders",
    embeds: [{
      title: "🛒 New order",
      color: 0x2563eb,
      fields: [
        { name: "Product", value: String(order.product_name || "—"), inline: true },
        { name: "Option", value: String(order.variant_name || "—"), inline: true },
        { name: "Amount", value: dollars(order.amount_cents), inline: true },
        { name: "Method", value: order.method === "balance" ? "Balance" : "Card", inline: true },
        { name: "Status", value: String(order.status || "paid"), inline: true },
        { name: "Buyer", value: buyer, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "Nox Cheats" },
    }],
  });
}

async function openTicketThread(ticketId, subject, authorName, firstMessage, user) {
  if (!deskBot) return;
  try {
    const channel = await deskBot.client.channels.fetch(DISCORD_DESK_CHANNEL_ID);
    if (!channel || !channel.threads) return;
    const shortId = String(ticketId).slice(0, 8);
    const thread = await channel.threads.create({
      name: `#${shortId} ${subject}`.slice(0, 90),
      autoArchiveDuration: 1440,
      type: deskBot.ChannelType.PublicThread,
      reason: `Support ticket ${ticketId}`,
    });
    await supabaseAdmin.from("tickets").update({ discord_thread_id: thread.id }).eq("id", ticketId);
    const who = user?.email ? `${authorName} (${user.email})` : authorName;
    await thread.send({
      embeds: [{
        title: `New ticket: ${subject}`.slice(0, 250),
        description: String(firstMessage || "").slice(0, 1800),
        color: 0x2563eb,
        footer: { text: `From ${who} • reply in this thread to answer the member` },
      }],
    });
  } catch (err) {
    console.error("[desk bot] open thread:", err.message);
  }
}

async function relayMessageToThread(ticket, authorLabel, body) {
  if (!deskBot || !ticket?.discord_thread_id) return;
  try {
    const thread = await deskBot.client.channels.fetch(ticket.discord_thread_id);
    if (thread && thread.send) await thread.send(`**${authorLabel}:** ${String(body).slice(0, 1900)}`);
  } catch (err) {
    console.error("[desk bot] relay-out:", err.message);
  }
}

async function initDeskBot() {
  if (!hasDeskBot) return;
  let discord;
  try {
    discord = await import("discord.js");
  } catch (err) {
    console.error("[desk bot] discord.js not installed — run npm install:", err.message);
    return;
  }
  const { Client, GatewayIntentBits, Events, ChannelType } = discord;
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  client.once(Events.ClientReady, (c) => console.log(`  Desk bot: on as ${c.user.tag}`));

  /* Staff reply typed in a ticket thread -> write it back to the site. */
  client.on(Events.MessageCreate, async (message) => {
    try {
      if (message.author.bot) return;                       // ignore our own echoes
      const ch = message.channel;
      if (!ch?.isThread?.() || ch.parentId !== DISCORD_DESK_CHANNEL_ID) return;
      const { data: ticket } = await supabaseAdmin
        .from("tickets").select("id").eq("discord_thread_id", ch.id).maybeSingle();
      if (!ticket) return;
      const staffName = `${message.member?.displayName || message.author.username} (staff)`;
      await supabaseAdmin.from("ticket_messages").insert({
        ticket_id: ticket.id, author_id: null, author_name: staffName,
        is_staff: true, body: String(message.content || "").slice(0, 2000),
      });
      await supabaseAdmin.from("tickets")
        .update({ status: "open", updated_at: new Date().toISOString() }).eq("id", ticket.id);
    } catch (err) {
      console.error("[desk bot] relay-in:", err.message);
    }
  });

  try {
    await client.login(DISCORD_BOT_TOKEN);
    deskBot = { client, ChannelType };
  } catch (err) {
    console.error("[desk bot] login failed:", err.message);
  }
}

app.listen(PORT, () => {
  console.log(`\n  Nox Cheats server → ${SITE_URL}`);
  console.log(`  Supabase: ${hasSupabase ? "on" : "OFF"}   Stripe: ${hasStripe ? "on" : "OFF"}   Discord: ${hasDiscord ? "on" : "OFF"}   Desk bot: ${hasDeskBot ? "on" : "OFF"}`);
  if (!hasSupabase) console.log("  (fill in .env to enable accounts, checkout and admin)\n");
  initDeskBot();
});
