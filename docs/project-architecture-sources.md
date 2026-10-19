# Portfolio architecture source review

The portfolio maps describe the inspected application code. Reviewed revisions and component source paths are preserved in SVG export metadata. The popups show the graph and its controls; component details are available as hover tooltips. These are source architecture snapshots; provider configuration and deployed infrastructure were not inferred from the portfolio technology tags.

| Project | Inspected repository | Revision | Primary implementation evidence |
| --- | --- | --- | --- |
| Cross-Market Disclosure Analysis | Hrudai-Nirmal/MajorProject-new | ee61ca7 | FastAPI routers, retrieval/Gemini/Groq services, `backend/schema.sql`, ingestion scripts |
| Hybrid CNN + Transformer Object Detection | shivam2931120/MajorProject | 479934b | `src/train.py`, `src/models/`, `src/infer.py`, metrics and loss utilities |
| Nexus | shivam2931120/Nexus | f322583 plus existing local working changes | Spring security/auth, controllers, STOMP configuration, migrations, Next.js workspace |
| BB84 Quantum Messenger | shivam2931120/bb8_messenger_app | 9d1dd49 | `app.py` routes/models/socket handlers and `static/chat.js` |
| SecureVault | shivam2931120/SecureVault | 02dad3d | Browser crypto, vault routes, auth store, Supabase/mock adapter |
| TheMovie | shivam2931120/TheMovie | d2240c7 | Next.js catalogue/account/recommendation routes, PostgreSQL pool, Python offline ML scripts |
| Neo | shivam2931120/Neo | 7e12a12 | `neo.py` speech input, phrase dispatcher, local actions, provider calls, speech output |
| Shikshan | shivam2931120/sms | 09a8732 | Flask app factory/blueprints, Flask-Login, Jinja templates, SQLAlchemy models/config |
| Attendify | shivam2931120/attendify | cf24ebf | Express entry, protected API routes, static browser client, Clerk private metadata services |
| EventHub | shivam2931120/EventHub | 28effad | Next.js ticket/payment/check-in routes, Prisma schema, ticket fallback, QR scanner |
| Editorial | shivam2931120/realtime_collab | e3e8dac | React/Tiptap editor, Express auth/routes, Socket.IO, Yjs persistence, Supabase schema |
| UNIX Utility Toolkit | shivam2931120/unix_mini_project | 3fb4edf | Bash launcher/system commands, `proc_manager.c`, `sched_sim.c`, Zenity calls |

## Important distinctions found in the code

- **Vision project:** training and evaluation import `src.data`, but the package is absent from the checked-out repository. The map marks that contract as missing rather than inventing its implementation. The shared backbone is ResNet18 with a channel adapter; the hybrid model adds positional tokens, a Transformer encoder, and uncertainty-gated refinement.
- **BB84:** the application architecture is Flask/Socket.IO and SQLAlchemy. Its server-managed hash-derived pair keys and repeating XOR message path are separate from the BB84-themed socket demonstration and the portfolio's React simulation. This is an educational prototype, not an end-to-end cryptography claim.
- **SecureVault:** item content is encrypted in the browser with PBKDF2-derived AES-GCM keys. The server adapter selects Supabase or a mock implementation. The diagram describes this data path without treating demo session behavior as a production authentication design.
- **TheMovie:** request-time recommendations run in the Next.js route using imported graphs and live candidates. Python prepares/evaluates artifacts offline. There is no active Flask inference server in that route.
- **Attendify:** the inspected app uses Express and browser JavaScript; application records are stored in Clerk private user metadata. The previous `attendance-tracker` GitHub URL returned repository-not-found. The publicly accessible `attendify` repository matches the local checkout, and the deployed signed-out homepage matched `views/home.html` byte for byte during review. The card source URL was corrected accordingly.
- **EventHub:** Razorpay has an order and signature-verification route. PhonePe creation currently returns a mock payment URL. QR record lookup and check-in writes are separate operations, and some failed database paths use an in-memory fallback; the map does not claim atomic duplicate-entry enforcement.
- **Nexus:** the local working tree already contained changes. Its export metadata explicitly labels this basis instead of presenting those changes as a pinned GitHub revision.

## Verification scope

Source inspection covered entry points, request/event handlers, persistence code, and configured provider paths for every listed project. Source references are checked against the inspected files. Portfolio verification covers opening each popup, selecting both flows, selecting components, checking exported source references, keyboard closing/focus behavior, and a mobile viewport. This review does not claim that every external provider or every application workflow was exercised in production.

## Walkthrough, view, and export controls

- Walkthrough steps use the existing reviewed flow edges and transfer labels. Starting, stepping, and timed playback highlight that edge and its source/destination components. Screen readers receive the current transfer, and component details remain available through SVG hover tooltips. Flow changes return to the overview.
- Playback can pause, restart, and use three reading speeds. Closing the popup cancels its active playback timer.
- Each diagram initially fits its viewport. Zoom controls support 20–300%, native 100%, and fit-to-screen. Dragging empty space, touch scrolling, or arrow keys on the focused diagram pans an enlarged view. Scrollbars remain hidden.
- SVG export captures the displayed flow state at the diagram's native coordinate size, independently of its on-screen zoom. It resolves the diagram's styles and adds the flow steps, component source paths, reviewed revision, and implementation note. The download is generated locally in the browser and requires no image service or external fonts.
- Project card descriptions and tags were aligned with the same reviewed source snapshots; outdated React-only Attendify, online Flask recommendation, end-to-end BB84 encryption, and atomic EventHub duplicate-prevention claims were removed.

## Graph-focused presentation

Architecture dialogs omit introductory copy, provenance banners, written step lists, inspector panels, and implementation-note blocks. Project identity, flow selection, compact playback controls, zoom, export, and the graph remain visible. Source context and caveats remain in this document and in exported SVG metadata.
