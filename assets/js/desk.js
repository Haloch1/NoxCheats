/* NOX CHEATS — support desk (member view). Members open tickets and chat with staff. */
(function () {
  "use strict";
  function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }

  var gate = document.querySelector("[data-gate]");
  var desk = document.querySelector("[data-desk]");
  var listEl = document.querySelector("[data-ticket-list]");
  var msgsEl = document.querySelector("[data-thread-msgs]");
  var formEl = document.querySelector("[data-thread-form]");
  var inputEl = document.querySelector("[data-thread-input]");
  var modal = document.querySelector("[data-ticket-modal]");
  var currentId = null;
  var pollTimer = null;
  var lastCount = -1;
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  async function loadTickets() {
    var res = await fetch("/api/desk/tickets");
    var data = await res.json();
    var tickets = data.tickets || [];
    if (!tickets.length) { listEl.innerHTML = '<p style="color:var(--muted)">No tickets yet. Start one with “New ticket”.</p>'; return; }
    listEl.innerHTML = tickets.map(function (t) {
      return '<button class="ticket-item' + (t.id === currentId ? " on" : "") + '" data-ticket="' + t.id + '">' +
        "<b>" + esc(t.subject) + '</b><span class="pill ' + (t.status === "open" ? "warn" : "ok") + '" style="margin-top:4px;">' + t.status + "</span></button>";
    }).join("");
    listEl.querySelectorAll("[data-ticket]").forEach(function (b) {
      b.addEventListener("click", function () { openTicket(b.getAttribute("data-ticket")); });
    });
  }

  async function openTicket(id) {
    currentId = id;
    lastCount = -1;
    loadTickets();
    var res = await fetch("/api/desk/tickets/" + id);
    var data = await res.json();
    if (!res.ok) { msgsEl.innerHTML = '<p style="color:#b91c1c">' + esc(data.error) + "</p>"; return; }
    renderMessages(data.messages || []);
    formEl.hidden = false;
    /* Poll so staff replies (including ones typed in Discord) show up live. */
    stopPolling();
    pollTimer = setInterval(refreshOpen, 8000);
  }

  async function refreshOpen() {
    if (!currentId || document.hidden) return;
    try {
      var res = await fetch("/api/desk/tickets/" + currentId);
      if (!res.ok) return;
      var data = await res.json();
      var msgs = data.messages || [];
      if (msgs.length !== lastCount) renderMessages(msgs);
    } catch (e) { /* ignore transient errors */ }
  }

  function renderMessages(messages) {
    lastCount = messages.length;
    msgsEl.innerHTML = messages.map(function (m) {
      return '<div class="msg ' + (m.is_staff ? "staff" : "them") + '"><span class="who">' + esc(m.author_name) + "</span>" + esc(m.body) + "</div>";
    }).join("") || '<p style="color:var(--muted);margin:auto;">No messages yet.</p>';
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  document.querySelector("[data-thread-send]").addEventListener("click", send);
  inputEl.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
  async function send() {
    var body = inputEl.value.trim();
    if (!body || !currentId) return;
    inputEl.value = "";
    var res = await fetch("/api/desk/tickets/" + currentId + "/messages", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: body }),
    });
    if (res.ok) openTicket(currentId);
  }

  /* new ticket modal */
  function openTicketModal() {
    var m = document.querySelector("[data-nt-msg]");
    if (m) { m.hidden = true; m.textContent = ""; }
    modal.hidden = false;
    var subj = document.querySelector("[data-nt-subject]");
    if (subj) setTimeout(function () { subj.focus(); }, 30);
  }
  function closeTicketModal() { modal.hidden = true; }
  document.querySelector("[data-new-ticket]").addEventListener("click", openTicketModal);
  document.querySelectorAll("[data-nt-cancel]").forEach(function (el) { el.addEventListener("click", closeTicketModal); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) closeTicketModal(); });
  document.querySelector("[data-nt-create]").addEventListener("click", async function () {
    var msg = document.querySelector("[data-nt-msg]");
    var payload = { subject: document.querySelector("[data-nt-subject]").value, message: document.querySelector("[data-nt-message]").value };
    try {
      var res = await fetch("/api/desk/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create ticket.");
      modal.hidden = true;
      document.querySelector("[data-nt-subject]").value = "";
      document.querySelector("[data-nt-message]").value = "";
      await loadTickets();
      openTicket(data.id);
    } catch (err) {
      msg.textContent = err.message; msg.className = "nox-msg error"; msg.hidden = false;
    }
  });

  (async function init() {
    try {
      var s = await (await fetch("/api/auth/session")).json();
      if (!s.user) { gate.hidden = false; return; }
      desk.hidden = false;
      loadTickets();
    } catch (e) { gate.hidden = false; }
  })();
})();
