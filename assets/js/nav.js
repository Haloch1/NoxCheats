/* NOX CHEATS — navbar enhancements: real "online now" counter + Login button.
   Runs on every page; safe to load once. */
(function () {
  "use strict";
  var inner = document.querySelector(".nav-inner");
  if (!inner) return;
  var brand = inner.querySelector(".brand");
  var actions = inner.querySelector(".nav-actions");

  /* turn the account icon into a text "Login" button */
  if (actions) {
    var acct = actions.querySelector("a.accent");
    if (acct && !acct.classList.contains("nav-login")) {
      acct.className = "btn btn-primary nav-login";
      acct.innerHTML = "Login";
    }
  }

  /* ── real "online now" chip beside the brand ── */
  if (!brand || inner.querySelector(".nav-online")) return;

  var chip = document.createElement("div");
  chip.className = "nav-online";
  chip.innerHTML = '<span class="dot"></span><b class="n">–</b><span class="lbl">online</span>';
  brand.insertAdjacentElement("afterend", chip);
  var nEl = chip.querySelector(".n");

  // a stable id for this browser so the server counts tabs, not requests
  var id;
  try {
    id = localStorage.getItem("nox_cid");
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("nox_cid", id); }
  } catch (e) { id = Math.random().toString(36).slice(2); }

  function refresh() {
    fetch("/api/online/ping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d && typeof d.online === "number") nEl.textContent = d.online; })
      .catch(function () { chip.style.display = "none"; }); // hide if backend unavailable (e.g. file://)
  }

  refresh();
  setInterval(refresh, 30000);
})();
