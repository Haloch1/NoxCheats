/* NOX CHEATS — resilient response parsing.
   Loaded first on every page. Makes Response.json() tolerant so an empty body,
   an HTML error page, or a stale/stopped backend produces a clean object with
   an { error } message instead of throwing "Unexpected end of JSON input" or
   "Unexpected token '<'" and breaking the UI. */
(function () {
  "use strict";
  if (typeof Response === "undefined" || Response.prototype.__noxPatched) return;
  Response.prototype.__noxPatched = true;

  var originalJson = Response.prototype.json;
  Response.prototype.json = async function () {
    var text = "";
    try {
      text = await this.clone().text();
    } catch (e) {
      try { return await originalJson.call(this); } catch (e2) { return {}; }
    }
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (e) {
      /* HTML (404 page), plain text, or partial body — surface a usable message */
      return { error: "The server sent an unexpected response. Make sure the backend is running (node server.js) and has been restarted." };
    }
  };
})();
