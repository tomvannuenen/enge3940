// Questions of the Meeting 1 activity, shared by the student page and the class view.
window.ACTIVITY = {
  id: "m01",
  title: "Read a response closely",
  page: "activities/meeting-01-read-closely.html",
  questions: [
    { id: "m01-predict", type: "choice", title: "What do you expect the chatbot to answer?",
      options: { a: "The boy’s father", b: "The boy’s mother", c: "It will say the question is wrong", d: "Something else" } },
    { id: "m01-summary", type: "choice", title: "Which sentence sums up the response best?",
      options: { a: "The surgeon is the boy’s mother.", b: "The surgeon is the boy’s father, and the well-known riddle has a different answer.", c: "The question cannot be answered." } },
    { id: "m01-phrase", type: "shade", title: "Which part says most about the person who asked?",
      parts: { p1: "You answered the riddle in your own question!", p2: "Based on the way you wrote the prompt,", p3: "the surgeon is the boy’s father.", p4: "However, in the classic version of this riddle (which usually starts with “A father and son are in a car accident...”), the answer is the boy’s mother (or his other father)." } },
    { id: "m01-first", type: "choice", title: "Second response: which answer comes first?",
      options: { a: "The answer to the well-known riddle", b: "The answer to our version" } },
    { id: "m01-card", type: "text", title: "Practice reading cards" }
  ]
};
