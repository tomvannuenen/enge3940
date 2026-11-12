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
    api: api,
  };
  window.Class = Class;

  // The bar at the top of an activity page.
  var bar = document.getElementById("classbar");
  if (!bar) return;
  if (!window.ENGE_CLASS_AVAILABLE) { room = null; bar.innerHTML = '<span class="small">Nothing you type on this page leaves your browser.</span>'; return; }
  function draw(msg) {
    if (room) {
      bar.innerHTML = '<strong>Room ' + room + '.</strong> Your answers go to the class screen without your name. <button type="button" class="plain" id="leave">Leave</button>';
      document.getElementById("leave").onclick = function () { room = null; set("enge-room", null); draw(); };
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
      if (d.ok) { room = code; set("enge-room", code); draw(); }
      else draw("No room with that code. Check with your tutor.");
    }).catch(function () { draw("The class service cannot be reached. You can still do the page alone."); });
  }
  var fromUrl = new URLSearchParams(location.search).get("room");
  if (fromUrl && !room) { draw(); join(fromUrl); } else draw();
})();
