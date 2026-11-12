// Meeting 1 class activity: human or chatbot? Tutor's controls and the question list.
window.ACTIVITY = {
  id: "m01b",
  title: "Human or chatbot?",
  page: "activities/meeting-01-human-or-chatbot.html",
  questions: [],
  host: function (h) {
    var replies = [], chosen = {}, bots = [], items = [], labels = {}, phase = "write", votes = {};
    h.el.innerHTML =
      '<div id="hw"><h2>1. Students write</h2><p>Students reply to “It’s cold in here.” as they would to a friend. Tick up to eight replies to use. Only ticked replies go on students’ screens.</p><div id="hwlist"></div>' +
      '<h2>2. Chatbot replies</h2><p><button type="button" class="plain" id="hbots">Write four chatbot replies</button> <span class="small" id="hbotmsg"></span></p><div id="hbotlist"></div>' +
      '<p><button type="button" id="hstart">Start the guessing</button> <span class="takeaway" id="hmsg"></span></p></div>' +
      '<div id="hg" class="hidden"><h2 id="hgtitle">3. The class guesses</h2><div id="hglist"></div><p><button type="button" id="hreveal">Reveal</button></p></div>';
    function $(id) { return h.el.querySelector("#" + id); }
    function drawWrite() {
      $("hwlist").innerHTML = replies.length ? replies.map(function (r) {
        return '<div class="line"><label><input type="checkbox" data-id="' + r.id + '"' + (chosen[r.id] ? " checked" : "") + "> " + h.esc(r.text) + "</label></div>";
      }).join("") : '<p class="small">No replies yet.</p>';
      $("hwlist").querySelectorAll("input").forEach(function (c) { c.onchange = function () { chosen[c.getAttribute("data-id")] = c.checked; }; });
      $("hbotlist").innerHTML = bots.map(function (b) { return '<div class="line">' + h.esc(b) + "</div>"; }).join("");
    }
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
      var people = replies.filter(function (r) { return chosen[r.id]; }).slice(0, 8);
      if (people.length < 2 || bots.length < 2) { $("hmsg").textContent = "Tick at least two student replies and write the chatbot replies first."; return; }
      var all = people.map(function (r) { return { text: r.text, label: "person" }; }).concat(bots.slice(0, 6).map(function (b) { return { text: b, label: "chatbot" }; }));
      for (var i = all.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = all[i]; all[i] = all[j]; all[j] = t; }
      items = all.map(function (x, i) { labels["i" + i] = x.label; return { id: "i" + i, text: x.text }; });
      phase = "guess";
      h.publish("m01b", { phase: "guess", items: items });
      $("hw").classList.add("hidden"); $("hg").classList.remove("hidden"); drawGuess();
    };
    function drawGuess() {
      $("hglist").innerHTML = items.map(function (it) {
        var c = votes[it.id] || {}, p = c.person || 0, b = c.chatbot || 0, tot = Math.max(1, p + b);
        return '<div class="line"><p style="margin:0 0 6px">' + h.esc(it.text) + (phase === "reveal" ? ' <strong class="takeaway">Written by a ' + labels[it.id] + ".</strong>" : "") + "</p>" +
          '<div class="barrow"><div>A person</div><div class="track"><div class="fill" style="width:' + Math.round(100 * p / tot) + '%"></div></div><div>' + p + "</div></div>" +
          '<div class="barrow"><div>A chatbot</div><div class="track"><div class="fill" style="width:' + Math.round(100 * b / tot) + '%"></div></div><div>' + b + "</div></div></div>";
      }).join("");
    }
    $("hreveal").onclick = function () {
      phase = "reveal";
      h.publish("m01b", { phase: "reveal", items: items.map(function (it) { return { id: it.id, text: it.text, label: labels[it.id] }; }) });
      $("hgtitle").textContent = "4. Who wrote what"; $("hreveal").classList.add("hidden"); drawGuess();
    };
    setInterval(function () {
      if (phase === "write") {
        h.get("results?q=m01b-reply").then(function (d) { if (d.ok) { replies = d.results["m01b-reply"].items || []; drawWrite(); } });
      } else {
        h.get("results?q=" + items.map(function (it) { return "m01b-g-" + it.id; }).join(",")).then(function (d) {
          if (!d.ok) return;
          items.forEach(function (it) { votes[it.id] = (d.results["m01b-g-" + it.id] || {}).counts || {}; });
          drawGuess();
        });
      }
    }, 2000);
    drawWrite();
  }
};
