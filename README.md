# ENGE3940 AI and Language: activities

Short browser activities for ENGE3940 AI and Language (The Chinese University of Hong Kong, Term 2, 2026–27).

- `docs/`: the pages. Plain HTML, one stylesheet, three small scripts. No build step and no libraries.
- `worker/`: the class service, a small Cloudflare Worker. A tutor opens a room and gets a four-letter code; students who type the code send their answers to the tutor's screen without names or accounts. A room deletes its answers after 12 hours, or when the tutor closes it.
- Chatbot responses are saved in the pages, with the model and date. The site calls no chatbot.
- Working alone, nothing a student types leaves the browser.

Each activity is one page in `docs/activities/`, with a small `.config.js` file that lists its questions for the class view.

Test locally: `npx wrangler@3 dev`. Deploy: `npx wrangler@3 deploy` (after `npx wrangler@3 login`).
