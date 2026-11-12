// Meeting 2 class activity: build ELIZA together. Tutor's controls and the question list.
window.ACTIVITY = {
  id: "m02",
  title: "Build ELIZA together",
  page: "activities/meeting-02-build-eliza.html",
  questions: [],
  // Pretend students for the test page.
  pretend: function (p) {
    var rules = ["exam => What worries you about the exam?", "tired => How long have you felt tired?", "friend => Tell me more about your friend.", "homework => Why do you think homework matters?", "phone => What do you use your phone for?", "happy => What makes you happy?", "because => Is that the real reason?", "sorry => There is no need to apologise.", "dream => What does that dream tell you?", "food => What do you like to eat?", "no => Why not?", "you => We were talking about you, not me."];
    var breaks = ["I am not sad at all.", "My mother's friend is always tired but I am happy.", "asdfgh", "What is your name?", "I never said always.", "Sadly the shop was closed."];
    p.all(function (i) { if (i < rules.length) p.send(i, "m02-rule", rules[i], "text"); if (i < breaks.length) p.send(i, "m02-break", breaks[i], "text"); });
    return Promise.resolve("Sent " + rules.length + " rules and " + breaks.length + " messages that broke the program.");
  },
  host: function (h) {
    var base = [{ k: "mother", r: "Tell me more about your family." }, { k: "sad", r: "Why do you feel sad?" }, { k: "always", r: "Can you think of a specific example?" }];
    var proposals = [], chosen = {}, live = base.slice(), breaks = [];
    h.el.innerHTML =
      '<h2>The class’s program</h2><p>The program reads a message and looks for the first keyword it knows. It has no other way of answering. If no keyword matches, it says “Please go on.”</p><table id="erules"></table>' +
      '<h2>Rules from students</h2><p>Tick the rules to add, then update the program. Only ticked rules go to students’ screens.</p><div id="eprops"></div>' +
      '<p><button type="button" id="eupdate">Update the program</button> <span class="small" id="emsg"></span></p>' +
      '<h2>Messages that broke it</h2><details><summary id="ebn">0 messages</summary><ul id="ebreaks"></ul></details>';
    function $(id) { return h.el.querySelector("#" + id); }
    function parse(t) { var i = t.indexOf("=>"); return i === -1 ? null : { k: t.slice(0, i).trim().toLowerCase(), r: t.slice(i + 2).trim() }; }
    function draw() {
      $("erules").innerHTML = "<tr><th>If the message contains</th><th>Reply</th></tr>" + live.map(function (r) { return "<tr><td>" + h.esc(r.k) + "</td><td>" + h.esc(r.r) + "</td></tr>"; }).join("");
      $("eprops").innerHTML = proposals.length ? proposals.map(function (p) {
        var r = parse(p.text);
        return r ? '<div class="line"><label><input type="checkbox" data-id="' + p.id + '"' + (chosen[p.id] ? " checked" : "") + "> “" + h.esc(r.k) + "” → " + h.esc(r.r) + "</label></div>" : "";
      }).join("") : '<p class="small">No rules yet.</p>';
      $("eprops").querySelectorAll("input").forEach(function (c) { c.onchange = function () { chosen[c.getAttribute("data-id")] = c.checked; }; });
      $("ebn").textContent = breaks.length + (breaks.length === 1 ? " message" : " messages");
      $("ebreaks").innerHTML = breaks.map(function (b) { return "<li>" + h.esc(b.text) + "</li>"; }).join("");
    }
    $("eupdate").onclick = function () {
      live = base.concat(proposals.filter(function (p) { return chosen[p.id] && parse(p.text); }).map(function (p) { return parse(p.text); }));
      h.publish("m02", { rules: live }).then(function () { $("emsg").textContent = "Updated: " + live.length + " rules."; });
      draw();
    };
    h.publish("m02", { rules: live });
    setInterval(function () {
      h.get("results?q=m02-rule,m02-break").then(function (d) {
        if (!d.ok) return;
        proposals = d.results["m02-rule"].items || []; breaks = d.results["m02-break"].items || []; draw();
      });
    }, 2000);
    draw();
  }
};
