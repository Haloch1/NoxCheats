/* NOX CHEATS — shopping cart.
   Cart lives in localStorage so it survives navigation across the static
   pages. Checkout posts the whole cart to /api/cart/checkout (backend) and
   redirects to Stripe. Exposes window.noxCart for the product page. */
(function () {
  "use strict";

  var drawer = document.querySelector(".cart-drawer");
  if (!drawer) return;

  var CART_KEY = "nox_cart";

  function read() {
    try { var v = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
  }
  function count(items) { items = items || read(); return items.reduce(function (n, i) { return n + (Number(i.qty) || 1); }, 0); }
  function unit(cents) { return activePromo ? Math.max(50, Math.round(cents * (1 - activePromo.percent / 100))) : cents; }
  function totalCents(items) { items = items || read(); return items.reduce(function (n, i) { return n + unit(Number(i.priceCents) || 0) * (Number(i.qty) || 1); }, 0); }
  function money(c) { return "$" + ((Number(c) || 0) / 100).toFixed(2); }
  function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }

  var emptyEl = drawer.querySelector(".cart-empty");

  /* Build the live parts (list + footer) once. */
  var body = document.createElement("div");
  body.className = "cart-body";
  body.hidden = true;
  body.innerHTML = '<div class="cart-list" data-cart-list></div>';

  var foot = document.createElement("div");
  foot.className = "cart-foot";
  foot.hidden = true;
  foot.innerHTML =
    '<div class="pg-promo" style="margin-top:0;"><input type="text" data-cart-promo placeholder="Promo code" aria-label="Promo code"><button type="button" data-cart-promo-apply>Apply</button></div>' +
    '<div class="cart-row total"><span>Total</span><strong data-cart-total>$0.00</strong></div>' +
    '<p class="nox-msg" data-cart-msg hidden></p>' +
    '<button type="button" class="btn btn-primary btn-block" data-cart-checkout>Checkout with card</button>' +
    '<button type="button" class="btn btn-ghost btn-block" data-cart-balance style="margin-top:8px;">Pay with balance</button>' +
    '<a class="btn btn-ghost btn-block" href="store.html" style="margin-top:8px;">Keep shopping</a>';

  drawer.appendChild(body);
  drawer.appendChild(foot);

  var listEl = body.querySelector("[data-cart-list]");
  var totalEl = foot.querySelector("[data-cart-total]");
  var msgEl = foot.querySelector("[data-cart-msg]");
  var checkoutBtn = foot.querySelector("[data-cart-checkout]");
  var balanceBtn = foot.querySelector("[data-cart-balance]");
  var activePromo = null; // { code, percent }

  function badge() {
    var n = count();
    document.querySelectorAll("[data-cart-open] .count").forEach(function (el) {
      el.textContent = String(n);
      el.style.display = n ? "" : "none";
    });
  }

  function render() {
    var items = read();
    var has = items.length > 0;
    if (emptyEl) emptyEl.hidden = has;
    body.hidden = !has;
    foot.hidden = !has;
    badge();
    if (!has) { listEl.innerHTML = ""; return; }

    listEl.innerHTML = items.map(function (i, idx) {
      return '<div class="cart-item">' +
        '<span class="cart-item-cover ' + esc(i.cover || "cover-generic") + '">' +
          ((window.NOX && window.NOX.productImg) ? window.NOX.productImg({ slug: i.productSlug, name: i.productName }) : "") +
          esc(monogram(i.productName)) + '</span>' +
        '<div class="cart-item-main">' +
          '<div class="cart-item-name">' + esc(i.productName) + '</div>' +
          '<div class="cart-item-variant">' + esc(i.variantName) + '</div>' +
          '<div class="cart-qty">' +
            '<button type="button" data-qty="-1" data-i="' + idx + '" aria-label="Less">-</button>' +
            '<span>' + (Number(i.qty) || 1) + '</span>' +
            '<button type="button" data-qty="1" data-i="' + idx + '" aria-label="More">+</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-item-right">' +
          '<span class="cart-item-price">' + money(unit(Number(i.priceCents) || 0) * (Number(i.qty) || 1)) + '</span>' +
          '<button type="button" class="cart-remove" data-remove="' + idx + '">Remove</button>' +
        '</div>' +
      '</div>';
    }).join("");
    totalEl.textContent = money(totalCents(items));
  }

  function monogram(name) {
    var w = String(name || "").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
    if (!w.length) return "NX";
    return (w.length >= 2 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }

  /* qty +/- and remove */
  listEl.addEventListener("click", function (e) {
    var q = e.target.closest("[data-qty]");
    var r = e.target.closest("[data-remove]");
    var items = read();
    if (q) {
      var idx = Number(q.getAttribute("data-i"));
      var next = (Number(items[idx].qty) || 1) + Number(q.getAttribute("data-qty"));
      if (next < 1) items.splice(idx, 1); else items[idx].qty = Math.min(10, next);
      write(items); if (msgEl) msgEl.hidden = true; render();
    } else if (r) {
      items.splice(Number(r.getAttribute("data-remove")), 1);
      write(items); if (msgEl) msgEl.hidden = true; render();
    }
  });

  /* open re-renders (content may have changed on another page) */
  document.querySelectorAll("[data-cart-open]").forEach(function (b) {
    b.addEventListener("click", render);
  });

  /* checkout */
  checkoutBtn.addEventListener("click", async function () {
    var items = read();
    if (!items.length) return;
    function say(t, tone) { if (msgEl) { msgEl.textContent = t; msgEl.className = "nox-msg " + (tone || "warn"); msgEl.hidden = false; } }

    checkoutBtn.disabled = true;
    var original = checkoutBtn.textContent;
    checkoutBtn.textContent = "Starting checkout…";
    try {
      var res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(function (i) { return { productSlug: i.productSlug, variantSlug: i.variantSlug, quantity: Number(i.qty) || 1 }; }),
          promoCode: activePromo && activePromo.code,
        }),
      });
      if (res.status === 401) {
        say("Sign in to check out. Redirecting…", "warn");
        setTimeout(function () { window.location.href = "account.html"; }, 900);
        return;
      }
      var data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch (err) {
      say(err.message, "error");
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = original;
    }
  });

  /* promo code */
  var promoApply = foot.querySelector("[data-cart-promo-apply]");
  if (promoApply) {
    promoApply.addEventListener("click", async function () {
      var code = (foot.querySelector("[data-cart-promo]").value || "").trim();
      function say(t, tone) { if (msgEl) { msgEl.textContent = t; msgEl.className = "nox-msg " + (tone || "warn"); msgEl.hidden = false; } }
      if (!code) { activePromo = null; render(); if (msgEl) msgEl.hidden = true; return; }
      try {
        var data = await (await fetch("/api/promo/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code }) })).json();
        if (!data.valid) { activePromo = null; say("That code isn't valid.", "error"); }
        else { activePromo = { code: data.code, percent: data.percent }; say(data.code + " applied — " + data.percent + "% off.", "success"); }
        render();
      } catch (e) { say("Couldn't check that code.", "error"); }
    });
  }

  /* pay with balance */
  if (balanceBtn) {
    balanceBtn.addEventListener("click", async function () {
      var items = read();
      if (!items.length) return;
      function say(t, tone) { if (msgEl) { msgEl.textContent = t; msgEl.className = "nox-msg " + (tone || "warn"); msgEl.hidden = false; } }
      balanceBtn.disabled = true;
      var original = balanceBtn.textContent;
      balanceBtn.textContent = "Processing…";
      try {
        var res = await fetch("/api/cart/checkout-balance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map(function (i) { return { productSlug: i.productSlug, variantSlug: i.variantSlug, quantity: Number(i.qty) || 1 }; }),
            promoCode: activePromo && activePromo.code,
          }),
        });
        if (res.status === 401) { say("Sign in to pay with balance. Redirecting…"); setTimeout(function () { window.location.href = "account.html"; }, 900); return; }
        var data = await res.json();
        if (res.status === 402) { say("Not enough balance. Add funds on your account page.", "warn"); balanceBtn.disabled = false; balanceBtn.textContent = original; return; }
        if (!res.ok) throw new Error(data.error || "Checkout failed.");
        write([]); activePromo = null; render();
        say((data.delivered || []).length + " key(s) delivered — view them on your account.", "success");
        balanceBtn.textContent = original; balanceBtn.disabled = false;
      } catch (err) { say(err.message, "error"); balanceBtn.disabled = false; balanceBtn.textContent = original; }
    });
  }

  /* public API for the product page */
  window.noxCart = {
    add: function (item) {
      var items = read();
      var i = items.findIndex(function (x) { return x.productSlug === item.productSlug && x.variantSlug === item.variantSlug; });
      if (i >= 0) items[i].qty = Math.min(10, (Number(items[i].qty) || 1) + (Number(item.qty) || 1));
      else items.push({ ...item, qty: Number(item.qty) || 1 });
      write(items);
      render();
    },
    open: function () { document.body.classList.add("cart-open"); render(); },
    count: count,
  };

  render();
})();
