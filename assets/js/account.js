/* NOX CHEATS — account page (login / signup / dashboard).
   Talks to the Express backend. Sessions live in httpOnly cookies, so we just
   call the API and it knows who we are. */
(function () {
  "use strict";

  var authView = document.querySelector("[data-auth-view]");
  var dashView = document.querySelector("[data-dash-view]");

  function money(cents) { return "$" + ((Number(cents) || 0) / 100).toFixed(2); }
  function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }

  function msg(el, text, tone) {
    if (!el) return;
    el.textContent = text;
    el.className = "nox-msg " + (tone || "warn");
    el.hidden = false;
  }

  /* ---------------- auth form tabs ---------------- */
  document.querySelectorAll(".auth-tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".auth-tabs button").forEach(function (b) { b.classList.toggle("on", b === btn); });
      document.querySelector('[data-form="signin"]').hidden = tab !== "signin";
      document.querySelector('[data-form="signup"]').hidden = tab !== "signup";
    });
  });

  function handleAuth(formName, endpoint) {
    var form = document.querySelector('[data-form="' + formName + '"]');
    if (!form) return;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var body = Object.fromEntries(new FormData(form).entries());
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      var original = btn.textContent;
      btn.textContent = "Please wait…";
      try {
        var res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || "Something went wrong.");
        if (data.confirmEmail) {
          msg(document.querySelector("[data-auth-msg]"), "Check your email to confirm your account, then sign in.", "success");
          btn.disabled = false; btn.textContent = original;
          return;
        }
        location.reload(); // session cookie is set; reload into the dashboard
      } catch (err) {
        msg(document.querySelector("[data-auth-msg]"), err.message, "error");
        btn.disabled = false; btn.textContent = original;
      }
    });
  }
  handleAuth("signin", "/api/auth/sign-in");
  handleAuth("signup", "/api/auth/sign-up");

  /* discord error passed back as ?error=discord */
  if (/[?&]error=discord/.test(location.search)) {
    msg(document.querySelector("[data-auth-msg]"), "Discord sign-in failed. Try again.", "error");
  }

  /* dev test login — a plain link to GET /api/dev/login (logs in + redirects).
     Only revealed when the server reports DEV_LOGIN=true. */
  (async function () {
    var devBtn = document.querySelector("[data-dev-login]");
    if (!devBtn) return;
    try {
      var h = await (await fetch("/api/health")).json();
      if (h.devLogin) devBtn.hidden = false;
    } catch (e) { /* health unavailable — leave the button hidden */ }
  })();

  /* ---------------- sign out ---------------- */
  var signout = document.querySelector("[data-signout]");
  if (signout) {
    signout.addEventListener("click", async function () {
      await fetch("/api/auth/sign-out", { method: "POST" });
      location.reload();
    });
  }

  /* ---------------- orders ---------------- */
  var STATUS_PILL = {
    fulfilled: "ok", paid: "info", pending: "warn", cancelled: "bad", refunded: "bad",
  };
  async function loadOrders() {
    var body = document.querySelector("[data-orders]");
    try {
      var res = await fetch("/api/orders");
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load orders.");
      var orders = data.orders || [];
      if (!orders.length) {
        body.innerHTML = '<tr><td colspan="6" style="color:var(--muted)">No orders yet. <a href="store.html">Browse the store →</a></td></tr>';
        return;
      }
      body.innerHTML = orders.map(function (o) {
        var pill = STATUS_PILL[o.status] || "info";
        var key = o.license_key ? "<code>" + esc(o.license_key) + "</code>" : '<span style="color:var(--muted-2)">—</span>';
        var when = new Date(o.created_at).toLocaleDateString();
        return "<tr>" +
          "<td>" + esc(o.product_name) + "</td>" +
          "<td>" + esc(o.variant_name) + "</td>" +
          "<td>" + money(o.amount_cents) + "</td>" +
          '<td><span class="pill ' + pill + '">' + esc(o.status) + "</span></td>" +
          "<td>" + key + "</td>" +
          "<td>" + when + "</td>" +
        "</tr>";
      }).join("");
    } catch (err) {
      body.innerHTML = '<tr><td colspan="6" style="color:#b91c1c">' + esc(err.message) + "</td></tr>";
    }
  }

  /* ---------------- wallet ---------------- */
  async function loadBalance() {
    try {
      var res = await fetch("/api/balance");
      if (!res.ok) return;
      var data = await res.json();
      var el = document.querySelector("[data-balance]");
      if (el) el.textContent = "$" + ((data.balanceCents || 0) / 100).toFixed(2);
    } catch (e) {}
  }
  var topupBtn = document.querySelector("[data-topup]");
  if (topupBtn) {
    topupBtn.addEventListener("click", async function () {
      var m = document.querySelector("[data-topup-msg]");
      var amount = Math.round(parseFloat(document.querySelector("[data-topup-amount]").value) * 100);
      topupBtn.disabled = true;
      try {
        var res = await fetch("/api/wallet/topup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountCents: amount }) });
        var data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Could not start top-up.");
        window.location.href = data.url;
      } catch (err) {
        m.textContent = err.message; m.className = "nox-msg error"; m.hidden = false;
        topupBtn.disabled = false;
      }
    });
  }
  if (/[?&]topup=success/.test(location.search)) {
    var tm = document.querySelector("[data-dash-msg]");
    if (tm) { tm.textContent = "Balance topped up. It may take a few seconds to appear."; tm.className = "nox-msg success"; tm.hidden = false; }
  }

  /* ---------------- boot ---------------- */
  (async function init() {
    try {
      var res = await fetch("/api/auth/session");
      var data = await res.json();
      var user = data.user;
      if (!user) {
        authView.hidden = false;
        return;
      }
      dashView.hidden = false;
      document.querySelector("[data-user-name]").textContent = user.username || user.email;
      var roleEl = document.querySelector("[data-user-role]");
      if (user.role && user.role !== "user") {
        roleEl.innerHTML = '<span class="pill info">' + esc(user.role) + "</span>";
      }
      if (user.role === "admin") {
        document.querySelector("[data-admin-link]").hidden = false;
      }
      loadOrders();
      loadBalance();
    } catch (err) {
      authView.hidden = false;
      msg(document.querySelector("[data-auth-msg]"), "Backend not reachable. Is the server running?", "error");
    }
  })();

  /* mobile menu */
  var burger = document.querySelector(".nav-burger");
  var mobile = document.querySelector(".mobile-menu");
  if (burger && mobile) burger.addEventListener("click", function () { mobile.classList.toggle("open"); });
})();
