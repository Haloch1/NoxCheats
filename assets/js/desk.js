/* NOX CHEATS — support desk (member view). Two-panel inbox with live polling. */
(function () {
  "use strict";
  function esc(s) { var d = document.createElement("div"); d.textContent = String(s == null ? "" : s); return d.innerHTML; }

  var gate = document.querySelector("[data-gate]");
  var desk = document.querySelector("[data-desk]");
  var listEl = document.querySelector("[data-ticket-list]");
  var msgsEl = document.querySelector("[data-thread-msgs]");
  var formEl = document.querySelector("[data-thread-form]");
  var inputEl = document.querySelector("[data-thread-input]");
  var newForm = document.querySelector("[data-new-form]");
  var threadTitle = document.querySelector("[data-thread-title]");
  var threadStatus = document.querySelector("[data-thread-status]");
  var subjEl = document.querySelector("[data-nt-subject]");
  var bodyEl = document.querySelector("[data-nt-message]");
  var ntMsg = document.querySelector("[data-nt-msg]");

  var currentId = null;
  var currentSubject = "";
  var pollTimer = null;
  var lastCount = -1;
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function statusPill(el, status) {
    if (!el) return;
    el.hidden = false;
    el.textContent = status;
    el.className = "pill " + (status === "open" ? "warn" : "ok");
  }

  async function loadTickets() {
    var res = await fetch("/api/desk/tickets");
    var data = await res.json();
    var tickets = data.tickets || [];
    if (!tickets.length) {
      listEl.innerHTML = '<p class="desk-empty">No tickets yet. Start one with the New ticket button.</p>';
      return;
    }
    listEl.innerHTML = tickets.map(function (t) {
      return '<button class="ticket-item' + (t.id === currentId ? " on" : "") + '" data-ticket="' + t.id + '">' +
        "<b>" + esc(t.subject) + "</b>" +
        '<span class="pill ' + (t.status === "open" ? "warn" : "ok") + '">' + esc(t.status) + "</span>" +
        "</button>";
    }).join("");
    listEl.querySelectorAll("[data-ticket]").forEach(function (b) {
      b.addEventListener("click", function () { openTicket(b.getAttribute("data-ticket"), b.querySelector("b").textContent); });
    });
  }

  async function openTicket(id, subject) {
    currentId = id;
    currentSubject = subject || currentSubject;
    lastCount = -1;
    if (threadTitle) threadTitle.textContent = currentSubject || "Ticket";
    loadTickets();
    var res = await fetch("/api/desk/tickets/" + id);
    var data = await res.json();
    if (!res.ok) { msgsEl.innerHTML = '<div class="desk-empty desk-empty-center" style="color:#b91c1c">' + esc(data.error) + "</div>"; return; }
    if (data.ticket) {
      if (threadTitle) threadTitle.textContent = data.ticket.subject;
      statusPill(threadStatus, data.ticket.status);
    }
    renderMessages(data.messages || []);
    formEl.hidden = false;
    stopPolling();
    pollTimer = setInterval(refreshOpen, 8000);
  }

  async function refreshOpen() {
    if (!currentId || document.hidden) return;
    try {
      var res = await fetch("/api/desk/tickets/" + currentId);
      if (!res.ok) return;
      var data = await res.json();
      if (data.ticket) statusPill(threadStatus, data.ticket.status);
      var msgs = data.messages || [];
      if (msgs.length !== lastCount) renderMessages(msgs);
    } catch (e) { /* ignore transient errors */ }
  }

  function renderMessages(messages) {
    lastCount = messages.length;
    if (!messages.length) { msgsEl.innerHTML = '<div class="desk-empty desk-empty-center">No messages yet.</div>'; return; }
    msgsEl.innerHTML = messages.map(function (m) {
      return '<div class="msg ' + (m.is_staff ? "staff" : "them") + '"><span class="who">' + esc(m.author_name) + "</span>" + esc(m.body) + "</div>";
    }).join("");
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
    if (res.ok) { lastCount = -1; refreshOpen(); }
  }

  /* new ticket inline form */
  function showNewForm() {
    if (ntMsg) { ntMsg.hidden = true; ntMsg.textContent = ""; }
    newForm.hidden = false;
    if (subjEl) setTimeout(function () { subjEl.focus(); }, 30);
  }
  function hideNewForm() { newForm.hidden = true; }
  document.querySelector("[data-new-ticket]").addEventListener("click", function () {
    if (newForm.hidden) showNewForm(); else hideNewForm();
  });
  document.querySelector("[data-nt-cancel]").addEventListener("click", hideNewForm);
  document.querySelector("[data-nt-create]").addEventListener("click", async function () {
    var payload = { subject: subjEl.value, message: bodyEl.value };
    try {
      var res = await fetch("/api/desk/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create ticket.");
      subjEl.value = ""; bodyEl.value = "";
      hideNewForm();
      await loadTickets();
      openTicket(data.id, payload.subject);
    } catch (err) {
      ntMsg.textContent = err.message; ntMsg.className = "nox-msg error"; ntMsg.hidden = false;
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
