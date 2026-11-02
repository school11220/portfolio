"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PortfolioChat.module.css";

// Chatwith's iframe embed uses the same agent as the supplied launcher script.
// Owning the launcher avoids duplicate buttons and keeps placement in our theme.
const CHAT_URL = "https://chatwith.tools/embed/94d4b3d5-6af2-4aef-a88b-5ebf0fc9fd89?theme=dark";

export default function PortfolioChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  function closeChat() {
    setIsOpen(false);
    launcherRef.current?.focus();
  }

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !document.querySelector('[aria-modal="true"]')) {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    }
    function onMessage(event: MessageEvent) {
      if (event.origin !== "https://chatwith.tools" || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.closeChat) {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("message", onMessage);
    };
  }, [isOpen]);

  return (
    <aside className={styles.widget} aria-label="Portfolio assistant">
      {hasOpened && (
        <section className={styles.panel} id="portfolio-chat" role="dialog" aria-labelledby="portfolio-chat-title" hidden={!isOpen}>
          <div className={styles.bar}>
            <div className={styles.identity}>
              <span className={styles.indicator} aria-hidden="true" />
              <span id="portfolio-chat-title">neo<span className={styles.path}> / portfolio assistant</span></span>
            </div>
            <button ref={closeRef} type="button" className={styles.close} aria-label="Close Neo chat" onClick={closeChat}>×</button>
          </div>
          <div className={styles.content}>
            {!loaded && <div className={styles.loading} role="status"><span aria-hidden="true">&gt;_</span> Connecting to Neo…</div>}
            <iframe
              ref={frameRef}
              src={CHAT_URL}
              title="Chat with Neo about Shivam’s portfolio"
              className={styles.frame}
              onLoad={() => setLoaded(true)}
              allow="clipboard-write"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className={styles.statusLine}>
            <span>projects · skills · experience</span>
            <a href={CHAT_URL} target="_blank" rel="noreferrer" aria-label="Open Neo chat in a new tab">open tab ↗</a>
          </div>
        </section>
      )}
      <button
        ref={launcherRef}
        className={styles.launcher}
        type="button"
        aria-label={isOpen ? "Close Neo portfolio assistant" : "Ask Neo about my projects and experience"}
        aria-expanded={isOpen}
        aria-controls={hasOpened ? "portfolio-chat" : undefined}
        aria-haspopup="dialog"
        onClick={() => { if (isOpen) closeChat(); else { setHasOpened(true); setIsOpen(true); } }}
      >
        <span className={styles.prompt} aria-hidden="true">&gt;_</span>
        <span>ask neo<span className={styles.launcherHint}> / AI</span></span>
        <span className={styles.launcherMark} aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
    </aside>
  );
}
