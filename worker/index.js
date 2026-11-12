// ENGE3940 class service.
// One "room" per class session. Students send answers without names or accounts.
// A room keeps its answers for 12 hours, or until the tutor closes it, then deletes them.

const ROOM_HOURS = 12;
const MAX_DEVICES = 400;      // per question
const MAX_QUESTIONS = 60;     // per room
const MAX_TEXT = 200;         // characters per answer
const LETTERS = "BCDFGHJKLMNPQRSTVWXZ"; // consonants only, so a code never spells a word

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Host-Key, X-Tutor-Password",
  "Access-Control-Max-Age": "86400",
};
function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ "Content-Type": "application/json", "Cache-Control": "no-store" }, CORS),
  });
}
function randomCode() {
  const a = new Uint8Array(4);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => LETTERS[n % LETTERS.length]).join("");
}
function randomKey() {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => n.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // POST /api/room : open a new room. If the TUTOR_PASSWORD secret is set, only tutors can do this.
    if (url.pathname === "/api/room" && request.method === "POST") {
      if (env.TUTOR_PASSWORD && request.headers.get("X-Tutor-Password") !== env.TUTOR_PASSWORD) {
        return json({ error: "Wrong tutor password." }, 401);
      }
      for (let i = 0; i < 6; i++) {
        const code = randomCode();
        const key = randomKey();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const res = await stub.fetch("https://room/create", { method: "POST", body: JSON.stringify({ key }) });
        if (res.status === 200) return json({ code, key, hours: ROOM_HOURS });
      }
      return json({ error: "Could not open a room. Try again." }, 503);
    }

    // /api/room/CODE/...
    // GET /api/needs-password : does opening a room need the tutor password?
    if (url.pathname === "/api/needs-password") return json({ needed: !!env.TUTOR_PASSWORD });

    const m = url.pathname.match(/^\/api\/room\/([A-Za-z]{4})\/(info|answer|results|moderate|close)$/);
    if (!m) return json({ error: "Not found" }, 404);
    const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1].toUpperCase()));
    return stub.fetch("https://room/" + m[2] + url.search, {
      method: request.method,
      headers: { "X-Host-Key": request.headers.get("X-Host-Key") || "" },
      body: request.method === "POST" ? await request.text() : undefined,
    });
  },
};

export class Room {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
  }

  async alarm() {
    await this.storage.deleteAll();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.slice(1);
    const meta = await this.storage.get("meta");

    if (action === "create") {
      if (meta) return json({ error: "taken" }, 409);
      const { key } = await request.json();
      await this.storage.put("meta", { key, created: Date.now(), questions: [] });
      await this.storage.setAlarm(Date.now() + ROOM_HOURS * 3600 * 1000);
      return json({ ok: true });
    }
    if (!meta) return json({ error: "No such room. Check the code." }, 404);
    const isHost = request.headers.get("X-Host-Key") === meta.key;

    if (action === "info") return json({ ok: true });

    if (action === "answer" && request.method === "POST") {
      let b;
      try { b = JSON.parse(await request.text()); } catch (e) { return json({ error: "Bad request" }, 400); }
      const q = String(b.q || "").slice(0, 40);
      const device = String(b.device || "").slice(0, 40);
      const kind = ["choice", "word", "text"].includes(b.kind) ? b.kind : "choice";
      let v = String(b.v === undefined ? "" : b.v).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
      if (kind === "word") v = v.toLowerCase().replace(/[.,!?;:"“”]+$/g, "").slice(0, 40);
      if (!q || !device || !v) return json({ error: "Bad request" }, 400);
      if (!meta.questions.includes(q)) {
        if (meta.questions.length >= MAX_QUESTIONS) return json({ error: "Room is full" }, 429);
        meta.questions.push(q);
        await this.storage.put("meta", meta);
      }
      const rec = (await this.storage.get("a:" + q)) || { kind, answers: {} };
      if (!(device in rec.answers) && Object.keys(rec.answers).length >= MAX_DEVICES) return json({ error: "Room is full" }, 429);
      rec.answers[device] = v; // one answer per device per question; a new answer replaces the old one
      await this.storage.put("a:" + q, rec);
      return json({ ok: true });
    }

    if (action === "results") {
      const qs = (url.searchParams.get("q") || "").split(",").filter(Boolean).slice(0, MAX_QUESTIONS);
      const out = {};
      for (const q of qs) {
        const rec = await this.storage.get("a:" + q);
        const mod = (await this.storage.get("m:" + q)) || { hide: [], show: [] };
        if (!rec) { out[q] = { n: 0, counts: {}, items: [] }; continue; }
        const entries = Object.entries(rec.answers);
        if (rec.kind === "text") {
          // Longer text goes to the tutor first. The room only sees what the tutor has chosen to show.
          const items = entries.map(([id, text]) => ({ id: id.slice(0, 8), text, shown: mod.show.includes(id.slice(0, 8)) }));
          out[q] = { kind: "text", n: entries.length, items: isHost ? items : items.filter((i) => i.shown) };
        } else {
          const counts = {};
          for (const [, v] of entries) {
            if (mod.hide.includes(v) && !isHost) continue;
            counts[v] = (counts[v] || 0) + 1;
          }
          out[q] = { kind: rec.kind, n: entries.length, counts, hidden: isHost ? mod.hide : undefined };
        }
      }
      return json({ ok: true, results: out });
    }

    if (action === "moderate" && request.method === "POST") {
      if (!isHost) return json({ error: "Not allowed" }, 403);
      const b = JSON.parse(await request.text());
      const q = String(b.q || "").slice(0, 40);
      const mod = (await this.storage.get("m:" + q)) || { hide: [], show: [] };
      if (Array.isArray(b.hide)) mod.hide = b.hide.map(String).slice(0, 200);
      if (Array.isArray(b.show)) mod.show = b.show.map(String).slice(0, 200);
      await this.storage.put("m:" + q, mod);
      return json({ ok: true });
    }

    if (action === "close" && request.method === "POST") {
      if (!isHost) return json({ error: "Not allowed" }, 403);
      await this.storage.deleteAll();
      await this.storage.deleteAlarm();
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  }
}
