/* NOX CHEATS  admin panel (expanded). Orders + status actions, key inventory,
   users + roles + balance, review moderation, ticket replies, store on/off.
   Open to everyone when ADMIN_OPEN=true; every call is re-checked server-side. */
(function () {
  "use strict";
  var gate = document.querySelector("[data-gate]");
  var panel = document.querySelector("[data-admin]");
  function money(c) { return "$" + ((Number(c) || 0) / 100).toFixed(2); }
  function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }
  var catalog = [];

  function showGate(title, sub, link) {
    gate.hidden = false;
    gate.querySelector("[data-gate-title]").textContent = title;
    gate.querySelector("[data-gate-msg]").textContent = sub;
    gate.querySelector("[data-gate-link]").hidden = !link;
  }

  /* tabs */
  document.querySelectorAll(".admin-tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var name = btn.getAttribute("data-panel");
      document.querySelectorAll(".admin-tabs button").forEach(function (b) { b.classList.toggle("on", b === btn); });
      document.querySelectorAll("[data-panel-view]").forEach(function (v) { v.classList.toggle("on", v.getAttribute("data-panel-view") === name); });
    });
  });

  /* ---- stats + store toggle ---- */
  async function loadStats() {
    try {
      var d = await (await fetch("/api/admin/stats")).json();
      document.querySelector("[data-stat-revenue]").textContent = money(d.revenueCents);
      document.querySelector("[data-stat-orders]").textContent = d.orders;
      document.querySelector("[data-stat-keys]").textContent = d.keysInStock;
      document.querySelector("[data-stat-tickets]").textContent = d.openTickets;
      document.querySelector("[data-stat-reviews]").textContent = d.reviews;
      document.querySelector("[data-store-toggle]").checked = !!d.storeOpen;
    } catch (e) {}
  }
  document.querySelector("[data-store-toggle]").addEventListener("change", async function () {
    await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeOpen: this.checked }) });
  });

  /* ---- orders ---- */
  var STATUSES = ["pending", "paid", "fulfilled", "cancelled", "refunded"];
  var PILL = { fulfilled: "ok", paid: "info", pending: "warn", cancelled: "bad", refunded: "bad" };
  async function loadOrders() {
    var body = document.querySelector("[data-admin-orders]");
    try {
      var d = await (await fetch("/api/admin/orders")).json();
      if (!d.orders.length) { body.innerHTML = '<tr><td colspan="8" style="color:var(--muted)">No orders yet.</td></tr>'; return; }
      body.innerHTML = d.orders.map(function (o) {
        var opts = STATUSES.map(function (s) { return '<option value="' + s + '"' + (o.status === s ? " selected" : "") + ">" + s + "</option>"; }).join("");
        return "<tr><td>" + esc(o.product_name) + "</td><td>" + esc(o.variant_name) + "</td><td>" + money(o.amount_cents) +
          "</td><td>" + esc(o.method || "card") + '</td><td><span class="pill ' + (PILL[o.status] || "info") + '">' + o.status +
          "</span></td><td>" + (o.license_key ? "<code>" + esc(o.license_key) + "</code>" : "") + "</td><td>" + new Date(o.created_at).toLocaleDateString() +
          '</td><td><select class="role-select" data-order-status="' + o.id + '">' + opts + "</select></td></tr>";
      }).join("");
      body.querySelectorAll("[data-order-status]").forEach(function (sel) {
        sel.addEventListener("change", async function () {
          sel.disabled = true;
          await fetch("/api/admin/orders/" + sel.getAttribute("data-order-status") + "/status", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: sel.value }),
          });
          sel.disabled = false; loadOrders(); loadStats();
        });
      });
    } catch (err) { body.innerHTML = '<tr><td colspan="8" style="color:#b91c1c">' + esc(err.message || "Failed") + "</td></tr>"; }
  }

  /* ---- keys ---- */
  async function loadKeys() {
    var body = document.querySelector("[data-admin-keys]");
    try {
      var d = await (await fetch("/api/admin/keys")).json();
      body.innerHTML = d.rows.map(function (r) {
        return "<tr><td>" + esc(r.product) + "</td><td>" + esc(r.variant) + '</td><td><span class="pill ' + (r.unused > 0 ? "ok" : "bad") + '">' + r.unused + "</span></td><td>" + r.used + "</td></tr>";
      }).join("");
    } catch (err) { body.innerHTML = '<tr><td colspan="4" style="color:#b91c1c">' + esc(err.message || "Failed") + "</td></tr>"; }
  }
  async function loadCatalog() {
    catalog = (await (await fetch("/api/products")).json()).products || [];
    var prod = document.querySelector("[data-key-product]");
    prod.innerHTML = catalog.map(function (p) { return '<option value="' + esc(p.slug) + '">' + esc(p.name) + "</option>"; }).join("");
    prod.addEventListener("change", fillVariants); fillVariants();
  }
  function fillVariants() {
    var p = catalog.find(function (x) { return x.slug === document.querySelector("[data-key-product]").value; });
    document.querySelector("[data-key-variant]").innerHTML = ((p && p.variants) || []).map(function (v) { return '<option value="' + esc(v.slug) + '">' + esc(v.name) + "</option>"; }).join("");
  }
  document.querySelector("[data-key-add]").addEventListener("click", async function () {
    var m = document.querySelector("[data-key-msg]");
    var btn = this; btn.disabled = true;
    try {
      var d = await (await fetch("/api/admin/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        productSlug: document.querySelector("[data-key-product]").value, variantSlug: document.querySelector("[data-key-variant]").value, keys: document.querySelector("[data-key-values]").value,
      }) })).json();
      if (d.error) throw new Error(d.error);
      m.textContent = "Added " + d.added + " key(s)."; m.className = "nox-msg success"; m.hidden = false;
      document.querySelector("[data-key-values]").value = ""; loadKeys(); loadStats();
    } catch (err) { m.textContent = err.message; m.className = "nox-msg error"; m.hidden = false; } finally { btn.disabled = false; }
  });

  /* ---- users (role + balance) ---- */
  async function loadUsers() {
    var body = document.querySelector("[data-admin-users]");
    try {
      var d = await (await fetch("/api/admin/users")).json();
      body.innerHTML = d.users.map(function (u) {
        var roles = ["user", "staff", "admin"].map(function (r) { return '<option value="' + r + '"' + (u.role === r ? " selected" : "") + ">" + r + "</option>"; }).join("");
        var login = u.discord ? "Discord" : (u.google ? "Google" : "Email");
        return "<tr><td>" + esc(u.email) + "</td><td>" + esc(u.username || "-") + "</td><td>" + login +
          '</td><td><select class="role-select" data-role-for="' + u.id + '">' + roles + "</select></td>" +
          '<td data-bal="' + u.id + '">' + money(u.balanceCents || 0) + '</td>' +
          '<td><input type="number" step="0.01" placeholder="$ +/-" data-adj-for="' + u.id + '" style="width:78px;padding:5px;border-radius:6px;border:1px solid var(--line-2);"><button class="role-select" data-adj-go="' + u.id + '" style="cursor:pointer;">Apply</button></td></tr>';
      }).join("");
      /* fetch balances lazily */
      body.querySelectorAll("[data-role-for]").forEach(function (sel) {
        sel.addEventListener("change", async function () {
          sel.disabled = true;
          var r = await fetch("/api/admin/users/" + sel.getAttribute("data-role-for") + "/role", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: sel.value }) });
          if (!r.ok) alert((await r.json()).error);
          sel.disabled = false;
        });
      });
      body.querySelectorAll("[data-adj-go]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var id = btn.getAttribute("data-adj-go");
          var input = body.querySelector('[data-adj-for="' + id + '"]');
          var cents = Math.round(parseFloat(input.value) * 100);
          if (!cents) return;
          var r = await fetch("/api/admin/users/" + id + "/balance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deltaCents: cents, reason: "Admin adjustment" }) });
          var data = await r.json();
          if (!r.ok) { alert(data.error); return; }
          body.querySelector('[data-bal="' + id + '"]').textContent = money(data.balanceCents);
          input.value = "";
        });
      });
    } catch (err) { body.innerHTML = '<tr><td colspan="6" style="color:#b91c1c">' + esc(err.message || "Failed") + "</td></tr>"; }
  }

  /* ---- reviews moderation ---- */
  async function loadReviews() {
    var body = document.querySelector("[data-admin-reviews]");
    try {
      var d = await (await fetch("/api/admin/reviews")).json();
      if (!d.reviews.length) { body.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">No reviews.</td></tr>'; return; }
      body.innerHTML = d.reviews.map(function (r) {
        return "<tr><td>" + esc(r.product_name) + "</td><td>" + esc(r.username) + "</td><td>" + "★".repeat(r.rating) +
          "</td><td>" + esc(r.review_text) + "</td><td>" + new Date(r.created_at).toLocaleDateString() +
          '</td><td><button class="role-select" data-del-review="' + r.id + '" style="cursor:pointer;color:#b91c1c;">Delete</button></td></tr>';
      }).join("");
      body.querySelectorAll("[data-del-review]").forEach(function (b) {
        b.addEventListener("click", async function () {
          await fetch("/api/admin/reviews/" + b.getAttribute("data-del-review"), { method: "DELETE" });
          loadReviews(); loadStats();
        });
      });
    } catch (err) { body.innerHTML = '<tr><td colspan="6" style="color:#b91c1c">' + esc(err.message || "Failed") + "</td></tr>"; }
  }

  /* ---- tickets ---- */
  var curTicket = null;
  async function loadTickets() {
    var listEl = document.querySelector("[data-admin-tickets]");
    try {
      var d = await (await fetch("/api/admin/tickets")).json();
      if (!d.tickets.length) { listEl.innerHTML = '<p style="color:var(--muted)">No tickets.</p>'; return; }
      listEl.innerHTML = d.tickets.map(function (t) {
        return '<button class="ticket-item' + (t.id === curTicket ? " on" : "") + '" data-tk="' + t.id + '"><b>' + esc(t.subject) + '</b><span class="pill ' + (t.status === "open" ? "warn" : "ok") + '" style="margin-top:4px;">' + t.status + "</span></button>";
      }).join("");
      listEl.querySelectorAll("[data-tk]").forEach(function (b) { b.addEventListener("click", function () { openTicket(b.getAttribute("data-tk")); }); });
    } catch (err) { listEl.innerHTML = '<p style="color:#b91c1c">' + esc(err.message || "Failed") + "</p>"; }
  }
  async function openTicket(id) {
    curTicket = id; loadTickets();
    var d = await (await fetch("/api/desk/tickets/" + id)).json();
    var msgsEl = document.querySelector("[data-admin-thread-msgs]");
    msgsEl.innerHTML = (d.messages || []).map(function (m) {
      return '<div class="msg ' + (m.is_staff ? "staff" : "them") + '"><span class="who">' + esc(m.author_name) + "</span>" + esc(m.body) + "</div>";
    }).join("") || '<p style="color:var(--muted);margin:auto;">No messages.</p>';
    document.querySelector("[data-admin-thread-form]").hidden = false;
  }
  document.querySelector("[data-admin-thread-send]").addEventListener("click", async function () {
    var input = document.querySelector("[data-admin-thread-input]");
    var body = input.value.trim(); if (!body || !curTicket) return; input.value = "";
    await fetch("/api/desk/tickets/" + curTicket + "/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: body }) });
    openTicket(curTicket);
  });
  document.querySelector("[data-admin-thread-close]").addEventListener("click", async function () {
    if (!curTicket) return;
    await fetch("/api/admin/tickets/" + curTicket + "/close", { method: "POST" });
    loadTickets(); loadStats();
  });

  /* ---- boot ---- */
  (async function init() {
    try {
      var res = await fetch("/api/admin/orders");
      if (res.status === 401) return showGate("Sign in required", "Sign in as an admin to continue.", true);
      if (res.status === 403) return showGate("Admins only", "Your account doesn't have admin access.", false);
      panel.hidden = false;
      loadStats(); loadOrders(); loadCatalog().then(loadKeys); loadUsers(); loadReviews(); loadTickets();
    } catch (err) { showGate("Backend unreachable", "Is the server running?", false); }
  })();
})();
