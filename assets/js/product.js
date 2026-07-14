/* NOX CHEATS — product detail page (product.html?id=slug) */
(function () {
  "use strict";
  var main = document.getElementById("productMain");
  if (!main || !window.NOX) return;

  var STATUS = {
    undetected: { label: "Undetected", cls: "" },
    updating:   { label: "Updating", cls: "updating" },
    soon:       { label: "Coming soon", cls: "soon" },
    down:       { label: "Down", cls: "down" }
  };
  var STAR = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"/></svg>';

  function mono(name) {
    var w = name.replace(/[^A-Za-z ]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    return (w.length >= 2 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }
  function stars(r) {
    // 5 stars, filled proportional to rating (simple: round to nearest whole for fill count)
    return STAR + STAR + STAR + STAR + STAR;
  }
  function esc(s) { return s; }

  var id = (new URLSearchParams(location.search).get("id") || "").toLowerCase();
  var p = window.NOX.bySlug[id] || window.NOX.list[0];
  var game = window.NOX.games[p.game];
  var st = STATUS[p.status];
  var durs = window.NOX.durations(p);
  var groups = window.NOX.featureGroups(p);
  var rev = window.NOX.reviewData(p);
  var rel = window.NOX.related(p);
  var unavailable = p.status === "down" || p.status === "soon";
  document.title = p.name + " — Nox Cheats";

  var defaultDur = 0; // durations() is sorted cheapest-first, so open on the lowest price

  /* ---- gallery thumbnails (gradient placeholders) ---- */
  var thumbs = "";
  for (var t = 0; t < 4; t++) {
    thumbs += '<button class="pg-thumb ' + p.cover + (t === 0 ? " on" : "") + '" data-thumb="' + t + '">' +
      (t === 0 ? '<span class="pg-thumb-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' : '<span class="pg-thumb-mono">' + mono(p.name) + '</span>') +
      '</button>';
  }

  /* ---- duration options ---- (variant slug must match the backend catalog,
     which derives it from the same slugify(name)) */
  var durHTML = durs.map(function (d, i) {
    return '<button class="dur' + (i === defaultDur ? " on" : "") + (d.tag ? " has-tag" : "") +
      '" data-price="' + d.price + '" data-note="' + (d.note || "") +
      '" data-variant="' + window.NOX.slugify(d.label) + '">' +
      (d.tag ? '<span class="dur-tag">' + d.tag + '</span>' : '') +
      '<span class="dur-label">' + d.label + '</span>' +
      '<span class="dur-price">$' + d.price + '</span>' +
    '</button>';
  }).join("");

  /* ---- feature groups ---- */
  var groupsHTML = groups.map(function (g, gi) {
    var items = g.items.map(function (it) {
      return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + it + '</li>';
    }).join("");
    return '<article class="feat-block reveal ' + (gi % 2 ? "d1" : "") + '">' +
      '<div class="feat-visual ' + p.cover + '"><span class="cover-mono">' + mono(g.title) + '</span><span class="feat-visual-label">' + g.title.toUpperCase() + '</span></div>' +
      '<div class="feat-detail"><h3>' + g.title + '</h3>' + (g.desc ? '<p>' + g.desc + '</p>' : '') + '<ul class="feat-list">' + items + '</ul></div>' +
    '</article>';
  }).join("");

  /* ---- rating distribution bars ---- */
  var distLabels = [5, 4, 3, 2, 1];
  var distHTML = rev.dist.map(function (c, i) {
    var pct = rev.total ? Math.round((c / rev.total) * 100) : 0;
    return '<div class="rd-row"><span class="rd-star">' + distLabels[i] + ' ★</span>' +
      '<span class="rd-bar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="rd-count">' + c + '</span></div>';
  }).join("");

  /* ---- sample reviews ---- */
  var reviewsHTML = rev.samples.map(function (r) {
    return '<article class="rev-item">' +
      '<div class="rev-top"><span class="stars">' + stars(5) + '</span><span class="rev-when">' + r.when + '</span></div>' +
      '<h4>' + r.title + '</h4><p>' + r.body + '</p>' +
      '<div class="rev-by"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' + r.name + ' · Verified customer</div>' +
    '</article>';
  }).join("");

  /* ---- related products ---- */
  var relHTML = rel.map(function (r) {
    var rst = STATUS[r.status] || STATUS.undetected;
    var priceTxt = "from $" + r.from.toFixed(2);
    return '<a class="rel-card ' + r.cover + '" href="product.html?id=' + r.slug + '">' +
      '<span class="cover-mono">' + mono(r.name) + '</span>' +
      '<span class="status-badge ' + rst.cls + '"><i></i>' + rst.label + '</span>' +
      '<span class="cover-shine"></span>' +
      '<div class="rel-info"><h4>' + r.name + '</h4><div class="rel-meta"><span class="stars sm">' + stars(5) + '</span><b>' + priceTxt + '</b></div></div>' +
    '</a>';
  }).join("");

  /* ---- requirements + before-you-buy (real data) ---- */
  function noteList(title, rows) {
    if (!rows || !rows.length) return "";
    var lis = rows.map(function (r) { return "<li>" + r + "</li>"; }).join("");
    return '<div class="pg-note"><h4>' + title + '</h4><ul>' + lis + "</ul></div>";
  }
  var reqInner = noteList("Requirements", p.requirements) + noteList("Before you buy", p.generalInfo);
  var reqHTML = reqInner ? '<div class="pg-notes reveal">' + reqInner + "</div>" : "";

  var sel = durs[defaultDur];

  main.innerHTML =
  '<section class="pg-hero">' +
    '<div class="container">' +
      '<a class="back-link" href="collection.html?game=' + p.game + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>' + game.title + '</a>' +
      '<div class="pg-grid">' +
        // media
        '<div class="pg-media reveal">' +
          '<div class="pg-stage ' + p.cover + '">' +
            '<span class="cover-mono">' + mono(p.name) + '</span>' +
            '<span class="cover-shine"></span>' +
            '<span class="pg-stage-play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>' +
            '<div class="pg-stage-title">' + p.name + '</div>' +
          '</div>' +
          '<div class="pg-thumbs">' + thumbs + '</div>' +
          '<div class="pg-highlight">' +
            '<span class="pg-highlight-kicker"><i></i>From the lobby</span>' +
            '<div class="pg-highlight-stars stars">' + stars(5) + '</div>' +
            '<p class="pg-highlight-quote">“' + rev.samples[0].body + '”</p>' +
            '<div class="pg-highlight-by">' + rev.samples[0].name + ' · Verified customer on ' + p.name + '</div>' +
          '</div>' +
        '</div>' +
        // buy panel
        '<div class="pg-buy reveal d1" id="buy">' +
          '<div class="pg-buy-head">' +
            '<span class="status-badge ' + st.cls + '"><i></i>' + st.label + '</span>' +
            '<span class="pg-crypto">Crypto checkout · BTC · LTC</span>' +
          '</div>' +
          '<h1>' + p.name + '</h1>' +
          '<p class="pg-desc">' + p.desc + '</p>' +
          '<div class="pg-social">' +
            '<a class="pg-rating" href="#reviews"><span class="stars">' + stars(5) + '</span><b>' + p.rating.toFixed(1) + '</b></a>' +
          '</div>' +
          '<div class="pg-label">' + window.NOX.optionLabel(p) + '</div>' +
          '<div class="pg-durations">' + durHTML + '</div>' +
          (unavailable ? '' :
            '<div class="pg-promo"><input type="text" data-promo placeholder="Promo code" aria-label="Promo code"><button type="button" data-promo-apply>Apply</button></div>' +
            '<p class="nox-msg" data-promo-msg hidden style="margin-top:8px;"></p>') +
          '<div class="pg-cta">' +
            '<div class="pg-total"><span>Total</span><b>$<span id="pgTotal">' + sel.price + '</span></b><em id="pgNote">' + (sel.note || "") + '</em></div>' +
            (unavailable
              ? '<button class="btn btn-primary btn-lg" disabled style="opacity:.6">' + (p.status === "soon" ? "Coming soon" : "Restock soon") + '</button>'
              : '<div class="pg-buy-actions">' +
                  '<button class="btn btn-primary btn-lg" type="button" data-buy>Buy now <span class="arrow">→</span></button>' +
                  '<button class="btn btn-ghost btn-lg btn-add" type="button" data-add-cart>Add to cart</button>' +
                '</div>') +
          '</div>' +
          (unavailable ? '' : '<button class="btn btn-ghost btn-block pg-pay-balance" type="button" data-pay-balance>Pay with balance</button>') +
          '<p class="nox-msg" data-buy-msg hidden style="margin-top:12px;"></p>' +
          '<div class="pg-assure">' +
            '<a href="instructions.html#' + p.slug + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>Setup guide</a>' +
            '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>Instant delivery</span>' +
            '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></svg>Undetected</span>' +
            '<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Secure checkout</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</section>' +

  // inside
  '<section class="section pg-inside">' +
    '<div class="container">' +
      '<div class="section-head reveal"><span class="kicker">What\'s inside</span><h2>Inside ' + p.name + '</h2><p>Every feature, fully configurable from the in-game menu. Press INS to open it.</p></div>' +
      '<div class="feat-blocks">' + groupsHTML + '</div>' +
      reqHTML +
    '</div>' +
  '</section>' +

  // reviews
  '<section class="section pg-reviews" id="reviews" style="padding-top:0">' +
    '<div class="container">' +
      '<div class="section-head reveal"><span class="kicker">From the lobby</span><h2>' + p.name + ' reviews</h2><p>Verified buyers of this build only.</p></div>' +
      '<div class="rev-grid reveal">' +
        '<div class="rev-summary">' +
          '<div class="rev-score"><b>' + rev.rating.toFixed(1) + '</b><span class="stars">' + stars(5) + '</span></div>' +
          '<div class="rev-dist">' + distHTML + '</div>' +
          '<div class="rev-recommend"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg><b>' + rev.recommend + '%</b> recommend this build</div>' +
        '</div>' +
        '<div class="rev-list">' + reviewsHTML +
        '</div>' +
      '</div>' +
    '</div>' +
  '</section>' +

  // related
  (rel.length ? '<section class="section pg-related" style="padding-top:0">' +
    '<div class="container">' +
      '<div class="section-head between reveal"><div><span class="kicker">More builds</span><h2>More ' + game.title + ' cheats</h2></div>' +
      '<a class="btn btn-ghost" href="collection.html?game=' + p.game + '">All ' + game.title + ' →</a></div>' +
      '<div class="rel-grid">' + relHTML + '</div>' +
    '</div>' +
  '</section>' : '') +

  // cta
  '<section class="section" style="padding-top:0">' +
    '<div class="container"><div class="cta-band reveal">' +
      '<h2>Take every lobby on your terms.</h2>' +
      '<p>Instant key delivery — you\'re in the action minutes after checkout, with 24/7 support whenever you need a hand.</p>' +
      '<a class="btn btn-lg" href="#buy">Get ' + p.name + ' — from $' + window.NOX.fromPrice(p) + ' <span class="arrow">→</span></a>' +
    '</div></div>' +
  '</section>';

  /* ---- interactions ---- */
  // duration select
  var totalEl = document.getElementById("pgTotal");
  var noteEl = document.getElementById("pgNote");
  var selectedVariant = durs.length ? window.NOX.slugify(durs[defaultDur].label) : null;
  var activePromo = null; // { code, percent }

  function discounted(price) { return activePromo ? Math.max(0.5, price * (1 - activePromo.percent / 100)) : price; }
  function refreshTotal() {
    var v = currentVariant();
    if (totalEl) totalEl.textContent = discounted(v.price).toFixed(2);
  }

  main.querySelectorAll(".dur").forEach(function (btn) {
    btn.addEventListener("click", function () {
      main.querySelectorAll(".dur").forEach(function (b) { b.classList.remove("on"); });
      btn.classList.add("on");
      if (noteEl) noteEl.textContent = btn.getAttribute("data-note") || "";
      selectedVariant = btn.getAttribute("data-variant");
      refreshTotal();
    });
  });

  // resolve the currently selected variant object (name + price) from its slug
  function currentVariant() {
    return (p.variants || []).find(function (v) { return window.NOX.slugify(v.name) === selectedVariant; }) || p.variants[0];
  }

  // promo code
  var promoApply = main.querySelector("[data-promo-apply]");
  if (promoApply) {
    promoApply.addEventListener("click", async function () {
      var input = main.querySelector("[data-promo]");
      var m = main.querySelector("[data-promo-msg]");
      var code = (input.value || "").trim();
      if (!code) { activePromo = null; refreshTotal(); m.hidden = true; return; }
      try {
        var res = await fetch("/api/promo/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code }) });
        var data = await res.json();
        if (!data.valid) { activePromo = null; m.textContent = "That code isn't valid."; m.className = "nox-msg error"; }
        else { activePromo = { code: data.code, percent: data.percent }; m.textContent = data.code + " applied — " + data.percent + "% off."; m.className = "nox-msg success"; }
        m.hidden = false; refreshTotal();
      } catch (e) { m.textContent = "Couldn't check that code."; m.className = "nox-msg error"; m.hidden = false; }
    });
  }

  // pay with balance
  var balBtn = main.querySelector("[data-pay-balance]");
  if (balBtn) {
    balBtn.addEventListener("click", async function () {
      var msgEl = main.querySelector("[data-buy-msg]");
      function say(t, tone) { if (msgEl) { msgEl.textContent = t; msgEl.className = "nox-msg " + (tone || "warn"); msgEl.hidden = false; } }
      balBtn.disabled = true;
      var original = balBtn.textContent;
      balBtn.textContent = "Processing…";
      try {
        var res = await fetch("/api/purchase-with-balance", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productSlug: p.slug, variantSlug: selectedVariant, promoCode: activePromo && activePromo.code }),
        });
        if (res.status === 401) { say("Sign in to pay with balance. Redirecting…"); setTimeout(function () { window.location.href = "account.html"; }, 900); return; }
        var data = await res.json();
        if (res.status === 402) { say("Not enough balance. Add funds on your account page.", "warn"); balBtn.disabled = false; balBtn.textContent = original; return; }
        if (!res.ok) throw new Error(data.error || "Purchase failed.");
        say("Purchased! Your key: " + (data.licenseKey || "check your account"), "success");
        balBtn.textContent = "Purchased ✓";
      } catch (err) { say(err.message, "error"); balBtn.disabled = false; balBtn.textContent = original; }
    });
  }

  // real reviews for this product (replace the generated list if any exist)
  (async function loadRealReviews() {
    try {
      var data = await (await fetch("/api/reviews/product/" + encodeURIComponent(p.slug))).json();
      var reviews = data.reviews || [];
      if (!reviews.length) return;
      var listEl = main.querySelector(".rev-list");
      if (!listEl) return;
      listEl.innerHTML = reviews.map(function (r) {
        return '<article class="rev-item"><div class="rev-top"><span class="stars">' + "★★★★★".slice(0, r.rating) +
          '</span><span class="rev-when">' + new Date(r.created_at).toLocaleDateString() + "</span></div>" +
          "<p>" + (r.review_text || "").replace(/[<>]/g, "") + "</p>" +
          '<div class="rev-by"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          (r.username || "Anonymous").replace(/[<>]/g, "") + " · Verified customer</div></article>";
      }).join("");
    } catch (e) {}
  })();

  // add to cart
  var addBtn = main.querySelector("[data-add-cart]");
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      if (!window.noxCart) return;
      var v = currentVariant();
      window.noxCart.add({
        productSlug: p.slug,
        variantSlug: selectedVariant,
        productName: p.name,
        variantName: v.name,
        cover: p.cover,
        priceCents: Math.round(v.price * 100),
        qty: 1,
      });
      var original = addBtn.textContent;
      addBtn.textContent = "Added ✓";
      window.noxCart.open();
      setTimeout(function () { addBtn.textContent = original; }, 1200);
    });
  }

  // buy now -> Stripe checkout via the backend
  var buyBtn = main.querySelector("[data-buy]");
  if (buyBtn) {
    buyBtn.addEventListener("click", async function () {
      var msgEl = main.querySelector("[data-buy-msg]");
      function say(text, tone) { if (msgEl) { msgEl.textContent = text; msgEl.className = "nox-msg " + (tone || "warn"); msgEl.hidden = false; } }

      buyBtn.disabled = true;
      var original = buyBtn.innerHTML;
      buyBtn.textContent = "Starting checkout…";
      try {
        var res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productSlug: p.slug, variantSlug: selectedVariant, promoCode: activePromo && activePromo.code }),
        });
        if (res.status === 401) {
          say("Sign in to complete your purchase. Redirecting…", "warn");
          setTimeout(function () { window.location.href = "account.html"; }, 900);
          return;
        }
        var data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout.");
        window.location.href = data.url;
      } catch (err) {
        say(err.message, "error");
        buyBtn.disabled = false;
        buyBtn.innerHTML = original;
      }
    });
  }
  // gallery thumbs
  var stage = main.querySelector(".pg-stage");
  main.querySelectorAll(".pg-thumb").forEach(function (thumb) {
    thumb.addEventListener("click", function () {
      main.querySelectorAll(".pg-thumb").forEach(function (t) { t.classList.remove("on"); });
      thumb.classList.add("on");
    });
  });

  // reveal + spotlight (main.js only wired elements present at load; re-run for injected ones)
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    main.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    main.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
  }
  main.querySelectorAll(".rel-card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });
})();
