// ENGE3940 class service.
// One "room" per class session. Students send answers without names or accounts.
// A room keeps its answers for 12 hours, or until the tutor closes it, then deletes them.
//
// Language models (Cloudflare Workers AI) are used under four rules:
//   1. The prompts are written here. Students never send a free prompt to a model.
//   2. Model calls only work inside a room a tutor opened.
//   3. Each room has a cap, so the day's free allowance cannot be used up by one room.
//   4. Model names are fixed below, because Cloudflare's list changes.

const ROOM_HOURS = 12;
const MAX_DEVICES = 400;      // per question
const MAX_QUESTIONS = 60;     // per room
const MAX_TEXT = 200;         // characters per answer
const LETTERS = "BCDFGHJKLMNPQRSTVWXZ"; // consonants only, so a code never spells a word

const EMBED_MODEL = "@cf/baai/bge-m3";                           // multilingual sentence embeddings
const TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";   // short written replies
const MAX_EMBED_PER_ROOM = 800;      // sentences placed on a map
const MAX_GENERATE_PER_ROOM = 80;    // short texts written by the model
const MAX_CHECKS_PER_DAY = 300;      // model test calls from the status page

// Fixed writing tasks. The tutor's screen can ask for one of these by name; nothing else.
const TASKS = {
  "m01-cold-reply": {
    system: "You are a chat assistant. Reply to the user's message in one or two sentences.",
    user: "It's cold in here.",
    max_tokens: 60,
  },
};

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

// Reduce sentence vectors to two numbers each (the first two principal components), for a map.
function project2d(vectors) {
  const n = vectors.length;
  if (n === 0) return [];
  if (n === 1) return [[0, 0]];
  const d = vectors[0].length;
  const mean = new Float64Array(d);
  for (const v of vectors) for (let j = 0; j < d; j++) mean[j] += v[j] / n;
  const X = vectors.map((v) => Float64Array.from(v, (x, j) => x - mean[j]));
  const comps = [];
  for (let c = 0; c < 2; c++) {
    let w = new Float64Array(d);
    for (let j = 0; j < d; j++) w[j] = Math.sin(j * (c + 1) * 12.9898) + 0.01; // fixed start, so the map is stable
    for (let it = 0; it < 40; it++) {
      const next = new Float64Array(d);
      for (const x of X) {
        let dot = 0;
        for (let j = 0; j < d; j++) dot += x[j] * w[j];
        for (let j = 0; j < d; j++) next[j] += dot * x[j];
      }
      for (const p of comps) { // keep it at right angles to the earlier component
        let dot = 0;
        for (let j = 0; j < d; j++) dot += next[j] * p[j];
        for (let j = 0; j < d; j++) next[j] -= dot * p[j];
      }
      let norm = 0;
      for (let j = 0; j < d; j++) norm += next[j] * next[j];
      norm = Math.sqrt(norm) || 1;
      for (let j = 0; j < d; j++) next[j] /= norm;
      w = next;
    }
    comps.push(w);
  }
  const pts = X.map((x) => comps.map((w) => { let dot = 0; for (let j = 0; j < d; j++) dot += x[j] * w[j]; return dot; }));
  const max = Math.max(1e-9, ...pts.map((p) => Math.max(Math.abs(p[0]), Math.abs(p[1]))));
  return pts.map((p) => [+(p[0] / max).toFixed(4), +(p[1] / max).toFixed(4)]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    // GET /api/check : used by the status page to test each part of the service
    if (url.pathname === "/api/check") {
      const stub = env.ROOMS.get(env.ROOMS.idFromName("CHECK"));
      const res = await stub.fetch("https://room/check");
      const d = await res.json();
      return json(Object.assign({ ok: true, colo: (request.cf && request.cf.colo) || "", country: (request.cf && request.cf.country) || "" }, d));
    }

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

    // GET /api/needs-password : does opening a room need the tutor password?
    if (url.pathname === "/api/needs-password") return json({ needed: !!env.TUTOR_PASSWORD });

    // /api/room/CODE/...
    const m = url.pathname.match(/^\/api\/room\/([A-Za-z]{4})\/(info|answer|results|moderate|close|map|generate)$/);
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
  constructor(state, env) {
    this.state = state;
    this.storage = state.storage;
    this.env = env;
    this.vectors = new Map(); // sentence -> vector, kept in memory while the room is active
  }

  async alarm() {
    await this.storage.deleteAll();
  }

  async embed(texts) {
    const out = [];
    for (let i = 0; i < texts.length; i += 50) {
      const res = await this.env.AI.run(EMBED_MODEL, { text: texts.slice(i, i + 50) });
      out.push(...res.data);
    }
    return out;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const action = url.pathname.slice(1);

    // The status page: test storage and one small model call. Not a room.
    if (action === "check") {
      const out = {};
      let t = Date.now();
      try {
        await this.storage.put("ping", t);
        out.storage = (await this.storage.get("ping")) === t ? "ok" : "failed";
      } catch (e) { out.storage = "failed"; }
      out.storage_ms = Date.now() - t;
      const day = new Date().toISOString().slice(0, 10);
      const used = (await this.storage.get("checks:" + day)) || 0;
      if (used >= MAX_CHECKS_PER_DAY) { out.model = "skipped"; }
      else {
        await this.storage.put("checks:" + day, used + 1);
        t = Date.now();
        try {
          const v = await this.embed(["Hello from the status page."]);
          out.model = v.length === 1 && v[0].length > 100 ? "ok" : "failed";
        } catch (e) { out.model = "failed"; }
        out.model_ms = Date.now() - t;
      }
      return json(out);
    }

    const meta = await this.storage.get("meta");

    if (action === "create") {
      if (meta) return json({ error: "taken" }, 409);
      const { key } = await request.json();
      await this.storage.put("meta", { key, created: Date.now(), questions: [], embedded: 0, generated: 0 });
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

    // GET map?q=..&device=.. : place the sentences sent for one question on a two-dimensional map.
    // The tutor gets the sentences with their positions. Students get positions only, with their own marked.
    if (action === "map") {
      const q = (url.searchParams.get("q") || "").slice(0, 40);
      const me = (url.searchParams.get("device") || "").slice(0, 40);
      const rec = await this.storage.get("a:" + q);
      if (!rec || rec.kind !== "text") return json({ ok: true, n: 0, points: [] });
      const entries = Object.entries(rec.answers);
      const stamp = q + "\u0002" + entries.map(([id, t]) => id + "\u0001" + t).join("\u0002");
      if (this.mapStamp !== stamp) {
        if (!this.env.AI) return json({ error: "No language model is set up." }, 503);
        const missing = [...new Set(entries.map(([, t]) => t).filter((t) => !this.vectors.has(t)))];
        if (missing.length) {
          if ((meta.embedded || 0) + missing.length > MAX_EMBED_PER_ROOM) return json({ error: "This room has reached its limit for the map." }, 429);
          let vecs;
          try { vecs = await this.embed(missing); } catch (e) { return json({ error: "The language model did not answer." }, 502); }
          missing.forEach((t, i) => this.vectors.set(t, vecs[i]));
          meta.embedded = (meta.embedded || 0) + missing.length;
          await this.storage.put("meta", meta);
        }
        this.mapXY = project2d(entries.map(([, t]) => this.vectors.get(t)));
        this.mapStamp = stamp;
      }
      const points = entries.map(([id, text], i) => {
        const p = { x: this.mapXY[i][0], y: this.mapXY[i][1] };
        if (isHost) p.text = text;
        if (me && id === me) p.mine = true;
        return p;
      });
      return json({ ok: true, n: points.length, points });
    }

    // POST generate {task} : the tutor's screen asks the model for one short text from a fixed task.
    if (action === "generate" && request.method === "POST") {
      if (!isHost) return json({ error: "Not allowed" }, 403);
      let b;
      try { b = JSON.parse(await request.text()); } catch (e) { return json({ error: "Bad request" }, 400); }
      const task = TASKS[b.task];
      if (!task) return json({ error: "No such task" }, 400);
      if (!this.env.AI) return json({ error: "No language model is set up." }, 503);
      if ((meta.generated || 0) >= MAX_GENERATE_PER_ROOM) return json({ error: "This room has reached its limit for model writing." }, 429);
      meta.generated = (meta.generated || 0) + 1;
      await this.storage.put("meta", meta);
      try {
        const res = await this.env.AI.run(TEXT_MODEL, {
          messages: [{ role: "system", content: task.system }, { role: "user", content: task.user }],
          max_tokens: task.max_tokens, temperature: 1,
        });
        return json({ ok: true, text: String(res.response || "").trim(), usage: res.usage || null, model: TEXT_MODEL });
      } catch (e) {
        return json({ error: "The language model did not answer." }, 502);
      }
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
