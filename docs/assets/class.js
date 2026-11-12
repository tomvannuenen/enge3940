// Class mode for ENGE3940 activity pages.
// Without a room code a page sends nothing. With a code, answers go to the class screen without a name.
(function () {
  var API = (window.ENGE_API || "").replace(/\/$/, "");
  var store = window.sessionStorage;
  function get(k) { try { return store.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { v === null ? store.removeItem(k) : store.setItem(k, v); } catch (e) {} }

  var device = get("enge-device");
  if (!device) {
    device = Array.from(crypto.getRandomValues(new Uint8Array(12)), function (n) { return n.toString(16).padStart(2, "0"); }).join("");
    set("enge-device", device);
  }
  var room = get("enge-room");
  var bar = document.getElementById("classbar");

  function api(path, opts) {
    return fetch(API + "/api/" + path, opts).then(function (r) {
      return r.json().then(function (d) { d.status = r.status; return d; });
    });
  }

  var Class = {
    room: function () { return room; },
    device: device,
    // Which of n groups this device is in. Used when the class is split.
    group: function (n) { return parseInt(device.slice(0, 6), 16) % n; },
    send: function (q, v, kind) {
      if (!room) return Promise.resolve(null);
      return api("room/" + room + "/answer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: q, v: v, kind: kind || "choice", device: device }),
      }).catch(function () { return null; });
    },
    results: function (code, qs, key) {
      return api("room/" + code + "/results?q=" + encodeURIComponent(qs.join(",")), { headers: key ? { "X-Host-Key": key } : {} });
    },
    // What the tutor's screen has published to the room.
    state: function (keys) {
      if (!room) return Promise.resolve(null);
      return api("room/" + room + "/state?keys=" + encodeURIComponent(keys.join(","))).then(function (d) { return d.ok ? d.state : null; }).catch(function () { return null; });
    },
    // Run fn every ms milliseconds, but not while the tab is in the background.
    // Every call to the service counts against a daily limit, so pages ask as rarely as they can.
    // It also stops after 40 minutes, so a laptop left open on a page does not keep asking.
    every: function (ms, fn) {
      var started = Date.now();
      fn();
      var id = setInterval(function () {
        if (Date.now() - started > 40 * 60 * 1000) {
          clearInterval(id);
          if (bar) bar.innerHTML = 'This page has stopped updating. <button type="button" class="plain" onclick="location.reload()">Reload</button>';
          return;
        }
        if (!document.hidden) fn();
      }, ms);
      return id;
    },
    // Pairs: two or three students who sit together share a pair number.
    pair: { id: get("enge-pair") ? +get("enge-pair") : null, role: get("enge-role") ? +get("enge-role") : 0, size: 1 },
    pairStart: function (number) {
      if (!room) return Promise.resolve({ error: "Type the room code first." });
      return api("room/" + room + "/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device: device, pair: number || "" }) }).then(function (d) {
        if (d.ok) { Class.pair = { id: d.pair, role: d.role, size: d.size }; set("enge-pair", String(d.pair)); set("enge-role", String(d.role)); }
        return d;
      }).catch(function () { return { error: "The class service cannot be reached." }; });
    },
    // items: [{key, value, secret}]. A secret value is never shown to the partner.
    pairPut: function (items) {
      return api("room/" + room + "/pairput", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pair: Class.pair.id, device: device, items: items }) }).catch(function () { return null; });
    },
    pairView: function () {
      return api("room/" + room + "/pairview?pair=" + Class.pair.id + "&device=" + device).then(function (d) { if (d.ok) Class.pair.size = d.size; return d; }).catch(function () { return { error: "offline" }; });
    },
    // Leave the pair, so the others do not wait for this laptop.
    pairLeave: function () {
      var id = Class.pair.id;
      set("enge-pair", null); set("enge-role", null); Class.pair = { id: null, role: 0, size: 1 };
      if (!room || !id) return Promise.resolve(null);
      return api("room/" + room + "/pairleave", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pair: id, device: device }) }).catch(function () { return null; });
    },
    api: api,
  };
  window.Class = Class;

  // The bar at the top of an activity page.
  if (!bar) return;
  if (!window.ENGE_CLASS_AVAILABLE) { room = null; bar.innerHTML = '<span class="small">Nothing you type on this page leaves your browser.</span>'; return; }
  function draw(msg) {
    if (room) {
      bar.innerHTML = '<strong>Room ' + room + '.</strong> Your answers go to the class screen without your name. <button type="button" class="plain" id="leave">Leave</button>';
      document.getElementById("leave").onclick = function () { Class.pairLeave().then(function () { room = null; set("enge-room", null); draw(); }); };
    } else {
      bar.innerHTML = '<label for="code">In class? Type the room code:</label> <input type="text" id="code" maxlength="4" size="5" autocomplete="off" autocapitalize="characters"> <button type="button" id="join">Join</button> <span class="small">' + (msg || "Working alone, nothing you type leaves your browser.") + '</span>';
      document.getElementById("join").onclick = join;
      document.getElementById("code").onkeydown = function (e) { if (e.key === "Enter") join(); };
    }
  }
  function join(given) {
    var code = (typeof given === "string" ? given : document.getElementById("code").value).trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) { draw("A room code has four letters."); return; }
    api("room/" + code + "/info").then(function (d) {
      if (d.ok) { if (code !== get("enge-room")) { set("enge-pair", null); set("enge-role", null); Class.pair = { id: null, role: 0, size: 1 }; } room = code; set("enge-room", code); draw(); }
      else draw("No room with that code. Check with your tutor.");
    }).catch(function () { draw("The class service cannot be reached. You can still do the page alone."); });
  }
  var fromUrl = new URLSearchParams(location.search).get("room");
  if (fromUrl && fromUrl.toUpperCase() !== room) { room = null; draw(); join(fromUrl); } else draw(); // a code in the link replaces an older room
})();
