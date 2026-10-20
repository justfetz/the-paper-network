// Exercises the Worker's gates with a stub model: origin check, preflight, bad input, a tool round, the daily cap.
import { handle, sanitize } from "./worker.js";
const env = { ALLOWED_ORIGINS: "https://justfetz.github.io", DAILY_CAP: "2", CHAT_KV: { store: {}, async get(k) { return this.store[k]; }, async put(k, v) { this.store[k] = v; } } };
const client = { beta: { messages: { create: async (p) => { const last = p.messages[p.messages.length - 1];
  if (typeof last.content === "string") return { content: [{ type: "tool_use", id: "tu_1", name: "find_mill", input: { query: last.content } }], stop_reason: "tool_use", model: p.model, usage: { input_tokens: 10, output_tokens: 5 } };
  return { content: [{ type: "text", text: "Mansfield runs at 100%." }], stop_reason: "end_turn", model: p.model, usage: { input_tokens: 20, output_tokens: 8 } }; } } } };
const post = (body, origin = "https://justfetz.github.io") => handle(new Request("https://x.workers.dev/v1/chat", { method: "POST", headers: { Origin: origin, "content-type": "application/json" }, body: JSON.stringify(body) }), env, client);
let ok = 0, fail = 0; const check = (name, cond) => { (cond ? ok++ : fail++); console.log((cond ? "ok   " : "FAIL ") + name); };
check("preflight 204", (await handle(new Request("https://x.workers.dev/v1/chat", { method: "OPTIONS", headers: { Origin: "https://justfetz.github.io" } }), env, client)).status === 204);
check("wrong origin 403", (await post({ messages: [{ role: "user", content: "hi" }] }, "https://evil.example")).status === 403);
check("bad input 400", (await post({ messages: [{ role: "assistant", content: "x" }] })).status === 400);
let r = await post({ messages: [{ role: "user", content: "Mansfield" }] }); let j = await r.json(); check("round 1 returns a tool_use", r.status === 200 && j.content[0].type === "tool_use" && j.content[0].name === "find_mill");
r = await post({ messages: [{ role: "user", content: "Mansfield" }, { role: "assistant", content: j.content }, { role: "user", content: [{ type: "tool_result", tool_use_id: "tu_1", content: "{\"mill\":\"Mansfield\"}" }] }] }); j = await r.json(); check("round 2 returns text", r.status === 200 && j.content[0].type === "text");
r = await post({ messages: [{ role: "user", content: "again" }] }); check("daily cap 429 budget", r.status === 429 && (await r.json()).code === "budget");
check("sanitize drops unknown tool names", sanitize([{ role: "user", content: "q" }, { role: "assistant", content: [{ type: "tool_use", id: "t", name: "evil", input: {} }, { type: "text", text: "x" }] }], 14)[1].content.length === 1);
console.log(`${ok} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
