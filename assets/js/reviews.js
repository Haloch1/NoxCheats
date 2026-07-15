/* NOX CHEATS — reviews page: purchases-to-review grid, AI-moderated write modal, all-reviews wall. */
(function () {
  "use strict";
  function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }
  function stars(n) { n = Math.max(0, Math.min(5, Math.round(n))); return "★".repeat(n) + "☆".repeat(5 - n); }
  function when(iso) {
    var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return "today"; if (days === 1) return "yesterday";
    if (days < 30) return days + " days ago"; var m = Math.floor(days / 30); return m === 1 ? "1 month ago" : m + " months ago";
  }

  var wall = document.querySelector("[data-reviews-wall]");
  var purchasesSection = document.querySelector("[data-rev-purchases]");
  var purchasesGrid = document.querySelector("[data-purchases-grid]");
  var hint = document.querySelector("[data-rev-hint]");
  var modal = document.querySelector("[data-review-modal]");
  var modalProduct = document.querySelector("[data-rev-product]");
  var textEl = document.querySelector("[data-rev-text]");
  var msgEl = document.querySelector("[data-rev-msg]");
  var picker = document.querySelector("[data-star-picker]");
  var submitBtn = document.querySelector("[data-rev-submit]");
  var currentSlug = null;
  var chosen = 5;

  function paint() { if (picker) picker.querySelectorAll("span").forEach(function (s) { s.classList.toggle("on", Number(s.getAttribute("data-v")) <= chosen); }); }
  if (picker) picker.querySelectorAll("span").forEach(function (s) { s.addEventListener("click", function () { chosen = Number(s.getAttribute("data-v")); paint(); }); });

  async function loadWall() {
    try {
      var res = await fetch("/api/reviews?limit=60");
      var data = await res.json();
      var reviews = data.reviews || [];
      var avgEl = document.querySelector("[data-rev-avg]");
      var countEl = document.querySelector("[data-rev-count]");
      if (!reviews.length) {
        wall.innerHTML = '<p class="rev-note">No reviews yet — be the first after your next purchase.</p>';
        if (avgEl) avgEl.textContent = "4.8"; if (countEl) countEl.textContent = "0";
        return;
      }
      if (avgEl) avgEl.textContent = "4.8";
      if (countEl) countEl.textContent = reviews.length;
      wall.innerHTML = reviews.map(function (r) {
        var badge = r.source === "discord" ? "Discord community" : "Verified customer";
        return '<article class="review-card">' +
          '<div class="review-head"><span class="review-stars">' + stars(r.rating) + '</span><span class="review-game">' + esc(r.product_name || "") + "</span></div>" +
          "<p>" + esc(r.review_text) + "</p>" +
          '<span class="review-user"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          esc(r.username) + " · " + badge + " <em>" + when(r.created_at) + "</em></span>" +
        "</article>";
      }).join("");
    } catch (err) {
      wall.innerHTML = '<p class="rev-note" style="color:#b91c1c">Couldn\'t load reviews. Is the server running?</p>';
    }
  }

  async function loadPurchases() {
    try {
      var s = await (await fetch("/api/auth/session")).json();
      if (!s.user) { purchasesSection.hidden = true; hint.textContent = "Sign in and buy a product to leave a review."; hint.hidden = false; return; }
      var el = await (await fetch("/api/reviews/eligible")).json();
      var eligible = el.eligible || [];
      if (!eligible.length) { purchasesSection.hidden = true; hint.textContent = "You can leave a review once you've purchased a product."; hint.hidden = false; return; }
      hint.hidden = true;
      purchasesGrid.innerHTML = eligible.map(function (p) {
        return '<div class="purchase-card"><div><span class="purchase-eyebrow">Purchased</span><strong>' + esc(p.productName) + "</strong></div>" +
          '<button class="btn btn-primary btn-sm" data-review-slug="' + esc(p.productSlug) + '" data-review-name="' + esc(p.productName) + '">Write a review</button></div>';
      }).join("");
      purchasesGrid.querySelectorAll("[data-review-slug]").forEach(function (b) {
        b.addEventListener("click", function () { openModal(b.getAttribute("data-review-slug"), b.getAttribute("data-review-name")); });
      });
      purchasesSection.hidden = false;
    } catch (e) { /* ignore */ }
  }

  function openModal(slug, name) {
    currentSlug = slug; chosen = 5; paint();
    if (modalProduct) modalProduct.textContent = name || "Your review";
    if (textEl) textEl.value = "";
    if (msgEl) { msgEl.hidden = true; msgEl.textContent = ""; }
    modal.hidden = false;
    if (textEl) setTimeout(function () { textEl.focus(); }, 30);
  }
  function closeModal() { modal.hidden = true; }
  document.querySelectorAll("[data-rev-close]").forEach(function (el) { el.addEventListener("click", closeModal); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal && !modal.hidden) closeModal(); });

  if (submitBtn) submitBtn.addEventListener("click", async function () {
    if (!currentSlug) return;
    var payload = { productSlug: currentSlug, rating: chosen, text: textEl.value };
    submitBtn.disabled = true;
    try {
      var res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not submit review.");
      closeModal();
      await loadWall();
      await loadPurchases();
    } catch (err) {
      if (msgEl) { msgEl.textContent = err.message; msgEl.className = "nox-msg error"; msgEl.hidden = false; }
    } finally { submitBtn.disabled = false; }
  });

  loadWall();
  loadPurchases();
})();
