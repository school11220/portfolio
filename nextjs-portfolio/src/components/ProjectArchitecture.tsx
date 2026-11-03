"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportArchitectureSvg } from "@/lib/architectureExport";
import styles from "./ProjectArchitecture.module.css";

import { architectures, architectureKeyByProject, architectureSources, architectureReviews, type Architecture, type Node, type Flow } from "@/lib/architectureData";

function ArchitectureCanvas({ architecture, flow, activeNodes, selected, onSelect, stepIndex }: { architecture: Architecture; flow: Flow; activeNodes: Set<string>; selected: Node; onSelect: (node: Node) => void; stepIndex: number | null }) {
  const nodes = new Map(architecture.nodes.map((node) => [node.id, node]));
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const zoomAnchor = useRef<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [exported, setExported] = useState(false);

  useEffect(() => {
    if (!autoFit || !viewportRef.current) return;
    const viewport = viewportRef.current;
    const observer = new ResizeObserver(() => {
      setZoom(Math.max(.2, Math.min((viewport.clientWidth - 24) / architecture.width, (viewport.clientHeight - 24) / architecture.height, 1.25)));
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [autoFit, architecture.width, architecture.height]);

  useLayoutEffect(() => {
    const anchor = zoomAnchor.current; const viewport = viewportRef.current; const svg = svgRef.current;
    if (!anchor || !viewport || !svg) return;
    const bounds = viewport.getBoundingClientRect(); const diagram = svg.getBoundingClientRect();
    viewport.scrollLeft += diagram.left + anchor.x * zoom - bounds.left - viewport.clientWidth / 2;
    viewport.scrollTop += diagram.top + anchor.y * zoom - bounds.top - viewport.clientHeight / 2;
    zoomAnchor.current = null;
  }, [zoom]);

  useEffect(() => {
    if (stepIndex === null || !viewportRef.current || !svgRef.current) return;
    const viewport = viewportRef.current;
    const target = svgRef.current.querySelector<SVGRectElement>(`[data-node-id="${flow.edges[stepIndex].to}"] rect`);
    if (!target) return;
    const bounds = viewport.getBoundingClientRect(); const node = target.getBoundingClientRect();
    if (viewport.scrollWidth > viewport.clientWidth) viewport.scrollLeft += node.left + node.width / 2 - bounds.left - viewport.clientWidth / 2;
    if (viewport.scrollHeight > viewport.clientHeight) viewport.scrollTop += node.top + node.height / 2 - bounds.top - viewport.clientHeight / 2;
  }, [stepIndex, flow, zoom]);

  const changeZoom = (nextZoom: number) => {
    const next = Math.max(.2, Math.min(3, nextZoom));
    if (next === zoom) return;
    const viewport = viewportRef.current; const svg = svgRef.current;
    if (viewport && svg) {
      const bounds = viewport.getBoundingClientRect(); const diagram = svg.getBoundingClientRect();
      zoomAnchor.current = { x: (bounds.left + viewport.clientWidth / 2 - diagram.left) / zoom, y: (bounds.top + viewport.clientHeight / 2 - diagram.top) / zoom };
    }
    setAutoFit(false); setZoom(next);
  };
  const fit = () => {
    const viewport = viewportRef.current;
    if (viewport) setZoom(Math.max(.2, Math.min((viewport.clientWidth - 24) / architecture.width, (viewport.clientHeight - 24) / architecture.height, 1.25)));
    setAutoFit(true);
  };
  const exportSvg = () => {
    if (!svgRef.current) return;
    const review = architectureReviews[architecture.key];
    exportArchitectureSvg(svgRef.current, {
      project: architecture.project, title: architecture.title, flow: flow.name, description: flow.description,
      repository: review.repository, revision: `${review.revision}${review.workingTree ? " + local working changes" : ""}`,
      note: architecture.caveat, step: stepIndex, width: architecture.width, height: architecture.height,
      steps: flow.edges.map((edge) => `${nodesLabel(architecture, edge.from)} → ${edge.label} → ${nodesLabel(architecture, edge.to)}`),
      sources: architecture.nodes.map((node) => `${node.title}: ${architectureSources[architecture.key][node.id]}`),
    });
    setExported(true);
  };

  return <div>
    <div className={styles.viewControls} role="group" aria-label="Diagram view controls">
      <button type="button" aria-label="Zoom out" disabled={zoom <= .2} onClick={() => changeZoom(zoom / 1.25)}>−</button>
      <output aria-label="Diagram zoom">{Math.round(zoom * 100)}%</output>
      <button type="button" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => changeZoom(zoom * 1.25)}>+</button>
      <button type="button" aria-pressed={autoFit} onClick={fit}>Fit to screen</button>
      <button type="button" onClick={() => changeZoom(1)}>100%</button>
      <button type="button" className={styles.exportButton} onClick={exportSvg}>↓ Export SVG</button>
      <span role="status">{exported ? "SVG downloaded" : ""}</span>
    </div>
    <div ref={viewportRef} className={`architecture-canvas-scroll ${styles.hiddenScrollbar} ${styles.viewport} ${dragging ? styles.dragging : ""}`} tabIndex={0} role="region" aria-label="Zoomable architecture diagram"
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" || event.button !== 0 || (event.target as Element).closest('.architecture-node')) return;
        event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
        pan.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        if (!pan.current) return;
        event.currentTarget.scrollLeft = pan.current.left - (event.clientX - pan.current.x);
        event.currentTarget.scrollTop = pan.current.top - (event.clientY - pan.current.y);
      }}
      onPointerUp={(event) => { pan.current = null; setDragging(false); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { pan.current = null; setDragging(false); }}
      onLostPointerCapture={() => { pan.current = null; setDragging(false); }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        const movement: Record<string, [number, number]> = { ArrowLeft: [-60, 0], ArrowRight: [60, 0], ArrowUp: [0, -60], ArrowDown: [0, 60] };
        if (movement[event.key]) { event.preventDefault(); event.currentTarget.scrollBy(...movement[event.key]); }
      }}>
      <div className={styles.stage}>
        <svg ref={svgRef} className={`architecture-canvas ${styles.diagram}`} style={{ width: architecture.width * zoom, height: architecture.height * zoom, minWidth: 0, maxWidth: "none" }} viewBox={`0 0 ${architecture.width} ${architecture.height}`} role="group" aria-label={`${architecture.project} architecture diagram`}>
          <defs><marker id="architecture-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#79bc8c" /></marker></defs>
          {flow.edges.map((edge, index) => {
            const from = nodes.get(edge.from); const to = nodes.get(edge.to); if (!from || !to) return null;
            const fromX = from.x + 82; const fromY = from.y + 52; const toX = to.x + 82; const toY = to.y + 52;
            const dx = toX - fromX; const dy = toY - fromY; const scale = 1 / Math.max(Math.abs(dx) / 84, Math.abs(dy) / 54, .001);
            const sx = fromX + dx * scale; const sy = fromY + dy * scale; const ex = toX - dx * scale; const ey = toY - dy * scale;
            const midX = (sx + ex) / 2; const midY = (sy + ey) / 2 + (edge.bend ?? 0);
            const current = stepIndex === index; const completed = stepIndex !== null && index < stepIndex;
            return <g key={`${edge.from}-${edge.to}-${index}`} data-step={index} className={`architecture-edge ${stepIndex === null || current ? "is-active" : ""}`} style={{ opacity: stepIndex === null || current ? 1 : completed ? .6 : .18 }}>
              <path d={`M ${sx} ${sy} Q ${midX} ${midY} ${ex} ${ey}`} markerEnd="url(#architecture-arrow)" style={stepIndex === null ? undefined : { stroke: current ? "#ffd27c" : "#79bc8c", strokeWidth: current ? 3 : 1.4, opacity: 1 }} />
              {current && <g><circle cx={(sx + 2 * midX + ex) / 4} cy={(sy + 2 * midY + ey) / 4} r="12" fill="#ffd27c" /><text x={(sx + 2 * midX + ex) / 4} y={(sy + 2 * midY + ey) / 4 + 4} textAnchor="middle" style={{ fill: "#071008", stroke: "none", font: "bold 11px monospace" }}>{index + 1}</text></g>}
            </g>;
          })}
          {architecture.nodes.map((node) => {
            const titleLines = wrapLabel(node.title, 18); const subtitleLines = wrapLabel(node.subtitle, 25);
            const current = stepIndex !== null && (flow.edges[stepIndex].from === node.id || flow.edges[stepIndex].to === node.id);
            return <g key={node.id} data-node-id={node.id} className={`architecture-node ${node.kind ?? ""} ${activeNodes.has(node.id) ? "is-active" : "is-muted"} ${selected.id === node.id ? "is-selected" : ""}`} style={selected.id === node.id ? { opacity: 1 } : undefined} role="button" tabIndex={0} aria-pressed={selected.id === node.id} aria-label={`${node.title}: ${node.subtitle}`} onClick={() => onSelect(node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(node); } }}>
              <rect x={node.x} y={node.y} width="164" height="104" rx="8" style={current ? { stroke: "#ffd27c", strokeWidth: 2, fill: "#232415" } : undefined} />
              <circle cx={node.x + 16} cy={node.y + 17} r="3" />
              <text className="architecture-node-title">{titleLines.map((line, index) => <tspan key={index} x={node.x + 14} y={node.y + (titleLines.length > 1 ? 34 : 44) + index * 15}>{line}</tspan>)}</text>
              <text className="architecture-node-subtitle">{subtitleLines.map((line, index) => <tspan key={index} x={node.x + 14} y={node.y + 70 + index * 11}>{line}</tspan>)}</text>
              <title>{node.detail}</title>
            </g>;
          })}
        </svg>
      </div>
    </div>
  </div>;
}

export default function ProjectArchitecture({ projectTitle }: { projectTitle: string }) {
  const projectKey = architectureKeyByProject[projectTitle as keyof typeof architectureKeyByProject];
  if (!projectKey) return null;
  return <ArchitectureDialog projectKey={projectKey} />;
}

function ArchitectureDialog({ projectKey }: { projectKey: keyof typeof architectures }) {
  const architecture = architectures[projectKey];
  const dialogRef = useRef<HTMLElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [flowIndex, setFlowIndex] = useState(0);
  const flow = architecture.flows[flowIndex];
  const [selectedId, setSelectedId] = useState(architecture.nodes[0].id);
  const [stepIndex, setStepIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(3500);
  const currentStep = stepIndex === null ? null : flow.edges[stepIndex];
  const activeNodes = useMemo(() => new Set(currentStep ? [currentStep.from, currentStep.to] : flow.nodes), [currentStep, flow]);
  const selected = architecture.nodes.find((node) => node.id === selectedId) ?? architecture.nodes[0];

  useEffect(() => {
    if (!isOpen || !isPlaying || stepIndex === null) return;
    const timeout = window.setTimeout(() => {
      if (stepIndex >= flow.edges.length - 1) { setIsPlaying(false); return; }
      const next = stepIndex + 1;
      setStepIndex(next); setSelectedId(flow.edges[next].to);
    }, playbackDelay);
    return () => window.clearTimeout(timeout);
  }, [isOpen, isPlaying, stepIndex, flow, playbackDelay]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setIsPlaying(false); setIsOpen(false); }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement | SVGElement>('a[href], button:not([disabled]), select, [tabindex="0"]');
      if (!focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKeys);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeys);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [isOpen]);

  const setFlow = (index: number) => { setFlowIndex(index); setSelectedId(architecture.flows[index].nodes[0]); setStepIndex(null); setIsPlaying(false); };
  const goToStep = (index: number) => {
    const next = Math.max(0, Math.min(flow.edges.length - 1, index));
    setStepIndex(next); setSelectedId(flow.edges[next].to); setIsPlaying(false);
  };
  const showOverview = () => { setStepIndex(null); setIsPlaying(false); };
  const togglePlayback = () => {
    if (isPlaying) { setIsPlaying(false); return; }
    if (stepIndex === null || stepIndex === flow.edges.length - 1) { setStepIndex(0); setSelectedId(flow.edges[0].to); }
    setIsPlaying(true);
  };

  return <>
    <button className="bb84-demo-link architecture-trigger" type="button" aria-haspopup="dialog" onClick={() => { setIsPlaying(false); setIsOpen(true); }}>-&gt; system architecture</button>
    {isOpen && createPortal(<div className="bb84-modal-backdrop architecture-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
      <section ref={dialogRef} className={`architecture-modal ${styles.hiddenScrollbar}`} role="dialog" aria-modal="true" aria-labelledby={`${architecture.key}-architecture-title`}>
        <div className="bb84-modal-top"><span id={`${architecture.key}-architecture-title`}>{architecture.project} / SYSTEM MAP</span><button type="button" aria-label="Close system architecture" onClick={() => setIsOpen(false)}>×</button></div>
        <div className="architecture-flows" role="group" aria-label="Architecture flows">{architecture.flows.map((item, index) => <button key={item.name} type="button" aria-pressed={flowIndex === index} className={flowIndex === index ? "active" : ""} onClick={() => setFlow(index)}>{item.name}</button>)}</div>
        <div className={styles.walkthrough}>
          <div className={styles.playbackControls} role="group" aria-label="Request walkthrough controls">
            <button type="button" onClick={() => goToStep(0)}>{stepIndex === null ? "Follow request" : "Restart"}</button>
            <button type="button" aria-label="Previous step" disabled={stepIndex === null || stepIndex === 0} onClick={() => goToStep((stepIndex ?? 0) - 1)}>← Back</button>
            <button type="button" aria-label={isPlaying ? "Pause walkthrough" : "Play walkthrough"} aria-pressed={isPlaying} onClick={togglePlayback}>{isPlaying ? "Ⅱ Pause" : "▶ Play"}</button>
            <button type="button" aria-label="Next step" disabled={stepIndex === null || stepIndex === flow.edges.length - 1} onClick={() => goToStep((stepIndex ?? 0) + 1)}>Next →</button>
            <button type="button" aria-pressed={stepIndex === null} onClick={showOverview}>Overview</button>
            <label>Pace <select aria-label="Walkthrough pace" value={playbackDelay} onChange={(event) => setPlaybackDelay(Number(event.target.value))}><option value={5000}>Slow · 5s</option><option value={3500}>Normal · 3.5s</option><option value={1500}>Fast · 1.5s</option></select></label>
          </div>
          <span className={styles.srOnly} role="status">{currentStep ? `Step ${(stepIndex ?? 0) + 1} of ${flow.edges.length}: ${nodesLabel(architecture, currentStep.from)} to ${nodesLabel(architecture, currentStep.to)}. ${currentStep.label}` : "Flow overview"}</span>
          <div className={styles.progress} aria-hidden="true"><div style={{ width: stepIndex === null ? "0%" : `${((stepIndex + 1) / flow.edges.length) * 100}%` }} /></div>
        </div>
        <ArchitectureCanvas architecture={architecture} flow={flow} activeNodes={activeNodes} selected={selected} stepIndex={stepIndex} onSelect={(node) => { setSelectedId(node.id); setIsPlaying(false); }} />
      </section>
    </div>, document.body)}
  </>;
}

function nodesLabel(architecture: Architecture, id: string) { return architecture.nodes.find((node) => node.id === id)?.title ?? id; }

function wrapLabel(label: string, maxLength: number) {
  const lines: string[] = [];
  for (const word of label.split(" ")) {
    const last = lines.length - 1;
    if (last >= 0 && `${lines[last]} ${word}`.length <= maxLength) lines[last] += ` ${word}`;
    else lines.push(word);
  }
  return lines;
}
