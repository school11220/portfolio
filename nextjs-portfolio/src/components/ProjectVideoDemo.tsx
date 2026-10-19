"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ProjectVideoDemoProps = {
  title: string;
  src: string;
  poster: string;
};

export default function ProjectVideoDemo({ title, src, poster }: ProjectVideoDemoProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <>
      <button className="bb84-demo-link" type="button" aria-haspopup="dialog" onClick={() => setIsOpen(true)}>
        -&gt; video demo
      </button>
      {isOpen && createPortal(
        <div className="bb84-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <section className="project-video-modal" role="dialog" aria-modal="true" aria-labelledby="project-video-title">
            <div className="bb84-modal-top">
              <span id="project-video-title">{title}</span>
              <button type="button" aria-label="Close video demo" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <video className="project-video-player" src={src} poster={poster} autoPlay loop muted playsInline controls preload="metadata" />
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
