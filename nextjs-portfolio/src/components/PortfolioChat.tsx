"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatContext, ChatEvent, ChatMeta } from "@/lib/neo-types";
import { projectAliases } from "@/lib/neo/language";
import { personalInfo, projects } from "@/lib/data";
import styles from "./PortfolioChat.module.css";

type Message = { id: string; role: "user" | "assistant"; content: string; meta?: ChatMeta; error?: string };
const storageKey = "portfolio-neo-v2";
const topicStorageKey = "portfolio-neo-topic-v1";
const welcome: Message = { id: "welcome", role: "assistant", content: "Hi, I’m Neo. Ask me about Shivam’s projects, how they work, or the engineering behind them. I can point you to the code and architecture, too." };
const suggestions = ["What have you built?", "How does SecureVault encrypt data?", "Compare your realtime projects", "Show me your AI projects"];
const publicLinks = new Set([...Object.values(personalInfo), ...projects.flatMap((p) => [p.link, p.github, ...(p.links?.map((link) => link.href) ?? [])])].filter((value): value is string => typeof value === "string" && value.startsWith("https://")));

function messageContent(text: string) {
  return text.split(/(https:\/\/[^\s]+)/g).map((part, index) => {
    const url = part.replace(/[.,;!?)]+$/, "");
    return publicLinks.has(url) ? <span key={index}><a href={url} target="_blank" rel="noreferrer">{url}</a>{part.slice(url.length)}</span> : part;
  });
}

export default function PortfolioChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const followRef = useRef(true);
  const topicRef = useRef<ChatContext | undefined>(undefined);

  useEffect(() => {
    try {
      const topic = JSON.parse(sessionStorage.getItem(topicStorageKey) ?? "null");
      if (topic && Array.isArray(topic.projects) && topic.projects.length <= 6 && topic.projects.every((p: unknown) => typeof p === "string" && Object.hasOwn(projectAliases, p)) && typeof topic.question === "string" && topic.question.length <= 800) topicRef.current = topic;
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(saved) && saved.length <= 24 && saved.every((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.length <= 16000)) {
        // Saved content is untrusted. Restore plain text, never stored URLs/actions.
        setMessages([welcome, ...saved.map((m, i) => ({ id: `restored-${i}`, role: m.role, content: m.content }))]);
      }
    } catch { /* Storage may be blocked or invalid. Chat remains usable. */ }
    setRestored(true);
    return () => requestRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!restored || busy) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages.filter((m) => m.id !== "welcome" && m.content && !m.error).slice(-24).map(({ role, content }) => ({ role, content })))); } catch { /* Optional session history. */ }
  }, [messages, restored, busy]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => { if (window.matchMedia("(min-width: 601px)").matches) inputRef.current?.focus(); }, 0);
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector('[aria-modal="true"]')) {
        setIsOpen(false); launcherRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKeyDown); };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && followRef.current && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isOpen, busy]);

  function closeChat() { setIsOpen(false); launcherRef.current?.focus(); }

  function openProject(title: string, architecture = false) {
    const card = [...document.querySelectorAll<HTMLElement>("[data-project-title]")].find((el) => el.dataset.projectTitle === title);
    if (!card) return;
    closeChat(); card.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "center" });
    if (architecture) card.querySelector<HTMLButtonElement>(".architecture-trigger")?.click();
    else { card.tabIndex = -1; card.focus({ preventScroll: true }); }
  }

  async function send(text: string) {
    const question = text.trim(); if (!question || busy || question.length > 1200) return;
    const controller = new AbortController(); requestRef.current = controller;
    const id = crypto.randomUUID();
    const user: Message = { id: `${id}-user`, role: "user", content: question };
    const context = [...messages.filter((m) => m.id !== "welcome" && m.content && !m.error), user].slice(-9).map(({ role, content }) => ({ role, content: content.slice(0, role === "user" ? 1200 : 1400) }));
    setMessages((previous) => [...previous.slice(-23), user, { id, role: "assistant", content: "" }]);
    setDraft(""); setBusy(true); setAnnouncement("Neo is preparing a reply."); followRef.current = true;
    const update = (patch: Partial<Message>) => setMessages((previous) => previous.map((m) => m.id === id ? { ...m, ...patch } : m));
    let reply = ""; let complete = false;
    function accept(event: ChatEvent) {
      if (event.type === "meta") {
        update({ meta: event });
        topicRef.current = event.context;
        try { if (event.context) sessionStorage.setItem(topicStorageKey, JSON.stringify(event.context)); } catch { /* Optional topic memory. */ }
      }
      if (event.type === "delta") { reply += event.text; update({ content: reply }); }
      if (event.type === "replace") { reply = event.text; update({ content: reply }); }
      if (event.type === "error") update({ error: event.text });
      if (event.type === "done") complete = true;
    }
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: context, context: topicRef.current }), signal: controller.signal });
      if (!response.ok || !response.body) throw new Error("request");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let pending = "";
      try {
        while (true) {
          const { value, done } = await reader.read(); pending += decoder.decode(value, { stream: !done });
          const lines = pending.split("\n"); pending = done ? "" : lines.pop()!;
          for (const line of lines) if (line.trim()) accept(JSON.parse(line));
          if (done) break;
        }
      } finally { reader.releaseLock(); }
      if (!complete && !controller.signal.aborted) update({ error: "The connection ended early. You can retry your question." });
      setAnnouncement("Neo replied.");
    } catch {
      if (controller.signal.aborted) { update({ error: reply ? "Reply stopped." : "Request stopped." }); setAnnouncement("Reply stopped."); }
      else { update({ error: "Neo couldn’t connect. Please try again in a moment." }); setAnnouncement("Neo couldn’t connect."); }
    } finally { if (requestRef.current === controller) { requestRef.current = null; setBusy(false); } }
  }

  function clearChat() {
    requestRef.current?.abort(); requestRef.current = null; setBusy(false); setMessages([welcome]); setDraft(""); setAnnouncement("Conversation cleared.");
    topicRef.current = undefined;
    try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem(topicStorageKey); } catch { /* Optional storage. */ }
    inputRef.current?.focus();
  }

  return (
    <aside className={styles.widget} aria-label="Portfolio assistant">
      {hasOpened && (
        <section className={styles.panel} id="portfolio-chat" role="dialog" aria-labelledby="portfolio-chat-title" hidden={!isOpen}>
          <div className={styles.bar}>
            <div className={styles.identity}><span className={styles.indicator} aria-hidden="true" /><span id="portfolio-chat-title">neo<span className={styles.path}> / portfolio assistant</span></span></div>
            <div className={styles.windowControls}>
              <button type="button" className={styles.clear} aria-label="Clear conversation" onClick={clearChat}>↺</button>
              <button type="button" className={styles.close} aria-label="Close Neo chat" onClick={closeChat}>×</button>
            </div>
          </div>
          <div className={styles.messages} ref={scrollRef} role="log" aria-label="Conversation with Neo" aria-live="off" onScroll={(event) => { const el = event.currentTarget; followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 70; }}>
            <div className={styles.sessionLabel}><span aria-hidden="true">~/neo</span> project knowledge loaded</div>
            {messages.map((message) => (
              <article key={message.id} className={`${styles.message} ${message.role === "user" ? styles.userMessage : ""}`} aria-label={message.role === "user" ? "You" : "Neo"}>
                <div className={styles.messageLabel}>{message.role === "user" ? "you" : "neo"}<span>{message.meta ? message.meta.mode === "ai" ? "AI · source grounded" : "reviewed project notes" : ""}</span></div>
                {message.content && <p>{messageContent(message.content)}</p>}
                {!message.content && !message.error && <div className={styles.typing} aria-label="Preparing reply"><i /><i /><i /></div>}
                {message.error && <p className={styles.error} role="status">{message.error}</p>}
                {!!message.meta?.sources.length && <details className={styles.sources}><summary>Sources · {message.meta.sources.length}</summary><ol>{message.meta.sources.map((source, i) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">[S{i + 1}] {source.title}<span>{source.revision ? ` @ ${source.revision}` : ""} ↗</span></a></li>)}</ol></details>}
                {!!message.meta?.projects.length && <div className={styles.projectActions}>{message.meta.projects.slice(0, 3).map((project) => <div key={project.key}><button type="button" onClick={() => openProject(project.title)}>{project.title} ↗</button><button type="button" aria-label={`Open ${project.title} architecture`} onClick={() => openProject(project.title, true)}>system map →</button></div>)}</div>}
              </article>
            ))}
          </div>
          {messages.length === 1 && <div className={styles.suggestions} aria-label="Suggested questions">{suggestions.map((question) => <button key={question} type="button" disabled={busy} onClick={() => void send(question)}>{question} <span aria-hidden="true">↗</span></button>)}</div>}
          <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
            <label className={styles.srOnly} htmlFor="neo-question">Ask Neo about Shivam’s portfolio</label>
            <textarea ref={inputRef} id="neo-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask about a project…" maxLength={1200} rows={2} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(draft); } }} />
            <div className={styles.composerBottom}><span>{draft.length > 1000 ? `${draft.length}/1200` : "↵ send · shift + ↵ new line"}</span>{busy ? <button type="button" className={styles.send} aria-label="Stop reply" onClick={() => requestRef.current?.abort()}>■</button> : <button type="submit" className={styles.send} aria-label="Send question" disabled={!draft.trim()}>↑</button>}</div>
          </form>
          <div className={styles.statusLine}><span>Answers from reviewed project sources</span><a href="#contact" onClick={closeChat}>contact Shivam ↗</a></div>
          <span className={styles.srOnly} role="status">{announcement}</span>
        </section>
      )}
      <button ref={launcherRef} className={styles.launcher} type="button" aria-label={isOpen ? "Close Neo portfolio assistant" : "Ask Neo about my projects and experience"} aria-expanded={isOpen} aria-controls={hasOpened ? "portfolio-chat" : undefined} aria-haspopup="dialog" onClick={() => { if (isOpen) closeChat(); else { setHasOpened(true); setIsOpen(true); } }}>
        <span className={styles.prompt} aria-hidden="true">&gt;_</span><span>ask neo<span className={styles.launcherHint}> / AI</span></span><span className={styles.launcherMark} aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
    </aside>
  );
}
