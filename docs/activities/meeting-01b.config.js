// Meeting 1 game: fool the class. Tutor's controls.
// Half the class writes as themselves; half writes the way a chatbot would. Chatbot replies are mixed in.
window.ACTIVITY = {
  id: "m01b",
  title: "Fool the class",
  page: "activities/meeting-01-human-or-chatbot.html",
  questions: [],
  host: function (h) {
    var NAMES = { person: "a person, writing as themselves", imitation: "a person, writing like a chatbot", chatbot: "a chatbot" };
    var lists = { person: [], imitation: [] }, chosen = {}, bots = [], items = [], labels = {}, phase = "write", votes = {};
    h.el.innerHTML =
      '<div id="hw"><h2>1. Students write</h2><p>Half the class replies to “It’s cold in here.” as themselves. The other half writes the way a chatbot would. Tick up to four of each, or let the page pick, then read the ticked ones before you start. Only ticked replies go on students’ screens.</p>' +
      '<p><button type="button" class="plain" id="hpick">Pick four of each at random</button> <span class="small" id="hcount"></span></p>' +
      '<details id="hfold"><summary>Read the replies (freeze or blank the projector first: this list shows who is imitating)</summary>' +
      '<h3 style="font-size:16px;margin:16px 0 4px">Writing as themselves</h3><div id="hl-person"></div><h3 style="font-size:16px;margin:16px 0 4px">Writing like a chatbot</h3><div id="hl-imitation"></div></details>' +
      '<h2>2. Chatbot replies</h2><p><button type="button" class="plain" id="hbots">Write four chatbot replies</button> <span class="small" id="hbotmsg"></span></p><div id="hbotlist"></div>' +
      '<p><button type="button" id="hstart">Start the guessing</button> <span class="takeaway" id="hmsg"></span></p></div>' +
      '<div id="hg" class="hidden"><h2 id="hgtitle">3. The class guesses</h2><p class="small" id="hgn"></p><div id="hglist"></div><p><button type="button" id="hreveal">Reveal</button></p></div>';
    function $(id) { return h.el.querySelector("#" + id); }
    function drawWrite() {
      ["person", "imitation"].forEach(function (kind) {
        $("hl-" + kind).innerHTML = lists[kind].length ? lists[kind].map(function (r) {
          return '<div class="line"><label><input type="checkbox" data-id="' + kind + ":" + r.id + '"' + (chosen[kind + ":" + r.id] ? " checked" : "") + "> " + h.esc(r.text) + "</label></div>";
        }).join("") : '<p class="small">No replies yet.</p>';
      });
      h.el.querySelectorAll("#hw input[type=checkbox]").forEach(function (c) { c.onchange = function () { chosen[c.getAttribute("data-id")] = c.checked; drawWrite(); }; });
      var ticked = Object.keys(chosen).filter(function (k) { return chosen[k]; }).length;
      $("hcount").textContent = lists.person.length + " as themselves, " + lists.imitation.length + " like a chatbot. " + ticked + " ticked.";
      $("hbotlist").innerHTML = bots.map(function (b) { return '<div class="line">' + h.esc(b) + "</div>"; }).join("");
    }
    $("hpick").onclick = function () {
      chosen = {};
      ["person", "imitation"].forEach(function (kind) {
        var pool = lists[kind].slice();
        for (var n = 0; n < 4 && pool.length; n++) { var r = pool.splice(Math.floor(Math.random() * pool.length), 1)[0]; chosen[kind + ":" + r.id] = true; }
      });
      drawWrite();
    };
    $("hbots").onclick = function () {
      // One at a time: the model is slower and less reliable when asked for several texts at once.
      var left = 4, failed = 0;
      $("hbotmsg").textContent = "Writing…";
      (function next() {
        if (!left) { $("hbotmsg").textContent = failed ? failed + " could not be written. Try again." : ""; return; }
        left -= 1;
        h.post("generate", { task: "m01-cold-reply" }).then(function (r) {
          if (r.ok) { if (bots.indexOf(r.text) === -1) bots.push(r.text); } else failed += 1;
          drawWrite(); next();
        }).catch(function () { failed += 1; next(); });
      })();
    };
    $("hstart").onclick = function () {
      var all = [];
      ["person", "imitation"].forEach(function (kind) {
        lists[kind].filter(function (r) { return chosen[kind + ":" + r.id]; }).slice(0, 4).forEach(function (r) { all.push({ text: r.text, label: kind }); });
      });
      if (all.length < 2 || bots.length < 2) { $("hmsg").textContent = "Tick at least two student replies and write the chatbot replies first."; return; }
      bots.slice(0, 4).forEach(function (b) { all.push({ text: b, label: "chatbot" }); });
      for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = all[i]; all[i] = all[j]; all[j] = t; }
      items = all.map(function (x, i) { labels["i" + i] = x.label; return { id: "i" + i, text: x.text }; });
      phase = "guess";
      h.publish("m01b", { phase: "guess", items: items });
      $("hw").classList.add("hidden"); $("hg").classList.remove("hidden"); drawGuess();
    };
    function drawGuess() {
      var most = 0, voters = 0;
      var rows = items.map(function (it) {
        var c = votes[it.id] || {}, p = c.person || 0, b = c.chatbot || 0, tot = p + b;
        var wrong = labels[it.id] === "chatbot" ? p : b; // a guess is wrong if it names the other kind of writer
        voters = Math.max(voters, tot);
        return { it: it, p: p, b: b, tot: tot, fooled: tot ? wrong / tot : 0 };
      });
      rows.forEach(function (r) { most = Math.max(most, r.fooled); });
      $("hgn").textContent = voters + (voters === 1 ? " student has guessed." : " students have guessed.");
      $("hglist").innerHTML = rows.map(function (r) {
        var tot = Math.max(1, r.tot);
        var rev = phase === "reveal" ? ' <strong class="takeaway">Written by ' + NAMES[labels[r.it.id]] + ". Fooled " + Math.round(100 * r.fooled) + "%" + (r.fooled === most && most > 0 ? ", the most" : "") + ".</strong>" : "";
        return '<div class="line"><p style="margin:0 0 6px">' + h.esc(r.it.text) + rev + "</p>" +
          '<div class="barrow"><div>A person</div><div class="track"><div class="fill" style="width:' + Math.round(100 * r.p / tot) + '%"></div></div><div>' + r.p + "</div></div>" +
          '<div class="barrow"><div>A chatbot</div><div class="track"><div class="fill" style="width:' + Math.round(100 * r.b / tot) + '%"></div></div><div>' + r.b + "</div></div></div>";
      }).join("");
    }
    $("hreveal").onclick = function () {
      phase = "reveal";
      h.publish("m01b", { phase: "reveal", items: items.map(function (it) { return { id: it.id, text: it.text, label: labels[it.id] }; }) });
      $("hgtitle").textContent = "4. Who wrote what"; $("hreveal").classList.add("hidden"); drawGuess();
    };
    setInterval(function () {
      if (phase === "write") {
        h.get("results?q=m01b-reply,m01b-fake").then(function (d) {
          if (!d.ok) return;
          lists.person = d.results["m01b-reply"].items || []; lists.imitation = d.results["m01b-fake"].items || []; drawWrite();
        });
      } else {
        h.get("results?q=" + items.map(function (it) { return "m01b-g-" + it.id; }).join(",")).then(function (d) {
          if (!d.ok) return;
          items.forEach(function (it) { votes[it.id] = (d.results["m01b-g-" + it.id] || {}).counts || {}; });
          drawGuess();
        });
      }
    }, 2500);
    drawWrite();
  }
};
