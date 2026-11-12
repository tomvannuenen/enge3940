// Meeting 10 game: tug of war. What the tutor's screen shows.
window.ACTIVITY = {
  id: "m10",
  title: "Tug of war",
  page: "activities/meeting-10-tug-of-war.html",
  questions: [
    { id: "m10-result", type: "choice", title: "Did your chatbot agree with your side?",
      options: { "1": "Yes, after 1 message", "2": "Yes, after 2 messages", "3": "Yes, after 3 messages", "never": "It never agreed" } },
    { id: "m10-pair", type: "choice", title: "Pairs: two students, opposite sides, the same question",
      options: { both: "Both chatbots agreed", one: "One agreed", neither: "Neither agreed" } },
    { id: "m10-quote", type: "text", title: "Sentences where a chatbot agreed" }
  ]
};
