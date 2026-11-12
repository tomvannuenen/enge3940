// The box where two students who sit together become a pair.
// PairBox(element, onReady): draws the box and calls onReady once this laptop is in a pair.
window.PairBox = function (box, onReady) {
  var ready = false, lastRoom = null;
  function draw(msg) {
    if (!Class.room()) { box.innerHTML = '<p class="small">Type the room code at the top of the page first.</p>'; return; }
    if (Class.pair.id) {
      box.innerHTML = "<p><strong>Pair " + Class.pair.id + ".</strong> You are person " + "ABC".charAt(Class.pair.role) + '. <span id="pairsize" class="small"></span> <button type="button" class="plain" id="pleave">Change pair</button></p><p class="small">Stuck waiting for someone who has gone? Both press Change pair and make a new pair.</p>';
      document.getElementById("pleave").onclick = function () { Class.pairLeave().then(function () { location.reload(); }); };
      if (!ready) { ready = true; onReady(); }
      return;
    }
    box.innerHTML = "<p>Work with the person next to you, each on your own laptop. One of you starts a pair and says the number. The other types it and joins.</p>" +
      '<p><button type="button" id="pnew">Start a pair</button> &nbsp;or&nbsp; <input type="text" id="pnum" maxlength="3" inputmode="numeric" style="width:5em" aria-label="Pair number"> <button type="button" class="plain" id="pjoin">Join</button></p>' +
      '<p class="takeaway" id="pmsg">' + (msg || "") + "</p>";
    document.getElementById("pnew").onclick = function () { Class.pairStart().then(done); };
    document.getElementById("pjoin").onclick = function () {
      var n = document.getElementById("pnum").value.trim();
      if (!/^\d{2,3}$/.test(n)) { draw("Type the pair number your partner got."); return; }
      Class.pairStart(n).then(done);
    };
  }
  function done(d) { draw(d && d.ok ? "" : (d && d.error) || "That did not work."); }
  setInterval(function () { if (Class.room() !== lastRoom) { lastRoom = Class.room(); ready = false; draw(); } }, 800);
  draw();
};
