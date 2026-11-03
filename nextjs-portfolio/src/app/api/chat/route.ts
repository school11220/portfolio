import { instantAnswer, notesAnswer } from "@/lib/neo-knowledge";
import { hasSharedLimits, reserveModelBudget } from "@/lib/neo-limits";
import { generationPlan, validReferences } from "@/lib/neo/generation";
import { projectAliases } from "@/lib/neo/language";
import type { ChatContext, ChatEvent, ChatTurn } from "@/lib/neo-types";

export const runtime = "nodejs";
export const maxDuration = 30;
const maxBytes = 18000;
const headers = { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };


async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > maxBytes) throw new Error("size");
  const reader = request.body?.getReader(); if (!reader) throw new Error("body");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > maxBytes) { await reader.cancel(); throw new Error("size"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function GET() {
  return Response.json({ mode: process.env.GROQ_API_KEY && (hasSharedLimits() || process.env.NODE_ENV !== "production") ? "ai" : "notes" }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Please use chat from this portfolio." }, { status: 403 });
  let messages: ChatTurn[];
  let hint: ChatContext | undefined;
  try {
    const body = await readBody(request);
    if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 9) throw new Error("messages");
    if (body.messages.some((m: ChatTurn) => !m || !["user", "assistant"].includes(m.role) || typeof m.content !== "string" || !m.content.trim() || m.content.length > 5000)) throw new Error("turn");
    messages = body.messages;
    if (body.context !== undefined) {
      const context = body.context;
      if (!context || !Array.isArray(context.projects) || context.projects.length > 6 || context.projects.some((key: unknown) => typeof key !== "string" || !Object.hasOwn(projectAliases, key)) || typeof context.question !== "string" || context.question.length > 800) throw new Error("context");
      hint = { projects: [...new Set<string>(context.projects)], question: context.question };
    }
    if (messages.at(-1)?.role !== "user" || messages.at(-1)!.content.length > 1200) throw new Error("question");
  } catch { return Response.json({ error: "Send a question of up to 1,200 characters." }, { status: 400 }); }
  const question = messages.at(-1)!.content.trim();
  const history = messages.slice(0, -1);
  const notes = notesAnswer(question, history, hint);
  const encoder = new TextEncoder();
  const fallback = () => new Response(new ReadableStream({ start(controller) {
    const events: ChatEvent[] = [{ type: "meta", mode: "notes", sources: notes.sources, projects: notes.projects, context: notes.context }, { type: "delta", text: notes.text }, { type: "done" }];
    for (const event of events) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
    controller.close();
  } }), { headers });
  if (instantAnswer(question) || !notes.documents.length || !process.env.GROQ_API_KEY) return fallback();
  const plan = generationPlan(question, history, notes.documents, hint);
  if (!plan.packed.documents.length) return fallback();
  // Reserve the complete bounded UTF-8 request plus the actual output budget.
  const estimated = plan.messages.reduce((n, m) => n + encoder.encode(m.content).length + 12, 0) + plan.maxTokens;
  const ip = (process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for") : request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim() ?? "local";
  if (!await reserveModelBudget(ip, estimated)) return fallback();
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal, AbortSignal.timeout(25000)]);
  let upstream: Response;
  try {
    upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: plan.model, ...plan.parameters, messages: plan.messages, stream: true, temperature: .1, max_completion_tokens: plan.maxTokens }),
      signal, cache: "no-store",
    });
    if (!upstream.ok || !upstream.body) { console.warn("neo.model.unavailable", { status: upstream.status }); await upstream.body?.cancel(); return fallback(); }
  } catch (error) { console.warn("neo.model.unavailable", { reason: error instanceof Error ? error.name : "unknown" }); return fallback(); }

  return new Response(new ReadableStream({
    async start(controller) {
      const send = (event: ChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const reader = upstream.body!.getReader(); const decoder = new TextDecoder();
      let pending = ""; let received = false; let finished = false; let answer = ""; let finishReason = "";
      try {
        send({ type: "meta", mode: "ai", sources: plan.packed.sources, projects: notes.projects.filter(p => plan.packed.documents.some(d => d.project === p.key)), context: notes.context });
        while (true) {
          const { value, done } = await reader.read();
          pending += decoder.decode(value, { stream: !done });
          const lines = pending.split("\n"); pending = done ? "" : lines.pop()!;
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim(); if (data === "[DONE]") { finished = true; continue; } if (!data) continue;
            const chunk = JSON.parse(data);
            if (chunk.error) throw new Error("stream");
            if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
            const text = chunk.choices?.[0]?.delta?.content;
            if (typeof text === "string" && text) { received = true; answer += text; send({ type: "delta", text }); }
          }
          if (done) break;
          if (pending.length > 64000) throw new Error("stream");
        }
        if (received && !finished) throw new Error("incomplete");
        if (!received || !validReferences(answer, plan.packed.sources.length)) {
          send({ type: "meta", mode: "notes", sources: notes.sources, projects: notes.projects, context: notes.context });
          send({ type: "replace", text: notes.text });
        } else if (finishReason === "length") send({ type: "error", text: "This reply reached its length limit. Ask a narrower question or ask Neo to continue." });
        send({ type: "done" });
      } catch {
        if (!request.signal.aborted) send({ type: "error", text: "The reply was interrupted. Please try again or explore the project sources below." });
      } finally {
        abort.abort(); reader.releaseLock();
        try { controller.close(); } catch { /* Consumer cancelled. */ }
      }
    },
    cancel() { abort.abort(); },
  }), { headers });
}
