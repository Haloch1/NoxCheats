/* NOX CHEATS - setup guides.
   Real per-product guides ported from the Nox/Halo instructions source.
   Only products that exist in the Nox catalog are included, and every
   loader / tool download link is carried over inline in the steps.
   Sidebar: category -> product -> topic, with search and a Next control. */
(function () {
  "use strict";
  var nav = document.querySelector("[data-docs-nav]");
  var main = document.querySelector("[data-docs-main]");
  if (!nav || !main) return;

  var DISCORD = "https://discord.gg/qHnjHFWwBv";
  var DEFENDER_CONTROL = "https://2478166878-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FGuCxiU24GFjlOIduR6gg%2Fuploads%2FIFob8lhaivTRY2dC3dRF%2FDefender%20Control.zip?alt=media&token=8c8bfbd0-eea6-46ca-b334-24470282cc7c";
  var VISUAL_RUNTIMES = "https://2478166878-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FGuCxiU24GFjlOIduR6gg%2Fuploads%2FlwM21Nit9EiHnnLrcNRo%2FVisual-C-Runtimes-All-in-One-Feb-2024.zip?alt=media&token=7d608170-836d-4dbc-8968-e3405bd55b9e";

  /* ── Instruction data (Nox catalog only) ── */
  var categories = [
    {
      name: "Rainbow Six Siege",
      products: [
        {
          name: "Crusader R6",
          slug: "crusader-r6",
          topics: [
            {
              title: "Introduction",
              content: `
                <p>Crusader R6 is a balanced Rainbow Six Siege setup built for fast reads, aim tuning, and cleaner match awareness. Thank you for purchasing from Nox Cheats.</p>
                <div class="info-box">Make sure you have your license key ready before starting the setup process.</div>
              `
            },
            {
              title: "Disabling Windows Defender",
              content: `
                <p><strong>Disable Windows Defender with dControl</strong></p>
                <p><a href="${DEFENDER_CONTROL}" target="_blank" rel="noopener">Defender Control download (448KB)</a></p>
                <ol>
                  <li>Download dControl from the link above.</li>
                  <li>Unzip the downloaded files.</li>
                  <li>Open dControl.exe.</li>
                  <li>Turn Off Windows Defender.</li>
                </ol>
              `
            },
            {
              title: "Download & Install Visual Runtimes",
              content: `
                <p><a href="${VISUAL_RUNTIMES}" target="_blank" rel="noopener">Visual-C-Runtimes-All-in-One-Feb-2024.zip</a></p>
                <ol>
                  <li>Download the <strong>Visual C Runtimes All in One</strong> above.</li>
                  <li>Use an extract tool such as <strong>WinRAR</strong> or <strong>7-Zip</strong> to extract it to a folder.</li>
                  <li>Right click on it and press Extract to <strong>visual-c-runtimes all-in-one feb-2024</strong>.</li>
                  <li>Once extracted, open the yellow folder.</li>
                  <li>Run <strong>install_all</strong> as administrator then press yes to all the UAC pop-ups. It may take a few minutes depending on your internet speed.</li>
                </ol>
              `
            },
            {
              title: "Downloading DirectX",
              content: `
                <p>Step-by-step instructions on how to download and install DirectX.</p>
                <ol>
                  <li>Install the following program from gofile - <a href="https://gofile.io/d/cPOeD0" target="_blank" rel="noopener">https://gofile.io/d/cPOeD0</a></li>
                  <li>Download <strong>dxwebsetup.exe</strong> from gofile.</li>
                  <li>Run dxwebsetup.exe.</li>
                  <li>Uncheck the "<strong>Install Bing Bar</strong>" checkbox to ensure no errors occur.</li>
                  <li>Once complete we can advance onto the next stage.</li>
                </ol>
              `
            },
            {
              title: "How to inject the cheat into R6",
              content: `
                <ol>
                  <li>Download the loader using this link. The password for the archive is <strong>123</strong>.<br><a href="https://uniqueloader.com/r6s/" target="_blank" rel="noopener">https://uniqueloader.com/r6s/</a></li>
                  <li>Extract the files from the archive and place them in a separate folder. The folder name should be written in English letters; it is recommended to place this folder in the root of the C drive.</li>
                  <li>Run the cheat loader as administrator.</li>
                  <li>Insert your key into the "Serial Key" field and click "Sign In".</li>
                  <li>After a short loading, you will see the R6S icon.</li>
                  <li>Click the "Start Injection Process" button.</li>
                  <li>The message "Please Open Rainbow Six Siege" will appear, it's time to launch the game. Be sure to run the <strong>DirectX 12</strong> version of the game!</li>
                  <li>When the game starts, press the "Insert" key while in the main menu.</li>
                  <li>The cheat menu will appear in front of you. The key to close/open the menu is Insert.</li>
                </ol>
              `
            },
            {
              title: "How to open and close the menu",
              content: `
                <ol>
                  <li>To open / close the menu press the <strong>Insert</strong> key.</li>
                  <li>Click on the different tabs on the menu to enable / disable features to your preference.</li>
                </ol>
              `
            },
            {
              title: "Common Errors",
              content: `
                <h3>Loader fails to start</h3>
                <p>Make sure Windows Defender and any antivirus are disabled. Run as Administrator.</p>
                <h3>Key not recognized</h3>
                <p>Double-check you are copying the full key with no extra spaces. If the issue persists, open a support ticket.</p>
                <h3>Injection timeout</h3>
                <p>Close the game and loader, restart both, and try again. Make sure no overlays (Discord, GeForce) are running.</p>
                <h3>Game crash after injection</h3>
                <p>Verify your Windows version matches the requirements (Windows 10 / 11). Update if needed.</p>
                <div class="info-box">If none of these fix your issue, open a ticket on the Desk or in Discord.</div>
              `
            }
          ]
        },
        {
          name: "Vega R6 External",
          slug: "vega-r6-external",
          topics: [
            {
              title: "Preparation",
              content: `
                <p>Before setting up Vega R6 External, verify your system meets these requirements.</p>
                <h3>System Requirements</h3>
                <ul>
                  <li>Windows 10 or Windows 11 (21H2 - 25H2)</li>
                  <li>UEFI-based motherboard</li>
                  <li>Administrator access</li>
                </ul>
                <h3>Pre-Setup Checklist</h3>
                <ol>
                  <li>Disable Windows Defender real-time protection</li>
                  <li>Close all unnecessary overlays and capture apps</li>
                  <li>Make sure your BIOS is set to UEFI mode (not Legacy/CSM)</li>
                  <li>Have your license key ready</li>
                </ol>
              `
            },
            {
              title: "First Time Setup",
              content: `
                <p>Follow these steps for your initial Vega setup.</p>
                <ol>
                  <li>Download the Vega loader from your purchase confirmation</li>
                  <li>Extract to a folder on your desktop</li>
                  <li>Run the loader as <strong>Administrator</strong></li>
                  <li>Enter your license key</li>
                  <li>Launch Rainbow Six Siege</li>
                  <li>The external overlay will attach automatically once the game is running</li>
                </ol>
                <div class="info-box">Vega is an external cheat. It runs in a separate window overlay, not injected into the game process.</div>
              `
            },
            {
              title: "Streamproof Configuration",
              content: `
                <p>Vega supports streamproof modes for GeForce Experience, OBS, Medal, and other capture software.</p>
                <h3>Setup</h3>
                <ol>
                  <li>Open the Vega menu</li>
                  <li>Go to <strong>Misc</strong> settings</li>
                  <li>Enable <strong>Streamproof</strong></li>
                  <li>Select your capture software from the dropdown</li>
                </ol>
                <div class="warn-box">Recording and capture behavior depends on your GPU and capture app. Test in a private match before streaming.</div>
              `
            },
            {
              title: "Common Errors",
              content: `
                <h3>Overlay not appearing</h3>
                <p>Make sure Rainbow Six Siege is running in <strong>Borderless</strong> or <strong>Windowed</strong> mode. Exclusive fullscreen can block overlays.</p>
                <h3>HWID mismatch</h3>
                <p>Your key is tied to your hardware. If you changed hardware, open a support ticket for a reset.</p>
                <h3>FPS drop</h3>
                <p>Reduce ESP draw distance or disable radar features. Lock your FPS in the Misc settings.</p>
                <div class="info-box">For persistent issues, open a ticket with your Windows version and GPU info.</div>
              `
            }
          ]
        },
        {
          name: "R6 Frost",
          slug: "r6-frost",
          topics: [
            {
              title: "Prelaunch",
              content: `
                <p>Before launching Frost, confirm your system compatibility.</p>
                <h3>Supported Windows Versions</h3>
                <ul>
                  <li>Windows 10: 20H2 to 22H2</li>
                  <li>Windows 11: 21H2 to 25H2</li>
                </ul>
                <h3>Checklist</h3>
                <ol>
                  <li>Verify your Windows version by running <code>winver</code></li>
                  <li>Disable Windows Defender real-time protection</li>
                  <li>Close Discord overlay and any game overlays</li>
                  <li>Make sure the game is fully closed before starting</li>
                </ol>
              `
            },
            {
              title: "Loader",
              content: `
                <p>Follow these steps to use the Frost loader.</p>
                <ol>
                  <li>Run the Frost loader as <strong>Administrator</strong></li>
                  <li>Enter your license key when prompted</li>
                  <li>Wait for the loader to authenticate</li>
                  <li>Launch Rainbow Six Siege</li>
                  <li>Once in the main menu, click <strong>Load</strong> in the Frost loader</li>
                  <li>You should see a success message</li>
                </ol>
                <p>The default menu key is <code>INSERT</code>. Start with default visual settings before customizing.</p>
                <div class="info-box">Frost is built around clean information display. Start with basic ESP and aim smoothing before enabling extra features.</div>
              `
            },
            {
              title: "Errors",
              content: `
                <h3>Failed to load driver</h3>
                <p>Your Windows version may be unsupported. Run <code>winver</code> and check against the supported list.</p>
                <h3>Black screen after loading</h3>
                <p>Alt-tab out and back in. If it persists, restart the game and loader.</p>
                <h3>Menu not appearing</h3>
                <p>Press <code>INSERT</code>. If nothing happens, check that the loader confirmed successful injection.</p>
                <div class="info-box">Open a ticket if your issue is not listed here. Include your Windows build number.</div>
              `
            }
          ]
        },
        {
          name: "R6 Recoil Private",
          slug: "r6-recoil-private",
          topics: [
            {
              title: "Recoil Private introduction",
              content: `
                <p>R6 Recoil Private Instructions Manual. Thank you for purchasing from Nox Cheats.</p>
              `
            },
            {
              title: "Installation process",
              content: `
                <ol>
                  <li>Download this <a href="https://gofile.io/d/qjLwcL" target="_blank" rel="noopener">loader</a> first.</li>
                  <li>Extract the loader, by right clicking then pressing extract all.</li>
                  <li>Open the loader, then input your key from your panel on the website or the email we sent you.</li>
                  <li>Once done, go into shooting range inside R6 then pick your op, and find the perfect config for your game sensitivity. You cant get a config from other people, it most likely wont work.</li>
                </ol>
              `
            },
            {
              title: "Incorrect HWID",
              content: `
                <p>Open a ticket in Discord, and request a HWID ID reset.</p>
              `
            },
            {
              title: "Prompts to download Net 8.0",
              content: `
                <p>Press download Net 8.0 then go along with the installation process.</p>
              `
            }
          ]
        },
        {
          name: "Invision Chams",
          slug: "invision-chams",
          topics: [
            {
              title: "Requirements",
              content: `
                <h3>Preparing the system</h3>
                <p>Before running Invision Chams, remove or disable the following:</p>
                <ul>
                  <li>Vanguard (Riot anti-cheat)</li>
                  <li>Faceit anti-cheat</li>
                  <li>Kaspersky Anti-Virus</li>
                </ul>
                <h3>Software install</h3>
                <ol>
                  <li>Install the latest <a href="https://www.nvidia.com/en-us/geforce/drivers/" target="_blank" rel="noopener">Nvidia Driver</a>.</li>
                  <li>Plug in a USB flash drive and move the loader folder from the archive onto that drive.</li>
                </ol>
                <div class="info-box">No physical flash drive? You can make a virtual one with <a href="https://www.softportal.com/software-22066-osfmount.html" target="_blank" rel="noopener">OsfMount</a>.</div>
              `
            },
            {
              title: "Injecting",
              content: `
                <h3>Loading the cheat</h3>
                <ol>
                  <li>Unzip all files into a single folder on your flash drive, run <a href="https://disk.yandex.ru/d/YceRFJwPbeyk8g" target="_blank" rel="noopener">Loader.exe</a>, and enter your product key.</li>
                  <li>Select the game and press <strong>Start</strong>.</li>
                  <li>Follow the loader prompts and launch the game, but do not press <code>F5</code> yet.</li>
                </ol>
                <h3>OBS setup</h3>
                <ol>
                  <li>Download <a href="https://github.com/obsproject/obs-studio/releases/download/24.0.3/OBS-Studio-24.0.3-Full-Installer-x64.exe" target="_blank" rel="noopener">this exact OBS version</a> (required).</li>
                  <li>Do not update OBS if it asks.</li>
                  <li>Run OBS as administrator and add <strong>Game Capture &rarr; Create New &rarr; Capture Specific Window &rarr; RainbowSix.exe</strong>.</li>
                  <li>Wait until the game image appears in the OBS preview.</li>
                </ol>
                <h3>Activating in-game</h3>
                <ol>
                  <li>Make sure you are in the game's main menu (not settings or any sub-page), press <code>F5</code> in the loader, and follow its prompts.</li>
                  <li>The loader will confirm a successful load and close itself.</li>
                  <li>Go to <strong>Operators &rarr; Attackers</strong>. Hover over <strong>Striker</strong> (do not click). When his model appears on the right, press <code>F1</code> once.</li>
                  <li>Go to <strong>Defenders</strong>. Hover over <strong>Bandit</strong> (do not click). When his model appears, press <code>F1</code> once.</li>
                </ol>
              `
            },
            {
              title: "Errors",
              content: `
                <h3>Loader returns an error on start</h3>
                <p>If the loader errors out after you select a game and press Start, open a ticket with support on Discord.</p>
                <h3>"Change game window mode and Press F5"</h3>
                <ol>
                  <li>Open the game settings.</li>
                  <li>Switch the window mode (for example Windowed to Maximized, or the reverse).</li>
                  <li>Apply the change.</li>
                  <li>Return to the game's main menu.</li>
                  <li>Press <code>F5</code> in the loader again.</li>
                </ol>
                <div class="info-box">Still stuck? Open a ticket in <a href="${DISCORD}" target="_blank" rel="noopener">Discord</a> with a screenshot of the loader and the step you are on.</div>
              `
            }
          ]
        }
      ]
    },
    {
      name: "Fortnite",
      products: [
        {
          name: "Fortnite Full",
          slug: "fortnite-full",
          topics: [
            {
              title: "Setup Guide",
              content: `
                <p>Fortnite Full includes aim tuning, visual awareness, and loot information.</p>
                <h3>Requirements</h3>
                <ul>
                  <li>Windows 10 or 11</li>
                  <li>Administrator access</li>
                  <li>Stable internet connection</li>
                </ul>
                <h3>Setup Steps</h3>
                <ol>
                  <li>Disable Windows Defender real-time protection</li>
                  <li>Close Fortnite if it is running</li>
                  <li>Run the loader as <strong>Administrator</strong></li>
                  <li>Enter your license key</li>
                  <li>Launch Fortnite</li>
                  <li>Once in the lobby, press the inject button</li>
                  <li>Toggle menu with <code>INSERT</code></li>
                </ol>
                <div class="info-box">Confirm whether you are using fullscreen, windowed, or borderless mode. Some features behave differently depending on display mode.</div>
                <p>Start with basic aim and visual settings before adjusting loot options.</p>
              `
            },
            {
              title: "Common Errors",
              content: `
                <h3>Anti-cheat error</h3>
                <p>Make sure the loader is started <strong>before</strong> launching Fortnite. Restart both if needed.</p>
                <h3>Menu not visible</h3>
                <p>Try switching between fullscreen and borderless mode. Press <code>INSERT</code> to toggle.</p>
                <div class="info-box">Use a support ticket if you need help with display mode behavior.</div>
              `
            }
          ]
        }
      ]
    },
    {
      name: "Accounts",
      products: [
        {
          name: "Linked NFA",
          slug: "linked-nfa",
          topics: [
            {
              title: "Setup Guide",
              content: `
                <p>Follow these steps in order to connect your NFA account and launch Rainbow Six Siege through Ubisoft Connect.</p>
                <h3>Connecting the account</h3>
                <ol>
                  <li><strong>Log in to the Xbox app</strong> - open the Xbox app on your PC and sign in with the NFA account credentials we provided.</li>
                  <li><strong>Open your Library</strong> - click Library in the left sidebar.</li>
                  <li><strong>Select the game</strong> - find and click Tom Clancy's Rainbow Six Siege.</li>
                  <li><strong>Manage Extensions</strong> - on the game page, choose Manage Extensions.</li>
                  <li><strong>Enable Ubisoft Connect</strong> - turn on the second toggle, "Connect to Ubisoft Connect PC".</li>
                  <li><strong>Wait for the connection</strong> - give the app a moment to finish linking. Do not close it during this step.</li>
                  <li><strong>Open Ubisoft Connect</strong> - launch it on your PC; the NFA account should already be signed in.</li>
                  <li><strong>Go to the Store</strong> - click the Store tab inside Ubisoft Connect.</li>
                  <li><strong>Search for Rainbow Six Siege</strong> - in the Store search bar.</li>
                  <li><strong>Install &amp; Play</strong> - select the free version and click Play Now to download and launch.</li>
                </ol>
                <div class="warn-box">Some accounts do not show the Store tab. If that happens, open a support ticket and we will help.</div>
                <h3>Common Errors</h3>
                <p><strong>No Store button</strong> - launch the game directly through File Explorer instead:</p>
                <ol>
                  <li>Open File Explorer.</li>
                  <li>Click the address bar at the top.</li>
                  <li>Paste this path and press Enter: <code>C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Tom Clancy's Rainbow Six Siege</code></li>
                  <li>Scroll down and find <strong>RainbowSix.exe</strong>.</li>
                  <li>Run it - the game launches on the NFA account.</li>
                </ol>
                <div class="info-box">If that folder does not exist, install the game first through any other Ubisoft Connect account, then repeat the steps with the NFA account signed in.</div>
              `
            }
          ]
        }
      ]
    }
  ];

  /* ── Flat topic list ── */
  var allTopics = [];
  categories.forEach(function (cat) {
    cat.products.forEach(function (prod) {
      prod.topics.forEach(function (topic) {
        allTopics.push({ category: cat.name, product: prod.name, slug: prod.slug, title: topic.title, content: topic.content });
      });
    });
  });

  function keyOf(slug, title) { return slug + "|" + title; }

  /* ── Sidebar ── */
  function buildSidebar(filter) {
    var lf = (filter || "").toLowerCase();
    var html = '<div class="docs-search-wrap"><input class="docs-search" type="search" placeholder="Search guides..." aria-label="Search guides"></div>';

    categories.forEach(function (cat) {
      var products = cat.products.filter(function (prod) {
        if (!lf) return true;
        if (prod.name.toLowerCase().indexOf(lf) !== -1) return true;
        if (cat.name.toLowerCase().indexOf(lf) !== -1) return true;
        return prod.topics.some(function (t) { return t.title.toLowerCase().indexOf(lf) !== -1; });
      });
      if (!products.length) return;

      html += '<div class="dn-game">' + cat.name + "</div>";
      products.forEach(function (prod) {
        if (prod.topics.length > 1) {
          html += '<div class="dn-prod" data-prod="' + prod.slug + '">' +
            '<div class="dn-prod-head"><span class="dn-arrow">&#9656;</span>' + prod.name + "</div>" +
            '<div class="dn-prod-body">';
          prod.topics.forEach(function (t) {
            html += '<a href="#" data-key="' + encodeURIComponent(keyOf(prod.slug, t.title)) + '">' + t.title + "</a>";
          });
          html += "</div></div>";
        } else {
          html += '<a class="dn-single" href="#" data-key="' + encodeURIComponent(keyOf(prod.slug, prod.topics[0].title)) + '">' + prod.name + "</a>";
        }
      });
    });

    nav.innerHTML = html;
    var search = nav.querySelector(".docs-search");
    if (search) {
      search.value = filter || "";
      search.addEventListener("input", function () { buildSidebar(search.value); });
      if (filter) { search.focus(); var v = search.value; search.value = ""; search.value = v; }
    }
  }

  /* ── Render a topic ── */
  function render(slug, title) {
    var idx = -1;
    for (var i = 0; i < allTopics.length; i++) {
      if (allTopics[i].slug === slug && allTopics[i].title === title) { idx = i; break; }
    }
    if (idx === -1) { idx = 0; }
    var topic = allTopics[idx];

    var nextHTML = "";
    if (idx < allTopics.length - 1) {
      var nx = allTopics[idx + 1];
      nextHTML = '<a class="docs-next" href="#" data-key="' + encodeURIComponent(keyOf(nx.slug, nx.title)) + '">' +
        '<span><span class="docs-next-label">Next</span><span class="docs-next-title">' + nx.title + "</span></span>" +
        '<span class="docs-next-arrow">&#10095;</span></a>';
    }

    main.innerHTML =
      '<span class="doc-kicker">' + topic.category + " &middot; " + topic.product + "</span>" +
      '<h1 class="doc-title">' + topic.title + "</h1>" +
      '<div class="doc-body">' + topic.content + "</div>" +
      nextHTML;

    // active state + expand active product
    nav.querySelectorAll("a[data-key]").forEach(function (a) { a.classList.remove("on"); });
    var active = nav.querySelector('a[data-key="' + encodeURIComponent(keyOf(slug, title)) + '"]');
    if (active) {
      active.classList.add("on");
      var group = active.closest(".dn-prod");
      if (group) group.classList.remove("collapsed");
      if (active.scrollIntoView) active.scrollIntoView({ block: "nearest" });
    }

    history.replaceState(null, "", "#" + slug + "/" + encodeURIComponent(title));
    window.scrollTo({ top: 0, behavior: "auto" });
    var side = document.querySelector(".docs-nav");
    if (side) side.classList.remove("open");
  }

  /* ── Events ── */
  nav.addEventListener("click", function (e) {
    var head = e.target.closest(".dn-prod-head");
    if (head) { head.parentNode.classList.toggle("collapsed"); return; }
    var a = e.target.closest("a[data-key]");
    if (!a) return;
    e.preventDefault();
    var k = decodeURIComponent(a.getAttribute("data-key")).split("|");
    render(k[0], k[1]);
  });

  main.addEventListener("click", function (e) {
    var a = e.target.closest("a.docs-next");
    if (!a) return;
    e.preventDefault();
    var k = decodeURIComponent(a.getAttribute("data-key")).split("|");
    render(k[0], k[1]);
  });

  function fromHash() {
    var h = location.hash.slice(1);
    if (h) {
      var parts = h.split("/");
      var slug = parts[0];
      var title = parts[1] ? decodeURIComponent(parts[1]) : null;
      if (title) {
        for (var i = 0; i < allTopics.length; i++) {
          if (allTopics[i].slug === slug && allTopics[i].title === title) { render(slug, title); return; }
        }
      }
      for (var j = 0; j < allTopics.length; j++) {
        if (allTopics[j].slug === slug) { render(allTopics[j].slug, allTopics[j].title); return; }
      }
    }
    render(allTopics[0].slug, allTopics[0].title);
  }

  window.addEventListener("hashchange", fromHash);

  buildSidebar("");
  fromHash();
})();
