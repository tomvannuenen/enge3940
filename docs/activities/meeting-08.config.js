// Meeting 8 game: agree or rewrite. What the tutor's screen shows.
(function () {
  var six = { "0": "0 of 6", "1": "1 of 6", "2": "2 of 6", "3": "3 of 6", "4": "4 of 6", "5": "5 of 6", "6": "6 of 6" };
  window.ACTIVITY = {
    id: "m08",
    title: "Agree or rewrite",
    page: "activities/meeting-08-agree-or-rewrite.html",
    questions: [
      { id: "m08-r1", type: "choice", title: "Round 1, with the criterion “The message is good”: how many did each pair agree on?", options: six, pretend: ["2", "3", "3", "3", "4", "4", "5"] },
      { id: "m08-r2", type: "choice", title: "Round 2, with the pair’s own criterion: how many did each pair agree on?", options: six, pretend: ["4", "5", "5", "5", "6", "6", "3"] },
      { id: "m08-criterion", type: "text", title: "The criteria pairs wrote", pretend: ["The message says what the student wants in the first sentence.", "The message is polite but not too long.", "The teacher can answer with yes or no.", "The message gives a reason for the request.", "The message uses the teacher's name and a clear subject.", "The message does not sound like a template."] }
    ]
  };
})();
