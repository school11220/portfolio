"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportArchitectureSvg } from "@/lib/architectureExport";
import styles from "./ProjectArchitecture.module.css";

type Node = { id: string; x: number; y: number; title: string; subtitle: string; detail: string; kind?: "secure" | "data" | "actor" | "system" };
type Edge = { from: string; to: string; label?: string; bend?: number };
type Flow = { name: string; description: string; nodes: string[]; edges: Edge[] };
type Architecture = { key: string; project: string; title: string; summary: string; caveat: string; width: number; height: number; nodes: Node[]; flows: Flow[] };

const architectures: Record<string, Architecture> = {
  market: {
    key: "market", project: "CROSS-MARKET DISCLOSURE ANALYSIS", title: "Research + retrieval architecture",
    summary: "The project separates its Next.js research dashboard, FastAPI endpoints, offline document pipeline, hosted vector data, and model providers.",
    caveat: "This repository describes a pilot. The checked-in corpus and benchmark are small; the README reports 32 documents and 128 benchmark chunks. Provider calls require configured credentials.", width: 1040, height: 560,
    nodes: [
      { id: "sources", x: 20, y: 60, title: "US + India sources", subtitle: "Disclosure text", kind: "data", detail: "The repo keeps raw and processed US and India disclosures, with company/market/document metadata. The corpus is curated for matched-company analysis." },
      { id: "pipeline", x: 240, y: 60, title: "Python data pipeline", subtitle: "Clean · chunk · embed", kind: "system", detail: "Scripts collect or expand raw source text, clean it, split it into chunks, and upsert embeddings and extraction results into Supabase." },
      { id: "web", x: 20, y: 360, title: "Next.js dashboard", subtitle: "Compare · risk · chat", kind: "actor", detail: "The frontend exposes market comparison, company documents, extracted risks/topics, financial snapshots, benchmark metrics, and a retrieval-grounded chat UI." },
      { id: "api", x: 240, y: 360, title: "FastAPI service", subtitle: "/api/documents · /api/chat", kind: "system", detail: "FastAPI serves document and metrics routes plus a chat endpoint. Chat embeds the question, retrieves matching chunks, then asks the generation model to answer from those sources." },
      { id: "gemini", x: 500, y: 60, title: "Gemini embeddings", subtitle: "768-dimensional vectors", kind: "secure", detail: "The project uses Gemini embedding calls for document and query vectors, reducing the model output to 768 dimensions to fit the configured pgvector schema." },
      { id: "groq", x: 500, y: 360, title: "Groq generation", subtitle: "Extraction · answer", kind: "secure", detail: "Groq is used for structured signal extraction and retrieval-grounded chat generation. The chat response includes the retrieved source chunks." },
      { id: "supabase", x: 830, y: 210, title: "Supabase + pgvector", subtitle: "Documents · chunks · results", kind: "data", detail: "PostgreSQL stores documents, chunk text and embeddings, extraction results, benchmark labels, and financial snapshots. Retrieval uses the match_chunks RPC." },
    ],
    flows: [
      { name: "Research chat", description: "FastAPI orchestrates query embedding, database retrieval, and Groq generation, then returns the answer and retrieved sources to the browser.", nodes: ["web", "api", "gemini", "supabase", "groq"], edges: [{ from: "web", to: "api", label: "question + market" }, { from: "api", to: "gemini", label: "embed query" }, { from: "gemini", to: "api", label: "query vector", bend: -48 }, { from: "api", to: "supabase", label: "match_chunks RPC" }, { from: "supabase", to: "api", label: "top source chunks", bend: -48 }, { from: "api", to: "groq", label: "question + chunks" }, { from: "groq", to: "api", label: "grounded answer", bend: -48 }, { from: "api", to: "web", label: "answer + sources", bend: -48 }] },
      { name: "Document ingestion", description: "Preparation scripts call model providers and write the returned embeddings and extraction results into Supabase. Dashboard reads go through FastAPI.", nodes: ["sources", "pipeline", "gemini", "groq", "supabase", "api", "web"], edges: [{ from: "sources", to: "pipeline", label: "raw disclosure text" }, { from: "pipeline", to: "gemini", label: "embed chunks" }, { from: "gemini", to: "pipeline", label: "vectors", bend: -48 }, { from: "pipeline", to: "groq", label: "extract signals" }, { from: "groq", to: "pipeline", label: "structured results", bend: -48 }, { from: "pipeline", to: "supabase", label: "upsert dataset" }, { from: "web", to: "api", label: "dashboard request" }, { from: "api", to: "supabase", label: "query stored analysis" }, { from: "api", to: "web", label: "documents + metrics", bend: -48 }] },
    ],
  },
  detection: {
    key: "detection", project: "HYBRID CNN + TRANSFORMER OBJECT DETECTION", title: "KITTI training + inference pipeline",
    summary: "This is a local PyTorch training/evaluation project rather than a hosted web service. The diagram follows image/label data through the two model variants and evaluation tools.",
    caveat: "The checked-out repository imports src.data for training and evaluation, but that module is absent from this checkout. Dataset behavior below is identified from its call sites and README, not an inspected implementation. Image inference also requires a trained checkpoint.", width: 1040, height: 560,
    nodes: [
      { id: "kitti", x: 20, y: 220, title: "KITTI dataset", subtitle: "image_2 · label_2", kind: "data", detail: "The importer prepares KITTI images and object labels in the expected training directory layout. The project supports a small Hugging Face subset for quick experiments and the official dataset path." },
      { id: "loader", x: 230, y: 220, title: "Dataset + loader contract", subtitle: "src.data import · missing", kind: "system", detail: "train.py imports KITTIDataset, split builders, and class-frequency helpers from src.data, then uses a PyTorch DataLoader. The src.data package is missing from this checkout, so the parsing/target-encoding implementation could not be verified." },
      { id: "backbone", x: 440, y: 220, title: "Shared CNN backbone", subtitle: "ResNet18 + channel adapter", kind: "system", detail: "CNNBackbone wraps ResNet18 with a 1×1 channel adapter. Both detector classes pool its output onto the configured grid. The constructor attempts pretrained weights and falls back to random initialization if unavailable." },
      { id: "baseline", x: 650, y: 60, title: "CNN baseline", subtitle: "Object · box · class head", kind: "data", detail: "The baseline predicts objectness, box offsets, and class logits from the shared convolutional representation without transformer context." },
      { id: "hybrid", x: 650, y: 360, title: "Hybrid detector", subtitle: "Transformer + gated refine", kind: "secure", detail: "The hybrid flattens grid features into tokens, adds positional embeddings, runs a Transformer encoder, then applies prediction and refinement heads. An uncertainty gate weights refinement near uncertain objectness values." },
      { id: "train", x: 440, y: 60, title: "Train + checkpoints", subtitle: "Loss · AdamW", kind: "system", detail: "src/train.py builds the configured model, dataset, losses, and AdamW optimizer, then saves the best checkpoint for evaluation and inference." },
      { id: "eval", x: 860, y: 220, title: "Decode + evaluate", subtitle: "NMS · mAP@0.5", kind: "data", detail: "Evaluation and inference decode grid predictions, apply confidence filtering and NMS, calculate mAP@0.5, and optionally draw boxes onto the input image." },
    ],
    flows: [
      { name: "Train + compare models", description: "The same KITTI preparation feeds a CNN baseline and the hybrid detector; comparison evaluates their outputs with the project’s detection metric.", nodes: ["kitti", "loader", "backbone", "baseline", "hybrid", "train", "eval"], edges: [{ from: "kitti", to: "loader", label: "images + labels" }, { from: "loader", to: "backbone", label: "batches + targets" }, { from: "backbone", to: "baseline", label: "CNN features" }, { from: "backbone", to: "hybrid", label: "CNN features" }, { from: "baseline", to: "train", label: "baseline loss" }, { from: "hybrid", to: "train", label: "hybrid loss" }, { from: "train", to: "eval", label: "best checkpoints" }] },
      { name: "Run image inference", description: "A trained checkpoint is loaded, one image is normalized, decoded into boxes, and saved as an annotated visualization.", nodes: ["kitti", "loader", "backbone", "hybrid", "eval"], edges: [{ from: "kitti", to: "loader", label: "image + class config" }, { from: "loader", to: "backbone", label: "normalized tensor" }, { from: "backbone", to: "hybrid", label: "grid features" }, { from: "hybrid", to: "eval", label: "checkpoint predictions" }] },
    ],
  },
  nexus: {
    key: "nexus", project: "NEXUS", title: "Organization-scoped workspace architecture",
    summary: "Nexus is implemented as a Next.js frontend and a Spring Boot modular monolith backed by PostgreSQL. Domain modules remain inside one backend deployment.",
    caveat: "The repository describes a Phase 1 vertical slice. Provider-backed features need their own credentials; the integrations screen reports readiness rather than faking unavailable providers.", width: 1040, height: 560,
    nodes: [
      { id: "member", x: 20, y: 220, title: "Workspace member", subtitle: "Sign in · choose org", kind: "actor", detail: "A member signs in and uses organization-scoped workspace features. Organization membership checks scope protected API operations." },
      { id: "frontend", x: 230, y: 220, title: "Next.js workspace", subtitle: "Chat · tasks · docs · forms", kind: "actor", detail: "The Next.js shell presents dashboard, chat, Kanban tasks, documents, calendar, forms, meetings, whiteboards, analytics, and settings." },
      { id: "auth", x: 440, y: 60, title: "Spring Security", subtitle: "Local JWT · optional Clerk", kind: "secure", detail: "Local email/password authentication uses BCrypt and signed access tokens. A configured Clerk JWT decoder provides an additional identity path; protected domain operations enforce organization membership." },
      { id: "api", x: 440, y: 360, title: "Spring Boot modular monolith", subtitle: "REST + domain modules", kind: "system", detail: "A single Spring Boot application hosts bounded-context modules for organizations, teams, chat, projects, tasks, documents, forms, calendars, notifications, and more." },
      { id: "realtime", x: 680, y: 60, title: "STOMP / WebSocket", subtitle: "/ws · /app · /topic", kind: "system", detail: "The backend provides a STOMP WebSocket foundation for realtime chat and collaboration events, alongside persisted REST workflows." },
      { id: "postgres", x: 830, y: 220, title: "PostgreSQL", subtitle: "Schemas · Flyway migrations", kind: "data", detail: "Docker Compose runs PostgreSQL. Flyway migrations establish bounded-context schemas, UUID IDs, audit timestamps, and soft-delete columns." },
      { id: "providers", x: 680, y: 360, title: "External providers", subtitle: "Storage · calendar · AI", kind: "secure", detail: "Integrations can connect external storage, OAuth calendar, email, and AI providers. Provider-backed actions depend on configured credentials and organization readiness." },
    ],
    flows: [
      { name: "Protected workspace request", description: "The browser calls the modular backend; token authentication and organization membership scope the database access before the API returns workspace data.", nodes: ["member", "frontend", "auth", "api", "postgres"], edges: [{ from: "member", to: "frontend", label: "workspace action" }, { from: "frontend", to: "auth", label: "access token" }, { from: "auth", to: "api", label: "authorize + scope" }, { from: "api", to: "postgres", label: "org-scoped query" }, { from: "postgres", to: "api", label: "domain records", bend: -48 }, { from: "api", to: "frontend", label: "workspace response", bend: -48 }] },
      { name: "Realtime collaboration", description: "REST persists core records while STOMP/WebSocket carries live collaboration and messaging updates to subscribed clients.", nodes: ["member", "frontend", "auth", "api", "realtime", "postgres"], edges: [{ from: "member", to: "frontend", label: "edit / message" }, { from: "frontend", to: "api", label: "REST write" }, { from: "api", to: "postgres", label: "persist state" }, { from: "frontend", to: "realtime", label: "STOMP session" }, { from: "api", to: "realtime", label: "publish updates" }, { from: "realtime", to: "frontend", label: "topic broadcast" }] },
    ],
  },
  securevault: {
    key: "securevault", project: "SECUREVAULT", title: "Client-side encryption architecture",
    summary: "Follow the app’s actual key and item paths. The server receives an encrypted item payload and its IV; encryption and decryption happen in the browser.",
    caveat: "The web app selects Supabase when configured, or an in-memory mock database without credentials. The auth store also contains demo-specific session behavior; the encryption map describes the item-data path rather than a production security certification.", width: 1040, height: 560,
    nodes: [
      { id: "user", x: 24, y: 205, title: "Vault user", subtitle: "Master password", kind: "actor", detail: "The user enters a master password during setup or unlock. The password is used locally to derive the vault key; the item write request does not include it." },
      { id: "ui", x: 210, y: 60, title: "Next.js vault UI", subtitle: "Add · view · search", kind: "system", detail: "Routes such as /vault/add and /vault load the vault experience. Zustand holds unlocked session state and decrypted items for the active browser session." },
      { id: "crypto", x: 210, y: 345, title: "Web Crypto", subtitle: "PBKDF2 → AES-256-GCM", kind: "secure", detail: "The source derives a non-extractable AES-GCM key with PBKDF2-SHA-256 (100,000 iterations). Each item gets a random 12-byte IV and is encrypted before the request is sent." },
      { id: "api", x: 470, y: 205, title: "Next.js API routes", subtitle: "Validate · persist · fetch", kind: "system", detail: "POST /api/vault checks userId, item type, ciphertext, and IV. GET returns the stored item records. Auth routes register and return the salt plus encrypted key verifier for client-side verification." },
      { id: "adapter", x: 690, y: 60, title: "vaultDB adapter", subtitle: "Supabase or mock", kind: "system", detail: "The server-side adapter selects Supabase when URL and key are configured; otherwise it selects the in-memory mock implementation. The active deployment depends on its environment." },
      { id: "db", x: 850, y: 345, title: "Storage", subtitle: "users · vault_items", kind: "data", detail: "The vault_items row stores item type, encrypted_data, IV, user ID, and timestamps. The user record stores a salt and encrypted verifier challenge; the master key is not stored there." },
      { id: "unlock", x: 470, y: 60, title: "Unlock check", subtitle: "Decrypt verifier locally", kind: "secure", detail: "Login returns the salt and encrypted verifier. The browser derives a candidate key and attempts to decrypt the verifier challenge before accepting the unlocked session." },
    ],
    flows: [
      { name: "Add + read a vault item", description: "Item content is encrypted in the browser, stored as ciphertext, then decrypted locally when the vault loads.", nodes: ["user", "ui", "crypto", "api", "adapter", "db"], edges: [{ from: "user", to: "ui", label: "enter item" }, { from: "ui", to: "crypto", label: "plaintext in browser" }, { from: "crypto", to: "api", label: "ciphertext + IV" }, { from: "api", to: "adapter", label: "validated record" }, { from: "adapter", to: "db", label: "persist" }, { from: "db", to: "adapter", label: "load encrypted rows", bend: -54 }, { from: "adapter", to: "api", label: "return records", bend: -54 }, { from: "api", to: "crypto", label: "return encrypted row", bend: -54 }, { from: "crypto", to: "ui", label: "decrypt locally", bend: -54 }] },
      { name: "Register + unlock", description: "The API stores the salt and encrypted challenge. A later unlock derives a candidate key and checks that challenge in the browser.", nodes: ["user", "ui", "crypto", "api", "adapter", "db", "unlock"], edges: [{ from: "user", to: "ui", label: "master password" }, { from: "ui", to: "crypto", label: "derive key" }, { from: "crypto", to: "api", label: "salt + encrypted verifier" }, { from: "api", to: "adapter", label: "account data" }, { from: "adapter", to: "db", label: "store verifier" }, { from: "db", to: "api", label: "salt + verifier", bend: -54 }, { from: "api", to: "unlock", label: "login response" }, { from: "unlock", to: "crypto", label: "verify locally", bend: -55 }] },
    ],
  },
  bb84: {
    key: "bb84", project: "BB84 QUANTUM MESSENGER", title: "Flask + Socket.IO messenger architecture",
    summary: "This map follows the actual Flask chat server, Socket.IO events, SQLAlchemy message store, and in-memory pair-key state in the repository.",
    caveat: "The repository does not implement quantum key distribution: bb84_protocol() hashes Python random values, and messages use repeating XOR. The send event also includes plaintext and the key. Treat this as an educational prototype, not secure end-to-end messaging. The portfolio’s BB84 table is a separate browser simulation.", width: 1040, height: 560,
    nodes: [
      { id: "sender", x: 20, y: 220, title: "Browser client", subtitle: "Static HTML + JS", kind: "actor", detail: "The client serves static chat pages and uses Socket.IO events to register users, fetch history, send messages, and update presence and message status." },
      { id: "server", x: 230, y: 220, title: "Flask + Socket.IO", subtitle: "HTTP routes + realtime", kind: "system", detail: "A Flask server serves the client and handles login, account, uploads, admin, and Socket.IO chat events using eventlet. It tracks online socket IDs in process memory." },
      { id: "keys", x: 440, y: 60, title: "Pair-key cache", subtitle: "Process-memory map", kind: "secure", detail: "get_shared_key() caches one generated value per sorted username pair in the server’s shared_keys dictionary. The cache is in server memory, not negotiated privately by the clients." },
      { id: "handler", x: 440, y: 360, title: "Message handler", subtitle: "Repeating XOR + Base64", kind: "system", detail: "The send_message handler XORs UTF-8 bytes against a repeating binary key, stores the Base64 result, then emits chat updates to connected clients." },
      { id: "db", x: 700, y: 60, title: "SQLAlchemy database", subtitle: "Users · groups · messages", kind: "data", detail: "SQLAlchemy models persist users, groups/memberships, messages, reactions, calls, invitations, and device sessions. The app selects a configured database URL or uses its local fallback." },
      { id: "eve", x: 700, y: 360, title: "Eavesdrop observer", subtitle: "Optional Socket.IO room", kind: "secure", detail: "The app has eavesdrop registration and BB84-themed Socket.IO events that can report captured measurements. This is application-level simulation state, not a quantum channel." },
      { id: "recipient", x: 850, y: 220, title: "Recipient client", subtitle: "Live event + history", kind: "actor", detail: "Online recipients receive a realtime event. Message history is fetched through the socket event handlers and decrypted by app code using the supplied pair key." },
    ],
    flows: [
      { name: "Send a chat message", description: "Socket.IO routes a message through the Flask handler, which stores an XOR/Base64 value and emits a payload to the recipient.", nodes: ["sender", "server", "keys", "handler", "db", "recipient"], edges: [{ from: "sender", to: "server", label: "send_message event" }, { from: "server", to: "keys", label: "get pair key" }, { from: "keys", to: "handler", label: "server-held key" }, { from: "handler", to: "db", label: "persist encoded message" }, { from: "handler", to: "recipient", label: "plaintext + key + encoded value" }] },
      { name: "BB84-themed intercept flow", description: "Separate Socket.IO handlers relay simulated qubits, measurements, basis reveals, and error results. The optional observer receives captured measurements through the Flask server.", nodes: ["sender", "server", "eve", "recipient"], edges: [{ from: "sender", to: "server", label: "bb84_qubits event" }, { from: "server", to: "eve", label: "capture measurements" }, { from: "server", to: "recipient", label: "forward simulated qubits" }, { from: "recipient", to: "server", label: "measurements / reveals", bend: -48 }, { from: "server", to: "sender", label: "relay protocol results", bend: -48 }] },
    ],
  },
  unix: {
    key: "unix", project: "UNIX SYSTEM UTILITY TOOLKIT", title: "Linux utility architecture",
    summary: "The Bash launcher routes to Zenity dialogs, system commands, terminal tasks, and compiled C helpers. Each utility touches a focused OS interface.",
    caveat: "The app requires a Linux desktop and system dependencies. Destructive or privileged operations such as process termination, service changes, or package upgrades depend on user confirmation and system permissions.", width: 1040, height: 560,
    nodes: [
      { id: "user", x: 24, y: 205, title: "Desktop user", subtitle: "Run a utility", kind: "actor", detail: "The user opens the launcher or selects a direct command-line option such as --process-manager or --network-monitor." },
      { id: "launcher", x: 210, y: 60, title: "unix.sh", subtitle: "Bash entry + routing", kind: "system", detail: "The shell entry point checks required tools, builds missing C helpers when possible, dispatches options, and presents the main Zenity menu." },
      { id: "zenity", x: 210, y: 345, title: "Zenity UI", subtitle: "Menus · forms · results", kind: "system", detail: "Zenity supplies the desktop menu, process table, confirmations, input dialogs, and scheduler results. Network monitoring and service operations open a terminal." },
      { id: "bash", x: 470, y: 60, title: "Shell utilities", subtitle: "uname · ip · sysfs · systemctl", kind: "system", detail: "Bash actions query OS information, locate the default network interface, sample RX/TX byte counters, search files, and list or control systemd services." },
      { id: "proc", x: 470, y: 345, title: "proc_manager.c", subtitle: "ps → validate → SIGTERM", kind: "secure", detail: "The C process manager parses a bounded list from ps, asks Zenity for a PID, validates the PID value, confirms termination, then sends SIGTERM and reports the result." },
      { id: "sched", x: 690, y: 60, title: "sched_sim.c", subtitle: "FCFS · SJF · Priority · RR", kind: "system", detail: "The C scheduler validates process inputs, calculates completion/waiting/turnaround metrics, and writes a Gantt sequence to an output file for the launcher to display." },
      { id: "os", x: 850, y: 345, title: "Linux system", subtitle: "procps · sysfs · systemd", kind: "data", detail: "System tools provide process snapshots and network counters. systemctl and apt actions depend on the host and may require elevated permissions." },
    ],
    flows: [
      { name: "Process manager", description: "A process listing passes through selection and validation; a confirmation dialog gates the SIGTERM call.", nodes: ["user", "launcher", "zenity", "proc", "os"], edges: [{ from: "user", to: "launcher", label: "launch" }, { from: "launcher", to: "zenity", label: "open process table" }, { from: "zenity", to: "proc", label: "selected PID" }, { from: "proc", to: "zenity", label: "confirm / report", bend: -54 }, { from: "proc", to: "os", label: "SIGTERM after confirm" }] },
      { name: "Network + scheduler", description: "The monitor samples interface counters once per second; the scheduler runs a C algorithm and displays its result file.", nodes: ["user", "launcher", "bash", "sched", "zenity", "os"], edges: [{ from: "user", to: "launcher", label: "choose tool" }, { from: "launcher", to: "bash", label: "monitor route" }, { from: "bash", to: "os", label: "read RX/TX counters" }, { from: "launcher", to: "sched", label: "validated inputs" }, { from: "sched", to: "zenity", label: "metrics + Gantt" }] },
    ],
  },
  movie: {
    key: "movie", project: "THEMOVIE", title: "Discovery + account architecture",
    summary: "The live app is a Next.js application: server routes fetch catalogue data, ranker code personalizes suggestions, Clerk handles sign-in, and PostgreSQL stores account features.",
    caveat: "The Python ML scripts prepare and evaluate artifacts offline; the active recommendation route imports JSON graphs and ranks them in Next.js. The older Flask recommendation description does not match this request-time path.", width: 1040, height: 560,
    nodes: [
      { id: "viewer", x: 20, y: 220, title: "Viewer", subtitle: "Discover · save · rate", kind: "actor", detail: "A signed-in viewer browses movies and TV, tracks episodes and watch history, manages lists, and provides positive or negative recommendation feedback." },
      { id: "next", x: 230, y: 220, title: "Next.js App Router", subtitle: "Pages + server routes", kind: "actor", detail: "The Next.js application renders the UI and handles same-origin API routes for catalogue, account features, feedback, sharing, groups, notifications, and recommendations." },
      { id: "clerk", x: 230, y: 60, title: "Clerk identity", subtitle: "Sign-in · webhooks", kind: "secure", detail: "Clerk provides the sign-in/sign-up flow. Webhooks and account recovery support migration and account-scoped features." },
      { id: "catalogue", x: 480, y: 60, title: "Catalogue service", subtitle: "TMDB · OMDb · TVmaze", kind: "system", detail: "Server-side catalogue helpers fetch movies and TV metadata from TMDB, with optional OMDb ratings/awards and TVmaze schedule enrichment. Responses use bounded in-memory caching." },
      { id: "ranker", x: 480, y: 360, title: "Recommendation ranker", subtitle: "Graph blend · taste profile", kind: "system", detail: "The /api/ai-recommend route loads committed recommendation graphs and search indexes, combines user seeds, negatives, exclusions, genres, and exploration controls, then ranks candidates in the Next.js server." },
      { id: "db", x: 810, y: 60, title: "PostgreSQL", subtitle: "Account-scoped data", kind: "data", detail: "The server opens a bounded pg Pool from DATABASE_URL for account feature storage, revision conflict checks, and durable user data. PostgreSQL migrations define account storage and discovery tables." },
      { id: "ml", x: 810, y: 360, title: "Offline ML workflow", subtitle: "Feedback · model artifacts", kind: "system", detail: "Python scripts prepare MovieLens/opt-in feedback data, train and evaluate candidate models, and publish static recommendation artifacts for the application to consume." },
    ],
    flows: [
      { name: "Discover + personalize", description: "The application gathers catalogue candidates and the current taste profile, then submits them to the server-side graph ranker. A browser ranker provides a fallback if that request fails.", nodes: ["viewer", "next", "catalogue", "ranker", "clerk"], edges: [{ from: "viewer", to: "next", label: "search + taste signals" }, { from: "next", to: "clerk", label: "account identity" }, { from: "next", to: "catalogue", label: "catalogue lookup" }, { from: "catalogue", to: "next", label: "fresh candidates", bend: -48 }, { from: "next", to: "ranker", label: "profile + candidates" }, { from: "ranker", to: "next", label: "ranked titles + reasons", bend: -48 }] },
      { name: "Save account data + improve models", description: "Account features persist in PostgreSQL; opt-in feedback is exported and evaluated offline before model artifacts are checked into the app.", nodes: ["viewer", "next", "clerk", "db", "ml", "ranker"], edges: [{ from: "viewer", to: "next", label: "save list / diary" }, { from: "next", to: "clerk", label: "resolve account" }, { from: "next", to: "db", label: "revisioned feature data" }, { from: "db", to: "ml", label: "opt-in export" }, { from: "ml", to: "ranker", label: "evaluated JSON graph" }] },
    ],
  },
  neo: {
    key: "neo", project: "NEO", title: "Voice command architecture",
    summary: "Neo is a single-process Python desktop assistant. It listens through a microphone, recognizes a phrase, dispatches to a Python action, and speaks a response.",
    caveat: "There is no web backend or application database in the repository. Several commands depend on Windows-specific executables or optional API keys; system actions run with the desktop user’s privileges.", width: 1040, height: 500,
    nodes: [
      { id: "user", x: 20, y: 200, title: "User", subtitle: "Voice command", kind: "actor", detail: "The user speaks a command into the microphone, such as opening a site, checking weather, adjusting volume, or requesting system information." },
      { id: "mic", x: 230, y: 200, title: "Speech input", subtitle: "Microphone → Google STT", kind: "system", detail: "take_command() captures audio with SpeechRecognition, adjusts for ambient noise, then calls the Google speech-recognition service to turn the utterance into text." },
      { id: "router", x: 440, y: 200, title: "Phrase dispatcher", subtitle: "main() command branches", kind: "system", detail: "The main loop lowercases recognized text and routes it through phrase matching to the corresponding function. Unmatched commands call an apology response." },
      { id: "actions", x: 650, y: 60, title: "Local Python actions", subtitle: "psutil · Tkinter · OS tools", kind: "secure", detail: "Python functions read system stats, launch apps, control audio/display, capture screen or camera, create QR codes, manage timers, and invoke supported operating-system commands." },
      { id: "services", x: 650, y: 340, title: "External services", subtitle: "Weather · news · search", kind: "system", detail: "Optional actions call external services or web apps for weather, news, translation, exchange rates, stocks, Wikipedia, Google search, and YouTube. Some features require API keys." },
      { id: "voice", x: 860, y: 200, title: "Spoken response", subtitle: "pyttsx3 text-to-speech", kind: "actor", detail: "The assistant uses pyttsx3 to speak status and response text back through the configured system voice." },
    ],
    flows: [
      { name: "Voice-to-action loop", description: "One desktop process recognizes each utterance, dispatches a matching function, and speaks the result.", nodes: ["user", "mic", "router", "actions", "services", "voice"], edges: [{ from: "user", to: "mic", label: "captured audio" }, { from: "mic", to: "router", label: "recognized text" }, { from: "router", to: "actions", label: "local task" }, { from: "router", to: "services", label: "web/API task" }, { from: "actions", to: "voice", label: "result / status" }, { from: "services", to: "voice", label: "service response" }] },
      { name: "System control action", description: "A recognized command can invoke local system controls, which act directly on the current desktop session.", nodes: ["user", "mic", "router", "actions", "voice"], edges: [{ from: "user", to: "mic", label: "speak request" }, { from: "mic", to: "router", label: "text command" }, { from: "router", to: "actions", label: "run OS function" }, { from: "actions", to: "voice", label: "confirm result" }] },
    ],
  },
  sms: {
    key: "sms", project: "SHIKSHAN COLLEGE MANAGEMENT SYSTEM", title: "Role-based college ERP architecture",
    summary: "The application uses Flask blueprints and server-rendered Jinja pages, with Flask-Login role checks and SQLAlchemy models over a configured relational database.",
    caveat: "The source selects PostgreSQL when DATABASE_URL/SUPABASE_DB_URL is configured and SQLite for local development. Account approval gates student/teacher access, and the admin controls the core records.", width: 1040, height: 500,
    nodes: [
      { id: "roles", x: 20, y: 200, title: "School roles", subtitle: "Admin · teacher · student", kind: "actor", detail: "Users authenticate into role-specific dashboards. Registrations can remain pending until the admin approves them." },
      { id: "templates", x: 230, y: 200, title: "Jinja + Bootstrap UI", subtitle: "Portals · charts · forms", kind: "actor", detail: "Flask renders server-side pages for admin, teacher, and student workflows. Chart.js visualizes attendance and performance data." },
      { id: "flask", x: 440, y: 200, title: "Flask blueprints", subtitle: "Auth · admin · fees · attendance", kind: "system", detail: "The app factory registers main, auth, admin, student, teacher, attendance, and fee blueprints. Global request handling checks CSRF tokens and role-specific routes require login." },
      { id: "models", x: 650, y: 60, title: "SQLAlchemy domain models", subtitle: "Users · classes · marks · fees", kind: "system", detail: "SQLAlchemy maps users and role profiles, departments, classes, subjects, timetables, attendance, marks, fees, library data, exams, and homework into relational records." },
      { id: "db", x: 850, y: 200, title: "SQLite / PostgreSQL", subtitle: "Local · Supabase hosted", kind: "data", detail: "Config normalizes DATABASE_URL or SUPABASE_DB_URL and uses PostgreSQL when configured; without either, the local setup falls back to SQLite." },
      { id: "analytics", x: 650, y: 340, title: "Reports + analytics", subtitle: "Trends · exports", kind: "system", detail: "Route handlers aggregate attendance and student performance for dashboards, attendance trends, and administrative reports." },
    ],
    flows: [
      { name: "Mark attendance", description: "A teacher session passes login and role checks, records attendance through the route layer, then updates the classroom dataset used by dashboards.", nodes: ["roles", "templates", "flask", "models", "db", "analytics"], edges: [{ from: "roles", to: "templates", label: "teacher session" }, { from: "templates", to: "flask", label: "CSRF-protected form" }, { from: "flask", to: "models", label: "role-authorized write" }, { from: "models", to: "db", label: "SQLAlchemy transaction" }, { from: "db", to: "analytics", label: "attendance history" }, { from: "analytics", to: "templates", label: "dashboard metrics" }] },
      { name: "Administer school records", description: "The admin portal manages academic records and role accounts through Flask routes backed by the same relational model layer.", nodes: ["roles", "templates", "flask", "models", "db"], edges: [{ from: "roles", to: "templates", label: "admin session" }, { from: "templates", to: "flask", label: "management action" }, { from: "flask", to: "models", label: "validate + authorize" }, { from: "models", to: "db", label: "persist records" }] },
    ],
  },
  attendify: {
    key: "attendify", project: "ATTENDIFY", title: "Clerk-backed attendance app architecture",
    summary: "The repository is an Express server delivering static HTML/CSS/JavaScript pages. Authenticated API handlers load and save account data through Clerk’s private user metadata.",
    caveat: "Attendance, subjects, timetable, profile, location, and settings are stored inside Clerk private metadata rather than a separate relational database. API behavior depends on configured Clerk keys.", width: 1040, height: 500,
    nodes: [
      { id: "student", x: 20, y: 200, title: "Student / teacher", subtitle: "Browser session", kind: "actor", detail: "The web client opens dashboard, subject, attendance, analytics, calendar, and profile screens for the signed-in person." },
      { id: "static", x: 230, y: 200, title: "Static web client", subtitle: "HTML · CSS · browser JS", kind: "actor", detail: "Express serves the application’s static pages and JavaScript. Browser code calls the /api endpoints and maintains small client preferences/state in localStorage." },
      { id: "clerk", x: 440, y: 60, title: "Clerk authentication", subtitle: "Signed user identity", kind: "secure", detail: "When both Clerk keys are configured, Clerk middleware validates sessions and provides the authenticated user ID. Otherwise protected application APIs reject unauthenticated requests." },
      { id: "express", x: 440, y: 340, title: "Express API", subtitle: "/api · auth guard", kind: "system", detail: "Express middleware applies JSON parsing, same-origin and request checks where required, then protected API routes call account, data, calendar, and calculator services." },
      { id: "services", x: 680, y: 60, title: "Domain services", subtitle: "Subjects · calendar · analytics", kind: "system", detail: "Service modules normalize attendance percentages and calendar state, analyze subjects, and perform user-scoped reads/writes for attendance, timetable, location, and account settings." },
      { id: "metadata", x: 850, y: 340, title: "Clerk private metadata", subtitle: "Per-user app state", kind: "data", detail: "DataService reads/writes the attendify object in Clerk privateMetadata. Calendar and preferences use separate attendify_calendar and attendify_settings metadata entries." },
    ],
    flows: [
      { name: "Attendance update", description: "A signed-in browser submits a subject attendance change; Express scopes the request to the authenticated Clerk user before storing the updated record.", nodes: ["student", "static", "clerk", "express", "services", "metadata"], edges: [{ from: "student", to: "static", label: "mark / inspect" }, { from: "static", to: "express", label: "authenticated API call" }, { from: "express", to: "clerk", label: "session middleware" }, { from: "clerk", to: "express", label: "authenticated user ID", bend: -48 }, { from: "express", to: "services", label: "user ID + validated data" }, { from: "services", to: "metadata", label: "update private metadata" }, { from: "metadata", to: "services", label: "account state", bend: -48 }, { from: "express", to: "static", label: "API response", bend: -48 }] },
      { name: "Calendar + preferences", description: "Calendar exclusions and settings use dedicated Clerk metadata records accessed through the same authenticated API boundary.", nodes: ["student", "static", "clerk", "express", "services", "metadata"], edges: [{ from: "student", to: "static", label: "calendar change" }, { from: "static", to: "clerk", label: "validated session" }, { from: "static", to: "express", label: "API request" }, { from: "express", to: "services", label: "calendar service" }, { from: "services", to: "metadata", label: "calendar + settings fields" }] },
    ],
  },
  eventhub: {
    key: "eventhub", project: "EVENTHUB", title: "Event ticket + check-in architecture",
    summary: "EventHub’s Next.js route handlers coordinate ticket registration, Razorpay payment verification, QR lookup, and check-in state with Prisma/PostgreSQL persistence.",
    caveat: "The PhonePe payment-creation helper is currently mocked. Database failures can fall back to temporary process-memory tickets. QR lookup and check-in writes are separate operations; the map does not imply atomic duplicate-entry enforcement.", width: 1040, height: 560,
    nodes: [
      { id: "guest", x: 20, y: 220, title: "Attendee / organizer", subtitle: "Register · manage event", kind: "actor", detail: "Attendees submit ticket registration for an event. Organizers manage events and staff workflows through the admin screens." },
      { id: "next", x: 230, y: 220, title: "Next.js UI + API", subtitle: "App Router handlers", kind: "actor", detail: "The Next.js app serves event and admin pages plus API route handlers for events, tickets, payment orders/callbacks, check-in, messages, reports, and certificates." },
      { id: "ticket", x: 450, y: 60, title: "Ticket workflow", subtitle: "Registration · status", kind: "system", detail: "Ticket routes validate attendee/event input, create pending or free tickets, track payment state, and generate ticket records. When database operations fail, some routes fall back to process-memory storage." },
      { id: "payments", x: 450, y: 360, title: "Payment handlers", subtitle: "Razorpay · mocked PhonePe", kind: "secure", detail: "Razorpay routes create provider orders and verify the returned payment signature before updating paid status and issuing an HMAC ticket token. The PhonePe creation helper immediately returns a mock-payment URL; its real request is commented out." },
      { id: "prisma", x: 680, y: 60, title: "Prisma data layer", subtitle: "Events · tickets · groups", kind: "system", detail: "Prisma maps events, tickets, groups, certificates, questions/polls, photos, and reviews to PostgreSQL." },
      { id: "db", x: 850, y: 220, title: "PostgreSQL", subtitle: "POSTGRES_PRISMA_URL", kind: "data", detail: "Event and ticket records persist in PostgreSQL through Prisma. The app’s ticketStorage Map is a temporary fallback and does not provide cross-instance durability." },
      { id: "scan", x: 680, y: 360, title: "QR scan + check-in", subtitle: "Record lookup · state write", kind: "system", detail: "ZXing decodes a QR code in the browser. GET /api/checkin looks up a stored ticket by ID or token and returns its status; POST writes checkedIn state and timestamp. This is distinct from cryptographic token verification and atomic duplicate prevention." },
    ],
    flows: [
      { name: "Paid ticket purchase", description: "Registration creates a ticket. The Razorpay verification route checks the returned signature, then stores paid state and an HMAC ticket token through Prisma.", nodes: ["guest", "next", "ticket", "payments", "prisma", "db"], edges: [{ from: "guest", to: "next", label: "event registration" }, { from: "next", to: "ticket", label: "create pending ticket" }, { from: "ticket", to: "prisma", label: "ticket record" }, { from: "prisma", to: "db", label: "persist ticket" }, { from: "next", to: "payments", label: "checkout + confirmation" }, { from: "payments", to: "prisma", label: "paid state + HMAC token" }] },
      { name: "Scan + check in", description: "A QR code resolves to stored ticket data. The UI can inspect returned status and submit a separate request to update checkedIn state.", nodes: ["guest", "next", "scan", "prisma", "db"], edges: [{ from: "guest", to: "next", label: "show QR ticket" }, { from: "next", to: "scan", label: "decode + lookup" }, { from: "scan", to: "prisma", label: "find ticket / write state" }, { from: "prisma", to: "db", label: "database operation" }, { from: "db", to: "prisma", label: "stored ticket", bend: -48 }, { from: "prisma", to: "scan", label: "lookup result", bend: -48 }, { from: "scan", to: "next", label: "scan response", bend: -48 }] },
    ],
  },
  editorial: {
    key: "editorial", project: "EDITORIAL", title: "Realtime document collaboration architecture",
    summary: "Editorial uses a React/Tiptap browser editor, an Express API, Socket.IO collaboration events, Yjs document updates, and Supabase Postgres persistence.",
    caveat: "The project supports Yjs collaboration with a legacy realtime fallback. Redis caching/pub-sub and external AI, auth, email, and notification providers are optional integrations configured by environment.", width: 1040, height: 560,
    nodes: [
      { id: "writer", x: 20, y: 220, title: "Collaborators", subtitle: "Edit · comment · share", kind: "actor", detail: "Users create or open documents, edit rich text, comment, manage folders, and share access through the web workspace." },
      { id: "frontend", x: 230, y: 220, title: "React + Tiptap", subtitle: "Vite · Yjs client", kind: "actor", detail: "The frontend uses Tiptap for rich-text editing and Yjs documents for conflict-safe collaborative updates. Socket.IO carries update and synchronization events." },
      { id: "auth", x: 230, y: 60, title: "Auth providers", subtitle: "Internal tokens · optional Clerk", kind: "secure", detail: "The backend accepts its internal token-based email auth and optionally supports Clerk sign-in. Auth middleware protects document and workspace APIs." },
      { id: "api", x: 470, y: 220, title: "Express API", subtitle: "Docs · folders · versions", kind: "system", detail: "The Node/Express server handles document, folder, comment, attachment, version, notification, integration, and AI endpoints, then checks access and persists domain records." },
      { id: "socket", x: 470, y: 60, title: "Socket.IO + Yjs", subtitle: "Sync · update · rooms", kind: "system", detail: "Socket handlers authorize document access, join collaboration rooms, send Yjs state on sync requests, and broadcast update messages to collaborators." },
      { id: "supabase", x: 710, y: 220, title: "Supabase Postgres", subtitle: "Docs · Yjs state · metadata", kind: "data", detail: "Supabase stores application records and persisted Yjs collaboration state. The backend uses the configured Supabase service key." },
      { id: "integrations", x: 850, y: 60, title: "Optional services", subtitle: "Redis · NVIDIA · email", kind: "secure", detail: "Redis provides optional cache/pub-sub, NVIDIA endpoints provide writing assistance and embeddings, and EmailJS or signed webhooks can deliver notifications to external tools." },
    ],
    flows: [
      { name: "Collaborative edit", description: "A local Yjs update is sent to the backend room, persisted as collaboration state, and broadcast to other authorized editors.", nodes: ["writer", "frontend", "auth", "api", "socket", "supabase"], edges: [{ from: "writer", to: "frontend", label: "edit document" }, { from: "frontend", to: "auth", label: "authenticated session" }, { from: "frontend", to: "socket", label: "Yjs update" }, { from: "socket", to: "supabase", label: "persist shared state" }, { from: "socket", to: "frontend", label: "broadcast to room" }, { from: "frontend", to: "api", label: "save metadata / version" }, { from: "api", to: "supabase", label: "authorized write" }] },
      { name: "AI writing assistance", description: "The editor submits selected writing context to a protected backend route; configured NVIDIA services return assistance to review in the document UI.", nodes: ["writer", "frontend", "auth", "api", "integrations", "supabase"], edges: [{ from: "writer", to: "frontend", label: "request suggestion" }, { from: "frontend", to: "auth", label: "authenticated request" }, { from: "frontend", to: "api", label: "selection + instruction" }, { from: "api", to: "integrations", label: "NVIDIA model request" }, { from: "integrations", to: "api", label: "suggestion response" }, { from: "api", to: "frontend", label: "reviewable result" }] },
    ],
  },
};

export const architectureKeyByProject = {
  "Cross-Market Disclosure Analysis": "market",
  "Hybrid CNN + Transformer Object Detection": "detection",
  Nexus: "nexus",
  "BB84 Quantum Messenger": "bb84",
  SecureVault: "securevault",
  TheMovie: "movie",
  Neo: "neo",
  "Shikshan - College Management System": "sms",
  Attendify: "attendify",
  EventHub: "eventhub",
  Editorial: "editorial",
  "UNIX System Utility Toolkit": "unix",
} as const;

const architectureSources: Record<string, Record<string, string>> = {
  market: { sources: "README.md", pipeline: "scripts/embed_and_store.py", web: "frontend/app/chat/page.tsx", api: "backend/app/routers/chat.py", gemini: "backend/app/services/gemini_service.py", groq: "backend/app/services/groq_service.py", supabase: "backend/schema.sql" },
  detection: { kitti: "scripts/import_kitti.py", loader: "src/train.py", backbone: "src/models/backbone.py", baseline: "src/models/baseline_cnn.py", hybrid: "src/models/hybrid_cnn_transformer.py", train: "src/train.py", eval: "src/infer.py" },
  nexus: { member: "frontend/app/login/page.tsx", frontend: "frontend/components/AppShell.tsx", auth: "backend/src/main/java/com/nexus/security/SecurityConfig.java", api: "backend/src/main/java/com/nexus/workspace/WorkspaceController.java", realtime: "backend/src/main/java/com/nexus/chat/WebSocketConfig.java", postgres: "backend/src/main/resources/db/migration/V1__foundation.sql", providers: "backend/src/main/java/com/nexus/enterprise/ProviderDiagnosticsController.java" },
  bb84: { sender: "static/chat.js", server: "app.py", keys: "app.py", handler: "app.py", db: "app.py", eve: "app.py", recipient: "static/chat.js" },
  securevault: { user: "app/vault/add/page.tsx", ui: "app/vault/page.tsx", crypto: "lib/crypto.ts", api: "app/api/vault/route.ts", adapter: "lib/supabase.ts", db: "lib/supabase.ts", unlock: "stores/authStore.ts" },
  movie: { viewer: "src/app/discover/page.tsx", next: "src/app/layout.tsx", clerk: "src/proxy.ts", catalogue: "src/lib/server/catalogue.ts", ranker: "src/app/api/ai-recommend/route.ts", db: "src/lib/server/db.ts", ml: "ml/train_feedback.py" },
  neo: { user: "neo.py", mic: "neo.py", router: "neo.py", actions: "neo.py", services: "neo.py", voice: "neo.py" },
  sms: { roles: "app/routes/auth.py", templates: "app/templates/base.html", flask: "app/__init__.py", models: "app/models.py", db: "config.py", analytics: "app/routes/admin.py" },
  attendify: { student: "public/index.html", static: "public/js/main.js", clerk: "app.js", express: "routes/api.js", services: "services/calendarService.js", metadata: "services/dataService.js" },
  eventhub: { guest: "app/event/[id]/page.tsx", next: "app/api/events/route.ts", ticket: "app/api/tickets/route.ts", payments: "app/api/razorpay/verify/route.ts", prisma: "lib/prisma.ts", db: "prisma/schema.prisma", scan: "app/api/checkin/route.ts" },
  editorial: { writer: "frontend/src/pages/Editor.tsx", frontend: "frontend/src/pages/Editor.tsx", auth: "backend/src/middleware/authMiddleware.ts", api: "backend/src/routes/docRoutes.ts", socket: "backend/src/sockets/index.ts", supabase: "backend/src/utils/yjsCollaboration.ts", integrations: "backend/src/controllers/aiController.ts" },
  unix: { user: "unix.sh", launcher: "unix.sh", zenity: "unix.sh", bash: "unix.sh", proc: "proc_manager.c", sched: "sched_sim.c", os: "unix.sh" },
};

const architectureReviews: Record<string, { repository: string; revision: string; workingTree?: boolean }> = {
  market: { repository: "Hrudai-Nirmal/MajorProject-new", revision: "ee61ca7" },
  detection: { repository: "shivam2931120/MajorProject", revision: "479934b" },
  nexus: { repository: "shivam2931120/Nexus", revision: "f322583", workingTree: true },
  bb84: { repository: "shivam2931120/bb8_messenger_app", revision: "9d1dd49" },
  securevault: { repository: "shivam2931120/SecureVault", revision: "02dad3d" },
  movie: { repository: "shivam2931120/TheMovie", revision: "d2240c7" },
  neo: { repository: "shivam2931120/Neo", revision: "7e12a12" },
  sms: { repository: "shivam2931120/sms", revision: "09a8732" },
  attendify: { repository: "shivam2931120/attendify", revision: "cf24ebf" },
  eventhub: { repository: "shivam2931120/EventHub", revision: "28effad" },
  editorial: { repository: "shivam2931120/realtime_collab", revision: "e3e8dac" },
  unix: { repository: "shivam2931120/unix_mini_project", revision: "3fb4edf" },
};

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
