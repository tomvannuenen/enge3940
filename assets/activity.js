// Shared behaviour for ENGE3940 activity pages. Nothing is sent anywhere.
(function () {
  function show(el) { if (el) el.classList.remove("hidden"); }
  function feedback(box, ok, html) {
    box.className = "fb " + (ok ? "ok" : "no");
    box.innerHTML = html;
  }
  function unlock(el) {
    var next = el.getAttribute("data-unlock");
    if (next) show(document.getElementById(next));
  }

  // One-answer questions: <div class="q" data-correct="b" data-unlock="step2"> ... radios ... <button>Check</button><div class="fb hidden"></div>
  document.querySelectorAll(".q").forEach(function (q) {
    var btn = q.querySelector("button");
    var out = q.querySelector(".fb");
    btn.addEventListener("click", function () {
      var picked = q.querySelector("input[type=radio]:checked");
      if (!picked) { feedback(out, false, "Choose an answer first."); return; }
      var note = q.querySelector('[data-note="' + picked.value + '"]');
      var ok = q.getAttribute("data-correct") === "any" || picked.value === q.getAttribute("data-correct");
      feedback(out, ok, note ? note.innerHTML : (ok ? "Yes." : "Not quite."));
      unlock(q);
    });
  });

  // Matching: several rows, each with a <select data-correct="x" data-why="...">
  document.querySelectorAll(".match").forEach(function (m) {
    var btn = m.querySelector("button");
    btn.addEventListener("click", function () {
      var rows = m.querySelectorAll(".row");
      var missing = false;
      rows.forEach(function (row) {
        var sel = row.querySelector("select");
        var out = row.querySelector(".fb");
        if (!sel.value) { missing = true; feedback(out, false, "Choose an answer."); return; }
        var ok = sel.value === sel.getAttribute("data-correct");
        feedback(out, ok, (ok ? "Yes. " : "Look again. ") + sel.getAttribute("data-why"));
      });
      if (!missing) unlock(m);
    });
  });

  // Reading card: the phrase has to be copied exactly from the response.
  document.querySelectorAll(".card").forEach(function (c) {
    var btn = c.querySelector("button");
    var out = c.querySelector(".fb");
    function norm(s) { return s.replace(/[‘’]/g, "'").replace(/[“”"]/g, "").replace(/\s+/g, " ").trim().toLowerCase(); }
    btn.addEventListener("click", function () {
      var source = norm(document.getElementById(c.getAttribute("data-source")).textContent);
      var phrase = norm(c.querySelector("[name=phrase]").value);
      var does = c.querySelector("[name=does]").value;
      var why = c.querySelector("[name=why]").value.trim();
      if (phrase.length < 3) { feedback(out, false, "Copy a phrase from the response."); return; }
      if (source.indexOf(phrase) === -1) { feedback(out, false, "That phrase is not in the response. Copy the words exactly."); return; }
      if (!does) { feedback(out, false, "Say what the phrase does."); return; }
      if (why.length < 8) { feedback(out, false, "Write one sentence on why."); return; }
      feedback(out, true, "Your card is complete: the phrase is copied exactly, and you said what it does and why.");
      unlock(c);
    });
  });
})();
