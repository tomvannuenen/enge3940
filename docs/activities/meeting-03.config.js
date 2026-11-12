// Meeting 3 class activity: the class is the model. Tutor's controls and the question list.
window.ACTIVITY = {
  id: "m03",
  title: "The class is the model",
  page: "activities/meeting-03-class-model.html",
  questions: [],
  host: function (h) {
    var state = { round: 0, text: "", done: false }, counts = {}, hidden = [];
    var starts = ["The best thing about this city is", "On the way to class this morning I", "My favourite thing to eat is"];
    h.el.innerHTML =
      '<div id="m03start"><p>Choose how the sentence starts, or type your own.</p>' +
      starts.map(function (s, i) { return '<p><button type="button" class="plain" data-s="' + i + '">' + h.esc(s) + " …</button></p>"; }).join("") +
      '<div class="inline"><input type="text" id="m03own" maxlength="80" placeholder="Your own start"><button type="button" id="m03go">Start</button></div></div>' +
      '<div id="m03run" class="hidden"><p class="big" id="m03text"></p><p class="small" id="m03n"></p><div id="m03bars"></div>' +
      '<p><button type="button" id="m03top">Take the top word</button> <button type="button" id="m03draw">Draw a word at random</button> <button type="button" class="plain" id="m03end">End the sentence</button></p>' +
      '<p class="small">“Top word” always takes the most common answer. “Draw” picks one answer at random, so common words are more likely but not certain. Click a word to remove it.</p></div>';
    function q() { return "m03-r" + state.round; }
    function begin(text) {
      state = { round: 1, text: text.trim(), done: false }; counts = {}; hidden = [];
      h.publish("m03", state);
      h.el.querySelector("#m03start").classList.add("hidden"); h.el.querySelector("#m03run").classList.remove("hidden"); draw();
    }
    h.el.querySelectorAll("[data-s]").forEach(function (b) { b.onclick = function () { begin(starts[+b.getAttribute("data-s")]); }; });
    h.el.querySelector("#m03go").onclick = function () { var v = h.el.querySelector("#m03own").value; if (v.trim().length > 2) begin(v); };
    function words() { return Object.keys(counts).filter(function (w) { return hidden.indexOf(w) === -1; }).sort(function (a, b) { return counts[b] - counts[a]; }); }
    function draw() {
      h.el.querySelector("#m03text").textContent = state.text + (state.done ? "" : " …");
      var ws = words(), total = ws.reduce(function (t, w) { return t + counts[w]; }, 0), max = ws.length ? counts[ws[0]] : 1;
      h.el.querySelector("#m03n").textContent = state.done ? "Finished." : "Word " + state.round + ": " + total + (total === 1 ? " answer" : " answers");
      h.el.querySelector("#m03bars").innerHTML = state.done ? "" : ws.slice(0, 10).map(function (w) {
        return '<div class="barrow" data-w="' + h.esc(w) + '" style="cursor:pointer"><div>' + h.esc(w) + '</div><div class="track"><div class="fill" style="width:' + Math.round(100 * counts[w] / max) + '%"></div></div><div>' + Math.round(100 * counts[w] / total) + "%</div></div>";
      }).join("");
      h.el.querySelectorAll("#m03bars .barrow").forEach(function (r) {
        r.onclick = function () { hidden.push(r.getAttribute("data-w")); h.post("moderate", { q: q(), hide: hidden }); draw(); };
      });
    }
    function take(word) { if (!word) return; state.text += " " + word; state.round += 1; counts = {}; hidden = []; h.publish("m03", state); draw(); }
    h.el.querySelector("#m03top").onclick = function () { take(words()[0]); };
    h.el.querySelector("#m03draw").onclick = function () {
      var ws = words(), total = ws.reduce(function (t, w) { return t + counts[w]; }, 0), r = Math.random() * total;
      for (var i = 0; i < ws.length; i++) { r -= counts[ws[i]]; if (r < 0) { take(ws[i]); return; } }
    };
    h.el.querySelector("#m03end").onclick = function () { state.done = true; h.publish("m03", state); draw(); };
    setInterval(function () {
      if (!state.round || state.done) return;
      var id = q();
      h.get("results?q=" + id).then(function (d) { if (d.ok && id === q()) { counts = d.results[id].counts || {}; draw(); } });
    }, 1500);
  }
};
