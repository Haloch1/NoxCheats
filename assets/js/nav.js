/* NOX CHEATS — navbar enhancement: turn the account icon into a Login button. */
(function () {
  "use strict";
  var inner = document.querySelector(".nav-inner");
  if (!inner) return;
  var actions = inner.querySelector(".nav-actions");
  if (!actions) return;
  var acct = actions.querySelector("a.accent");
  if (acct && !acct.classList.contains("nav-login")) {
    acct.className = "btn btn-primary nav-login";
    acct.innerHTML = "Login";
  }
})();
