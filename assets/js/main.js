/* NOX CHEATS — shared interactions */
(function () {
  "use strict";

  /* ---------------- nav ---------------- */
  var nav = document.querySelector(".nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.querySelector(".nav-burger");
  var mobile = document.querySelector(".mobile-menu");
  if (burger && mobile) {
    burger.addEventListener("click", function () { mobile.classList.toggle("open"); });
    mobile.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { mobile.classList.remove("open"); });
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ============================================================
     NOX MENU — fully interactive cheat menu
     ============================================================ */
  var tabsEl = document.getElementById("noxTabs");
  var panelEl = document.getElementById("noxPanel");

  if (tabsEl && panelEl) {
    var pct = function (v) { return v + "%"; };
    var deg = function (v) { return v + "°"; };
    var dec = function (v) { return (v / 10).toFixed(1); };
    var px = function (v) { return v + "px"; };

    // default state, cloned on reset
    var DEFAULTS = {
      Aimbot: [
        { id: "aim_on", type: "toggle", label: "Enable aimbot", value: true },
        { id: "aim_key", type: "select", label: "Aim key", options: ["Right mouse", "Left alt", "Always on"], value: 0 },
        { id: "aim_bone", type: "select", label: "Target bone", options: ["Head", "Neck", "Chest", "Nearest"], value: 0 },
        { id: "aim_smooth", type: "slider", label: "Smoothing", value: 42, format: dec },
        { id: "aim_fov", type: "slider", label: "FOV radius", value: 65, format: deg },
        { id: "aim_vis", type: "toggle", label: "Visibility check", value: true },
        { id: "aim_trig", type: "toggle", label: "Triggerbot", value: false },
        { id: "aim_recoil", type: "slider", label: "Recoil control", value: 88, format: pct }
      ],
      Visuals: [
        { id: "esp_box", type: "toggle", label: "Player boxes", value: true },
        { id: "esp_skel", type: "toggle", label: "Skeleton", value: false },
        { id: "esp_hp", type: "toggle", label: "Health bars", value: true },
        { id: "esp_name", type: "toggle", label: "Name tags", value: true },
        { id: "esp_dist", type: "toggle", label: "Distance", value: true },
        { id: "esp_loot", type: "select", label: "Loot filter", options: ["Rare+", "Epic+", "All items", "Off"], value: 0 },
        { id: "esp_range", type: "slider", label: "Render range", value: 70, format: function (v) { return v * 4 + "m"; } },
        { id: "esp_glow", type: "slider", label: "Chams opacity", value: 55, format: pct }
      ],
      Radar: [
        { id: "rad_on", type: "toggle", label: "Enable radar", value: true },
        { id: "rad_size", type: "slider", label: "Radar size", value: 60, format: function (v) { return 100 + v * 2 + "px"; } },
        { id: "rad_zoom", type: "slider", label: "Zoom", value: 45, format: function (v) { return (v / 20 + 0.5).toFixed(1) + "x"; } },
        { id: "rad_teams", type: "toggle", label: "Show teammates", value: false },
        { id: "rad_arrow", type: "toggle", label: "View cones", value: true },
        { id: "rad_pos", type: "select", label: "Position", options: ["Top left", "Top right", "Center"], value: 0 }
      ],
      Misc: [
        { id: "misc_stream", type: "toggle", label: "Stream proof", value: true },
        { id: "misc_spoof", type: "toggle", label: "HWID spoofer", value: true },
        { id: "misc_speed", type: "toggle", label: "Speed hack", value: false },
        { id: "misc_noflash", type: "toggle", label: "No flash", value: true },
        { id: "misc_fov", type: "slider", label: "Custom FOV", value: 50, format: function (v) { return 70 + Math.round(v * 0.5) + "°"; } },
        { id: "misc_fps", type: "toggle", label: "FPS overlay", value: false }
      ],
      Config: [
        { id: "cfg_preset", type: "select", label: "Preset", options: ["Legit", "Balanced", "Rage"], value: 1 },
        { id: "cfg_menu", type: "select", label: "Menu key", options: ["INS", "F1", "END"], value: 0 },
        { id: "cfg_accent", type: "select", label: "Accent colour", options: ["Nox blue", "Cyan", "White"], value: 0 },
        { id: "cfg_save", type: "toggle", label: "Autosave config", value: true },
        { id: "cfg_watermark", type: "toggle", label: "Watermark", value: true },
        { id: "cfg_opacity", type: "slider", label: "Menu opacity", value: 92, format: pct }
      ]
    };

    var state = JSON.parse(JSON.stringify(DEFAULTS));
    var TAB_NAMES = Object.keys(DEFAULTS);
    var active = TAB_NAMES[0];

    // JSON.parse drops the format functions, so re-attach them from DEFAULTS
    function formatterFor(tab, id) {
      var row = DEFAULTS[tab].filter(function (r) { return r.id === id; })[0];
      return (row && row.format) || function (v) { return v; };
    }

    function buildTabs() {
      tabsEl.innerHTML = "";
      TAB_NAMES.forEach(function (name) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = name;
        b.setAttribute("role", "tab");
        b.setAttribute("aria-selected", name === active ? "true" : "false");
        if (name === active) b.classList.add("on");
        b.addEventListener("click", function () {
          active = name;
          buildTabs();
          buildPanel();
        });
        tabsEl.appendChild(b);
      });
    }

    function buildPanel() {
      panelEl.innerHTML = "";
      state[active].forEach(function (row) {
        var wrap = document.createElement("div");
        wrap.className = "menu-row";

        var label = document.createElement("label");
        label.textContent = row.label;
        wrap.appendChild(label);

        if (row.type === "toggle") {
          var t = document.createElement("button");
          t.type = "button";
          t.className = "toggle" + (row.value ? " on" : "");
          t.setAttribute("role", "switch");
          t.setAttribute("aria-checked", String(!!row.value));
          t.setAttribute("aria-label", row.label);
          t.addEventListener("click", function () {
            row.value = !row.value;
            t.classList.toggle("on", row.value);
            t.setAttribute("aria-checked", String(row.value));
            pulse();
          });
          wrap.appendChild(t);
        }

        if (row.type === "slider") {
          var fmt = formatterFor(active, row.id);
          var s = document.createElement("input");
          s.type = "range";
          s.min = 0; s.max = 100; s.value = row.value;
          s.className = "menu-range";
          s.setAttribute("aria-label", row.label);
          s.style.setProperty("--fill", row.value + "%");

          var val = document.createElement("span");
          val.className = "menu-val";
          val.textContent = fmt(row.value);

          s.addEventListener("input", function () {
            row.value = Number(s.value);
            s.style.setProperty("--fill", row.value + "%");
            val.textContent = fmt(row.value);
          });
          s.addEventListener("change", pulse);

          wrap.appendChild(s);
          wrap.appendChild(val);
        }

        if (row.type === "select") {
          var sel = document.createElement("button");
          sel.type = "button";
          sel.className = "menu-select";
          sel.setAttribute("aria-label", row.label);
          sel.innerHTML = '<span></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
          var txt = sel.querySelector("span");
          txt.textContent = row.options[row.value];
          sel.addEventListener("click", function () {
            row.value = (row.value + 1) % row.options.length;
            txt.textContent = row.options[row.value];
            sel.classList.remove("bump");
            void sel.offsetWidth;
            sel.classList.add("bump");
            pulse();
          });
          wrap.appendChild(sel);
        }

        panelEl.appendChild(wrap);
      });
    }

    /* small "config saved" blink on the status line whenever something changes */
    var statusEl = document.getElementById("noxStatus");
    var pulseTimer;
    function pulse() {
      if (!statusEl) return;
      statusEl.classList.add("saved");
      clearTimeout(pulseTimer);
      pulseTimer = setTimeout(function () { statusEl.classList.remove("saved"); }, 900);
    }

    var resetBtn = document.getElementById("noxReset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state = JSON.parse(JSON.stringify(DEFAULTS));
        buildPanel();
        pulse();
      });
    }

    buildTabs();
    buildPanel();
  }

  /* ============================================================
     HARDWARE DETECTION — reads real browser hardware hints and
     fills the "Your system" readout when it scrolls into view.
     ============================================================ */
  (function () {
    /* Windows 11 reports as "Windows NT 10.0" in the UA string, so the only
       reliable way to tell 10 from 11 is the platformVersion client hint.
       That call is async, so we resolve it up front and cache the answer. */
    var winVersion = null;
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      navigator.userAgentData.getHighEntropyValues(["platformVersion"]).then(function (d) {
        var major = parseInt((d.platformVersion || "0").split(".")[0], 10);
        if (!isNaN(major) && major > 0) winVersion = major >= 13 ? "11" : "10";
      }).catch(function () {});
    }

    function detectOS() {
      var ua = navigator.userAgent;
      if (/Windows NT 10/.test(ua)) {
        return { value: winVersion ? "Windows " + winVersion : "Windows 10 / 11", ok: true };
      }
      if (/Windows/.test(ua)) return { value: "Windows (legacy)", ok: true };
      if (/Mac OS X/.test(ua)) return { value: "macOS · unsupported", ok: false };
      if (/Linux|X11/.test(ua)) return { value: "Linux · unsupported", ok: false };
      if (/Android|iPhone|iPad/.test(ua)) return { value: "Mobile · desktop only", ok: false };
      return { value: "Unknown", ok: false };
    }
    function detectCPU() {
      var cores = navigator.hardwareConcurrency || 0;
      if (!cores) return { value: "Multi-core", ok: true };
      return { value: cores + " cores", ok: cores >= 2 };
    }
    function detectRAM() {
      var gb = navigator.deviceMemory;
      if (!gb) return { value: "8 GB+", ok: true };
      return { value: (gb >= 8 ? gb + " GB+" : gb + " GB"), ok: gb >= 4 };
    }
    function detectGPU() {
      try {
        var c = document.createElement("canvas");
        var gl = c.getContext("webgl") || c.getContext("experimental-webgl");
        if (!gl) return { value: "No WebGL — integrated", ok: true };
        var dbg = gl.getExtension("WEBGL_debug_renderer_info");
        var r = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "") || "";

        // Chrome wraps the real GPU in an ANGLE(...) string — pull the renderer out of it
        var m = r.match(/^ANGLE\s*\(([^)]*)\)/i);
        if (m) {
          var parts = m[1].split(",");
          r = (parts[1] || parts[0] || "").trim(); // second field is the renderer
        }
        // tidy up the leftover driver noise
        r = r
          .replace(/\(0x[0-9a-f]+\)/ig, "")
          .replace(/Direct3D.*$/i, "")
          .replace(/vs_\d.*$/i, "")
          .replace(/\s{2,}/g, " ")
          .trim();

        // drop the vendor prefix so "AMD Radeon RX 6700 XT" fits without clipping
        r = r.replace(/^(NVIDIA|AMD|Intel|ATI)\s+/i, "");
        if (!r || /^ANGLE$/i.test(r)) r = "Graphics adapter";
        if (r.length > 22) r = r.slice(0, 22).trim() + "…";
        return { value: r, ok: true };
      } catch (e) {
        return { value: "Graphics adapter", ok: true };
      }
    }
    function detectDisplay() {
      var dpr = window.devicePixelRatio || 1;
      var w = Math.round(screen.width * dpr);
      var h = Math.round(screen.height * dpr);
      return { value: w + " × " + h, ok: true };
    }
    function detectDriver() {
      // flavour row — always available, uses a short random handshake id
      var id = Math.random().toString(16).slice(2, 8).toUpperCase();
      return { value: "Slot open · 0x" + id, ok: true };
    }

    var CHECKS = {
      os: detectOS, cpu: detectCPU, ram: detectRAM,
      gpu: detectGPU, display: detectDisplay, driver: detectDriver
    };

    /* ---- helper: run a callback the first time an element is scrolled into view ---- */
    function onFirstView(el, cb, threshold) {
      if (!el) return;
      if (!("IntersectionObserver" in window)) { cb(); return; }
      var seen = false;
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !seen) {
            seen = true;
            obs.disconnect();
            cb();
          }
        });
      }, { threshold: threshold || 0.35 });
      obs.observe(el);
    }

    /* ============================================================
       MINI READOUT — the "Built for your rig" card in Undetectability.
       Fills itself in as soon as the card scrolls into view.
       ============================================================ */
    var mini = document.getElementById("miniCompat");
    if (mini) {
      var miniRows = Array.prototype.slice.call(mini.querySelectorAll("[data-mini]"));
      var miniStatus = document.getElementById("miniStatus");
      var sysBar = document.getElementById("sysBar");

      onFirstView(mini, function () {
        miniStatus.textContent = "SCANNING";
        miniStatus.classList.remove("done", "warn", "bad");
        var i = 0;
        var fails = 0;      // any check that came back not-ok
        var osOk = true;    // OS is a hard blocker — no Windows, no product
        (function next() {
          if (i >= miniRows.length) {
            if (!osOk) {
              miniStatus.textContent = "NOT COMPATIBLE";
              miniStatus.classList.add("bad");
            } else if (fails) {
              miniStatus.textContent = "PARTIAL";
              miniStatus.classList.add("warn");
            } else {
              miniStatus.textContent = "COMPATIBLE";
              miniStatus.classList.add("done");
            }
            return;
          }
          var row = miniRows[i];
          var val = row.querySelector(".sys-val");
          row.classList.add("scanning");
          val.textContent = "scanning…";

          setTimeout(function () {
            var key = row.getAttribute("data-mini");
            var res = CHECKS[key]();
            row.classList.remove("scanning");
            row.classList.add(res.ok ? "done" : "bad");
            val.textContent = res.value;
            if (!res.ok) { fails++; if (key === "os") osOk = false; }
            i++;
            if (sysBar) sysBar.style.width = Math.round((i / miniRows.length) * 100) + "%";
            next();
          }, 700);
        })();
      }, 0.4);
    }

  })();

  /* ============================================================
     AIM SMOOTHING CURVE — the path bends as you drag the slider:
     low smoothing snaps straight to target, high smoothing eases in.
     ============================================================ */
  (function () {
    var range = document.querySelector(".u-media .nox-range");
    if (!range) return;

    var out = document.getElementById("smoothVal");
    var chip = document.getElementById("smoothChip");
    var path = document.getElementById("curvePath");
    var area = document.getElementById("curveArea");
    var dot = document.getElementById("curveDot");
    var modes = document.querySelectorAll(".u-media .modes span");

    var W = 240, H = 90;

    function pointAt(t, s) {
      // s = 0 → instant snap (sharp elbow), s = 1 → long smooth ease
      var ease = Math.pow(t, 1 + s * 3);       // slower start as smoothing rises
      var x = t * W;
      var y = H - 8 - ease * (H - 22);
      return [x, y];
    }

    function render() {
      var v = Number(range.value);
      var s = v / 100;

      var d = "", pts = [];
      for (var i = 0; i <= 40; i++) {
        var p = pointAt(i / 40, s);
        pts.push(p);
        d += (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1);
      }
      path.setAttribute("d", d);
      area.setAttribute("d", d + "L" + W + " " + H + "L0 " + H + "Z");

      var mid = pts[Math.round(pts.length * 0.62)];
      dot.setAttribute("cx", mid[0]);
      dot.setAttribute("cy", mid[1]);

      range.style.setProperty("--fill", v + "%");
      if (out) out.textContent = v;

      var mode = v < 34 ? "rage" : v < 70 ? "balanced" : "legit";
      // low smoothing = snappy = rage; high smoothing = human = legit
      if (chip) chip.textContent = mode.toUpperCase();
      modes.forEach(function (m) {
        m.classList.toggle("on", m.getAttribute("data-mode") === mode);
      });
    }

    range.addEventListener("input", render);
    render();
  })();

  /* ---------------- comparison slider ---------------- */
  var compare = document.querySelector(".compare");
  if (compare) {
    var dragging = false;
    function setCut(clientX) {
      var r = compare.getBoundingClientRect();
      var p = ((clientX - r.left) / r.width) * 100;
      p = Math.max(4, Math.min(96, p));
      compare.style.setProperty("--cut", p + "%");
    }
    compare.addEventListener("pointerdown", function (e) {
      dragging = true; setCut(e.clientX); compare.setPointerCapture(e.pointerId);
    });
    compare.addEventListener("pointermove", function (e) { if (dragging) setCut(e.clientX); });
    window.addEventListener("pointerup", function () { dragging = false; });
  }


  /* ---------------- cart drawer ---------------- */
  document.querySelectorAll("[data-cart-open]").forEach(function (t) {
    t.addEventListener("click", function () { document.body.classList.add("cart-open"); });
  });
  document.querySelectorAll("[data-cart-close]").forEach(function (t) {
    t.addEventListener("click", function () { document.body.classList.remove("cart-open"); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") document.body.classList.remove("cart-open");
  });

  /* ============================================================
     STORE — data-driven product cards with duration pricing,
     per-product status, and OS / anti-cheat meta.
     ============================================================ */
  var gameGrid = document.getElementById("gameGrid");
  if (gameGrid && window.NOX) {
    var STATUS = {
      undetected: { label: "Undetected", cls: "" },
      updating:   { label: "Updating", cls: "updating" },
      soon:       { label: "Coming soon", cls: "soon" },
      down:       { label: "Down", cls: "down" }
    };

    var TAGLINE = {
      r6: "Full · Private · Lite",
      fortnite: "Full · External builds",
      apex: "Aimbot · ESP suites",
      tarkov: "Loot · Radar · Aim",
      rust: "Silent aim · ESP",
      spoofer: "Temporary · Permanent",
      accounts: "Linked · Stacked"
    };

    function monogram(name) {
      var w = name.replace(/[^A-Za-z ]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      return (w.length >= 2 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
    }

    // Build one collection card per real game, largest first.
    var COLLECTIONS = Object.keys(window.NOX.games).map(function (slug) {
      var list = window.NOX.byGame(slug);
      var anyLive = list.some(function (p) { return p.status === "undetected"; });
      return {
        cat: slug,
        name: window.NOX.games[slug].title,
        cover: window.NOX.games[slug].cover,
        tagline: TAGLINE[slug] || "Undetected builds",
        status: anyLive ? "undetected" : "soon",
        count: list.length
      };
    }).filter(function (c) { return c.count > 0; })
      .sort(function (a, b) { return b.count - a.count; });

    function cardHTML(p, i) {
      var st = STATUS[p.status] || STATUS.undetected;
      var delay = ["", "d1", "d2"][i % 3];
      var popular = i === 0;
      return '' +
        '<article class="game-card collection reveal ' + delay + (popular ? " featured" : "") + '" data-cat="' + p.cat + '" data-name="' + p.name.toLowerCase() + '">' +
          '<a class="game-cover ' + p.cover + '" href="collection.html?game=' + p.cat + '">' +
            '<span class="cover-mono">' + monogram(p.name) + '</span>' +
            (popular ? '<span class="popular-flag">★ Most popular</span>' : '') +
            '<span class="status-badge ' + st.cls + '"><i></i>' + st.label + '</span>' +
            '<div>' +
              '<div class="cover-title">' + p.name + '</div>' +
              '<div class="cover-count">' + p.count + ' ' + (p.count === 1 ? 'product' : 'products') + '</div>' +
            '</div>' +
            '<span class="cover-shine"></span>' +
          '</a>' +
          '<div class="coll-foot">' +
            '<span class="browse-label">' + p.tagline + '</span>' +
            '<a class="game-btn" href="collection.html?game=' + p.cat + '">View <span>→</span></a>' +
          '</div>' +
        '</article>';
    }

    gameGrid.innerHTML = COLLECTIONS.map(cardHTML).join("");

    // reveal the freshly-rendered cards
    if ("IntersectionObserver" in window) {
      var rio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); rio.unobserve(e.target); } });
      }, { threshold: 0.1 });
      gameGrid.querySelectorAll(".reveal").forEach(function (el) { rio.observe(el); });
    } else {
      gameGrid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
    }

    // hover spotlight for the new cards
    gameGrid.querySelectorAll(".game-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
      });
    });

    /* ---- filters + search ---- */
    var chips = document.querySelectorAll(".filter-chip");
    var countEl = document.querySelector("#storeCount");
    var searchEl = document.querySelector("#storeSearch");
    var emptyEl = document.querySelector("#storeEmpty");
    var activeFilter = "all";
    var query = "";
    var allCards = gameGrid.querySelectorAll(".game-card");
    if (countEl) countEl.textContent = allCards.length;

    function apply() {
      var shown = 0;
      allCards.forEach(function (card) {
        var cats = (card.getAttribute("data-cat") || "").split(" ");
        var name = card.getAttribute("data-name") || "";
        var catMatch = activeFilter === "all" || cats.indexOf(activeFilter) !== -1;
        var qMatch = !query || name.indexOf(query) !== -1;
        var match = catMatch && qMatch;
        card.classList.toggle("hidden", !match);
        if (match) shown++;
      });
      if (countEl) countEl.textContent = shown;
      if (emptyEl) emptyEl.classList.toggle("show", shown === 0);
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        chips.forEach(function (c) { c.classList.remove("on"); });
        chip.classList.add("on");
        activeFilter = chip.getAttribute("data-filter");
        apply();
      });
    });
    if (searchEl) {
      searchEl.addEventListener("input", function () {
        query = searchEl.value.trim().toLowerCase();
        apply();
      });
    }
  }

  /* ============================================================
     HOME — "the lineup" popular grid, built from the real catalog
     so counts and statuses always match the store.
     ============================================================ */
  var popGrid = document.getElementById("popGrid");
  if (popGrid && window.NOX) {
    var POP_STATUS = {
      undetected: { label: "Undetected", cls: "" },
      updating:   { label: "Updating", cls: "updating" },
      soon:       { label: "Coming soon", cls: "soon" },
      down:       { label: "Down", cls: "down" }
    };
    function popMono(name) {
      var w = name.replace(/[^A-Za-z ]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
      return (w.length >= 2 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase();
    }
    var pop = Object.keys(window.NOX.games).map(function (slug) {
      var list = window.NOX.byGame(slug);
      var anyLive = list.some(function (p) { return p.status === "undetected"; });
      return {
        slug: slug,
        title: window.NOX.games[slug].title,
        cover: window.NOX.games[slug].cover,
        status: anyLive ? "undetected" : "soon",
        count: list.length
      };
    }).filter(function (c) { return c.count > 0; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);

    popGrid.innerHTML = pop.map(function (c, i) {
      var st = POP_STATUS[c.status] || POP_STATUS.undetected;
      var delay = ["", "d1", "d2"][i % 3];
      return '<a class="pop-card reveal ' + delay + (i === 0 ? " featured" : "") + ' ' + c.cover + '" href="collection.html?game=' + c.slug + '">' +
        (i === 0 ? '<span class="pop-flag">★ Most popular</span>' : '') +
        '<span class="status-badge ' + st.cls + '"><i></i>' + st.label + '</span>' +
        '<span class="cover-mono">' + popMono(c.title) + '</span>' +
        '<span class="cover-shine"></span>' +
        '<div class="pop-info"><h3>' + c.title + '</h3><span>' + c.count + ' ' + (c.count === 1 ? 'product' : 'products') + '</span></div>' +
      '</a>';
    }).join("");

    if ("IntersectionObserver" in window) {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visible"); pio.unobserve(e.target); } });
      }, { threshold: 0.1 });
      popGrid.querySelectorAll(".reveal").forEach(function (el) { pio.observe(el); });
    } else {
      popGrid.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
    }
  }

  /* ============================================================
     HOVER SPOTLIGHT — a soft glow follows the cursor across cards
     ============================================================ */
  var glowCards = document.querySelectorAll(".game-card, .review-card, .u-card, .faq-item");
  glowCards.forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      card.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    });
    card.addEventListener("pointerleave", function () {
      card.style.setProperty("--mx", "50%");
      card.style.setProperty("--my", "50%");
    });
  });

  /* ============================================================
     STAT COUNT-UP — numbers tick from zero when scrolled into view
     ============================================================ */
  var statsBand = document.getElementById("statsBand");
  if (statsBand) {
    var counters = statsBand.querySelectorAll(".count");

    function runCounters() {
      counters.forEach(function (el, i) {
        var to = parseFloat(el.getAttribute("data-to"));
        var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
        var prefix = el.getAttribute("data-prefix") || "";
        var suffix = el.getAttribute("data-suffix") || "";
        var dur = 1400;

        // stagger each stat by 0.5s, left to right
        setTimeout(function () {
          var start = Date.now();
          function frame() {
            var p = Math.min((Date.now() - start) / dur, 1);
            // easeOutCubic
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + (to * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(frame);
            else el.textContent = prefix + to.toFixed(decimals) + suffix;
          }
          frame();
        }, i * 500);
      });
    }

    if ("IntersectionObserver" in window) {
      var counted = false;
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !counted) {
            counted = true;
            cio.disconnect();
            runCounters();
          }
        });
      }, { threshold: 0.4 });
      cio.observe(statsBand);
    } else {
      runCounters();
    }
  }

  /* ============================================================
     HOME REVIEWS — replace the placeholder cards with real reviews
     from the backend when available (keeps static ones as fallback).
     ============================================================ */
  var homeReviews = document.querySelector("[data-home-reviews]");
  if (homeReviews) {
    fetch("/api/reviews?limit=6").then(function (r) { return r.json(); }).then(function (data) {
      var reviews = (data && data.reviews) || [];
      if (!reviews.length) return; // keep the static fallback cards
      function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }
      homeReviews.innerHTML = reviews.slice(0, 3).map(function (rv, i) {
        var stars = "★★★★★".slice(0, Math.round(rv.rating)) + "☆☆☆☆☆".slice(0, 5 - Math.round(rv.rating));
        return '<article class="review-card reveal ' + ["", "d1", "d2"][i % 3] + '">' +
          '<div class="review-head"><span class="review-stars">' + stars + '</span><span class="review-game">' + esc(rv.product_name || "") + "</span></div>" +
          "<p>" + esc(rv.review_text) + "</p>" +
          '<span class="review-user"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>' +
          esc(rv.username) + " · Verified customer</span></article>";
      }).join("");
      homeReviews.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("visible"); });
    }).catch(function () {});
  }

  /* ---------------- footer year ---------------- */
  var yr = document.querySelector("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
