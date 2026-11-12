// Questions of the Meeting 1 activity, shared by the student page and the class view.
window.ACTIVITY = {
  id: "m01",
  title: "Read a response closely",
  page: "activities/meeting-01-read-closely.html",
  questions: [
    { id: "m01-predict", type: "choice", title: "“What five-letter word becomes longer when you add two letters to it?” What do you expect a chatbot to answer?",
      options: { a: "“Short”, the answer to the well-known riddle", b: "Any five-letter word", c: "It will say that no word fits", d: "Something else" }, pretend: ["a", "b", "b", "b", "c", "c", "d"] },
    { id: "m01-summary", type: "choice", title: "Response 1 (“it becomes shorter”): which question does it answer?",
      options: { a: "Our version: a word that becomes longer", b: "The well-known riddle: a word that becomes shorter", c: "Neither" }, pretend: ["a", "b", "b", "b", "b", "c"] },
    { id: "m01-phrase", type: "shade", title: "Response 2: which part shows best how the chatbot read your question?",
      parts: { p1: "Short", p2: "— add “er” to it and you get “shorter,” which is literally a longer word (seven letters instead of five),", p3: "even though it means the opposite!", p4: "That’s the twist on the classic riddle, which usually asks what word becomes shorter when you add two letters —", p5: "same answer either way." }, pretend: ["p1", "p2", "p2", "p4", "p4", "p4", "p5", "p5", "p5", "p3"] },
    { id: "m01-first", type: "choice", title: "Response 3: which answer comes first?",
      options: { a: "The answer to the well-known riddle", b: "The answer to our version" }, pretend: ["a", "b", "b", "b"] },
    { id: "m01-card", type: "text", title: "Practice reading cards",
      pretend: ["“You might be thinking” · assumption · It guesses what I had in mind.", "“Technically” · hedge · It makes the answer sound less sure.", "“the classic trick riddle” · stock phrase · It gives the riddle a name.", "“any five-letter word!” · something else · It sounds pleased with its answer.", "“You might be” · form of address · It talks to me directly.", "“The answer to that one” · assumption · It answers a question I did not ask."] }
  ]
};
