/* NOX CHEATS — per-game product listing (collection.html?game=slug) */
(function () {
  "use strict";
  var grid = document.getElementById("prodGrid");
  if (!grid || !window.NOX) return;

  var STATUS = {
    undetected: { label: "Undetected", cls: "" },
    updating:   { label: "Updating", cls: "updating" },
    soon:       { label: "Coming soon", cls: "soon" },
    down:       { label: "Down", cls: "down" }
  };
  var STAR = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"/></svg>';

  var slug = (new URLSearchParams(location.search).get("game") || "r6").toLowerCase();
  if (!window.NOX.games[slug]) slug = "r6";
  var game = window.NOX.games[slug];
  var list = window.NOX.byGame(slug);

  document.getElementById("collKicker").textContent = "Products";
  document.getElementById("collTitle").textContent = game.title;
  document.getElementById("collDesc").textContent =
    "Every " + game.title + " build is kernel-level, tested against the live patch, and delivered the second your payment clears.";
  document.title = game.title + " — Nox Cheats";
  document.getElementById("prodCount").textContent = list.length;

  function mono(name) {
    var w = name.replace(/[^A-Za-z ]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    return (w.length >= 2 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
  }

  function cardHTML(p, i) {
    var st = STATUS[p.status] || STATUS.undetected;
    var ribbon = p.ribbon
      ? '<span class="ribbon ' + p.ribbon + '">' + (p.ribbon === "new" ? "NEW" : "Featured") + '</span>' : '';
    var delay = ["", "d1", "d2"][i % 3];
    var count = p.variants.length;
    var href = "product.html?id=" + p.slug;
    return '' +
      '<article class="prod-card reveal ' + delay + '" data-name="' + p.name.toLowerCase() + '">' +
        '<a class="prod-cover ' + p.cover + '" href="' + href + '">' +
          '<span class="cover-mono">' + mono(p.name) + '</span>' +
          ribbon +
          '<span class="cover-tag">' + game.title.split(" ")[0].toUpperCase() + '</span>' +
          '<div class="prod-cover-title">' + p.name + '</div>' +
          '<span class="cover-shine"></span>' +
        '</a>' +
        '<div class="prod-info">' +
          '<div class="prod-row1">' +
            '<a class="prod-name" href="' + href + '">' + p.name + '</a>' +
            '<span class="status-badge ' + st.cls + '"><i></i>' + st.label + '</span>' +
          '</div>' +
          '<div class="prod-row2">' +
            '<span class="variants"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>' + count + (count === 1 ? ' Variant' : ' Variants') + '</span>' +
            '<span class="stars">' + STAR + STAR + STAR + STAR + STAR + '</span>' +
          '</div>' +
          '<div class="prod-row3">' +
            '<span class="price"><span class="from">From</span> <b>$' + p.from.toFixed(2) + '</b></span>' +
            '<a class="game-btn" href="' + href + '">View <span>→</span></a>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  grid.innerHTML = list.map(cardHTML).join("");

  /* reveal + spotlight */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    grid.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    grid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
  }
  grid.querySelectorAll(".prod-card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
  });

  /* search */
  var searchEl = document.getElementById("prodSearch");
  var countEl = document.getElementById("prodCount");
  var emptyEl = document.getElementById("prodEmpty");
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      var q = searchEl.value.trim().toLowerCase();
      var shown = 0;
      grid.querySelectorAll(".prod-card").forEach(function (card) {
        var match = !q || (card.getAttribute("data-name") || "").indexOf(q) !== -1;
        card.classList.toggle("hidden", !match);
        if (match) shown++;
      });
      countEl.textContent = shown;
      emptyEl.classList.toggle("show", shown === 0);
    });
  }
})();
