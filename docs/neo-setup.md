# Native Neo portfolio assistant

Neo is implemented in this repository. There is no Chatwith script, iframe, model training, vector database or paid search dependency. The React dock and Next.js API run with the portfolio. Inference uses a Groq account's free plan; Redis uses Upstash Free. Free tiers are limited and providers may change quotas. Keep the accounts on free plans; this app does not configure billing or provision paid services.

## Configuration

Use `nextjs-portfolio/.env.example` as the variable-name reference. Add actual values to `nextjs-portfolio/.env.local`, and to the existing Vercel project's environment settings when deploying. Never paste secrets into chat, commit them, or use `NEXT_PUBLIC_` for these credentials.

- `GROQ_API_KEY`: a valid key created in your Groq Free account.
- `GROQ_MODEL`: defaults to `qwen/qwen3.8-27b`. Check that your selected model is available on your account's free plan.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: the HTTPS REST endpoint and writable token of an Upstash Free database.
- `NEO_DAILY_TOKEN_BUDGET`: defaults to 40,000 conservative token reservations per UTC day, clamped to 500–60,000. This is an app-side guard, not a billing setting. Actual provider request/token limits still apply.

Restart `npm run dev` after editing local credentials. The development launcher loads project-local chat variables before Next.js, overriding stale machine-level chat credentials; production reads its configured Vercel environment. Run commands below from `nextjs-portfolio`:

```sh
npm run dev
npm run test:neo
npm run lint
npx tsc --noEmit
node scripts/audit-neo-sources.mjs
```

Only the portfolio server is required. The 12 showcased applications do not need to be running for Neo to answer from their reviewed sources.

## Source grounding

`src/lib/architectureData.ts` holds the existing reviewed architecture facts, caveats, flows and source paths, shared with architecture dialogs. `src/lib/neo-knowledge.ts` builds topic documents from those facts and portfolio profile/project data. It uses BM25 retrieval with boundary-aware aliases, balanced comparison evidence and bounded follow-up topic state. Nothing is scraped or executed during a visitor request.

`src/lib/neo-source-audit.json` records full commit hashes, checked source paths, review date and file verification for all 12 repositories. The original review verified 64 distinct source files underlying 81 components; the accuracy update expanded this to 72 files and added 32 line-linked evidence records. These snapshots do not claim every provider is currently deployed or healthy. Nexus also had local working-tree changes in the original architecture review; its overview explicitly discloses that basis. Its pinned files were checked separately.

To update knowledge, inspect changed implementation files, update the shared facts and caveats, then update the source revision/audit together. Do not automatically treat README marketing claims as verified behavior. Do not include environment files, private user data, keys, or raw scraped instructions in the corpus.

## Free-tier behavior

Common greetings, the project catalogue, and contact questions are answered from saved facts without a model call. Other questions retrieve up to six relevant records (eight for comparisons) and send a bounded context to Groq. Sources and project actions come from the server's curated registry, not model-generated URLs.

A single atomic Redis Lua operation checks a per-visitor minute limit (6), per-day limit (25), and the shared daily reservation budget before an inference request. Visitor identifiers are day-scoped hashes of platform-provided IPs. Reservations include all input UTF-8 bytes, message overhead and maximum output; cancelled/failed requests are not refunded. Messages are not stored in Redis. Output budgets are 500 tokens normally and 1,100 for detailed/comparison replies, included in the conservative reservation. No visitor IPs or question bodies are logged by this feature.

In development, local process counters are permitted when Redis is absent. In production, absent/unreachable Redis disables model calls and serves reviewed notes. Invalid model credentials, provider errors, or exhausted quotas also fall back to reviewed notes. Replies are labeled `AI · source grounded` or `reviewed project notes`; source notes are not presented as generated AI. No paid provider fallback is configured.

The public endpoint bounds body size, turn count and question length; accepts only user/assistant turns; checks browser Origin; and does not accept arbitrary URLs, tools or system prompts. The language model receives no API secrets. It can still make mistakes: source links and limitations remain visible. The fixed prompt instructs it to avoid inventing employment history, education, performance results or security guarantees.

## Interface and storage

The fully native terminal-themed dock supports streaming, Stop, clear history, suggestions, source citations, direct project navigation, architecture actions and mobile viewports. Messages are plain React text, with only known portfolio contact/application URLs linkified. A bounded project/topic hint is stored in the browser session for longer follow-ups; it is validated by the server and cleared with history. Session history is limited and stored only in the visitor's sessionStorage. Restored metadata/URLs are discarded. Clearing history removes the saved conversation; the app does not maintain a server conversation database. In AI mode, selected context and recent conversation are sent to Groq for inference.

## Verification on 2026-11-02

Initial provider checks used a stale inherited credential instead of the local file. The development launcher now explicitly gives local chat settings precedence. The supplied replacement key authenticated successfully. The retired Llama model was replaced with `qwen/qwen3.8-27b`, which was present in the account's model listing and Groq's free-plan table. Reasoning is disabled and hidden for this Qwen model so the response stream contains the final answer.

A real local streamed AI response was verified with source citations and completion events. Unit tests additionally cover malformed inputs, grounding, mocked streaming boundaries, provider failures, production fail-closed behavior, and the local environment precedence fix. Upstash returned PONG, and its actual atomic limiter allowed six requests and blocked the seventh for a dedicated test visitor. The four required provider/model/Redis settings were saved as sensitive production environment variables in the existing Vercel project. No credentials were printed or committed.

Documentation consulted: [Groq text generation](https://console.groq.com/docs/text-chat), [Groq rate limits](https://console.groq.com/docs/rate-limits), and [Upstash Redis REST](https://upstash.com/docs/redis/features/restapi). Firecrawl was used only during development research, not as a runtime paid dependency.

## Accuracy evaluation

See [neo-accuracy.md](neo-accuracy.md) for the source refresh, retrieval benchmark, live-pilot limits and known limitations. Invalid or missing model citation IDs trigger replacement with reviewed notes; this format check is not a semantic truth guarantee.
