/* NOX CHEATS — navbar: Login button + brand logo swap */
(function () {
  "use strict";
  var inner = document.querySelector(".nav-inner");
  if (inner) {
    var actions = inner.querySelector(".nav-actions");
    if (actions) {
      var acct = actions.querySelector("a.accent");
      if (acct && !acct.classList.contains("nav-login")) {
        acct.className = "btn btn-primary nav-login";
        acct.innerHTML = "Login";
      }
    }
  }

  /* swap the "N" mark for the real logo when assets/img/logo.png exists
     (keeps the "N" as a fallback if the file is missing) */
  document.querySelectorAll(".brand-mark").forEach(function (m) {
    if (m.querySelector(".brand-logo-img")) return;
    var img = new Image();
    img.className = "brand-logo-img";
    img.alt = "Nox Cheats";
    img.onload = function () { m.classList.add("has-logo"); m.appendChild(img); };
    img.src = "assets/img/logo.png";
  });
})();
