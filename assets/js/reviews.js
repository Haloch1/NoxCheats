/* NOX CHEATS — reviews page. Lists real reviews and lets verified buyers post. */
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

  async function loadWall() {
    try {
      var res = await fetch("/api/reviews?limit=60");
      var data = await res.json();
      var reviews = data.reviews || [];
      if (!reviews.length) {
        wall.innerHTML = '<p style="color:var(--muted)">No reviews yet — be the first after your next purchase.</p>';
        document.querySelector("[data-rev-avg]").textContent = "5.0";
        return;
      }
      var avg = reviews.reduce(function (s, r) { return s + r.rating; }, 0) / reviews.length;
      document.querySelector("[data-rev-avg]").textContent = avg.toFixed(1);
      document.querySelector("[data-rev-count]").textContent = reviews.length;
      wall.innerHTML = reviews.map(function (r) {
        return '<article class="review-card">' +
          '<div class="review-head"><span class="review-stars">' + stars(r.rating) + '</span><span class="review-game">' + esc(r.product_name || "") + "</span></div>" +
          "<p>" + esc(r.review_text) + "</p>" +
          '<span class="review-user"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          esc(r.username) + " · Verified customer <em>" + when(r.created_at) + "</em></span>" +
        "</article>";
      }).join("");
    } catch (err) {
      wall.innerHTML = '<p style="color:#b91c1c">Couldn\'t load reviews. Is the server running?</p>';
    }
  }

  /* star picker */
  var chosen = 5;
  var picker = document.querySelector("[data-star-picker]");
  function paint() { picker.querySelectorAll("span").forEach(function (s) { s.classList.toggle("on", Number(s.getAttribute("data-v")) <= chosen); }); }
  if (picker) {
    picker.querySelectorAll("span").forEach(function (s) { s.addEventListener("click", function () { chosen = Number(s.getAttribute("data-v")); paint(); }); });
    paint();
  }

  async function initWriter() {
    try {
      var s = await (await fetch("/api/auth/session")).json();
      var hint = document.querySelector("[data-rev-hint]");
      if (!s.user) { hint.textContent = "Sign in and buy a product to leave a review."; hint.className = "nox-msg"; hint.hidden = false; return; }
      var el = await (await fetch("/api/reviews/eligible")).json();
      var eligible = el.eligible || [];
      if (!eligible.length) { hint.textContent = "You can review products once you've purchased them."; hint.className = "nox-msg"; hint.hidden = false; return; }
      var sel = document.querySelector("[data-rev-product]");
      sel.innerHTML = eligible.map(function (p) { return '<option value="' + esc(p.productSlug) + '">' + esc(p.productName) + "</option>"; }).join("");
      document.querySelector("[data-rev-write]").hidden = false;
    } catch (e) {}
  }

  var submit = document.querySelector("[data-rev-submit]");
  if (submit) {
    submit.addEventListener("click", async function () {
      var msg = document.querySelector("[data-rev-msg]");
      var payload = {
        productSlug: document.querySelector("[data-rev-product]").value,
        rating: chosen,
        text: document.querySelector("[data-rev-text]").value,
      };
      submit.disabled = true;
      try {
        var res = await fetch("/api/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not submit.");
        msg.textContent = "Thanks for your review!"; msg.className = "nox-msg success"; msg.hidden = false;
        document.querySelector("[data-rev-text]").value = "";
        loadWall();
      } catch (err) {
        msg.textContent = err.message; msg.className = "nox-msg error"; msg.hidden = false;
      } finally { submit.disabled = false; }
    });
  }

  loadWall();
  initWriter();
})();
