/* NOX CHEATS — navbar enhancements: live "online" chip, search, currency
   chip and a Login button. Runs on every page; safe to load once. */
(function () {
  "use strict";
  var inner = document.querySelector(".nav-inner");
  if (!inner) return;
  var brand = inner.querySelector(".brand");
  var actions = inner.querySelector(".nav-actions");

  /* ── live "online" chip beside the brand ── */
  if (brand && !inner.querySelector(".nav-online")) {
    var chip = document.createElement("div");
    chip.className = "nav-online";
    chip.innerHTML = '<span class="dot"></span><b class="n"></b><span class="lbl">online</span>';
    brand.insertAdjacentElement("afterend", chip);
    var nEl = chip.querySelector(".n");
    var n = 900 + Math.floor(Math.random() * 220);
    nEl.textContent = n;
    setInterval(function () {
      n += Math.floor(Math.random() * 9) - 4;
      if (n < 820) n = 820;
      if (n > 1140) n = 1140;
      nEl.textContent = n;
    }, 4500);
  }

  if (actions) {
    /* currency / language chip (display only) — prepend order gives: search, currency, … */
    if (!actions.querySelector(".nav-cur")) {
      var cur = document.createElement("span");
      cur.className = "nav-cur";
      cur.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>' +
        '<span>EN · $</span>' +
        '<svg class="cur-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      actions.insertBefore(cur, actions.firstChild);
    }

    /* search button -> the store (which has real product search) */
    if (!actions.querySelector(".nav-search")) {
      var search = document.createElement("a");
      search.href = "store.html";
      search.className = "icon-btn nav-search";
      search.setAttribute("aria-label", "Search products");
      search.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>';
      actions.insertBefore(search, actions.firstChild);
    }

    /* turn the account icon into a text "Login" button */
    var acct = actions.querySelector("a.accent");
    if (acct && !acct.classList.contains("nav-login")) {
      acct.className = "btn btn-primary nav-login";
      acct.innerHTML = "Login";
    }
  }
})();
