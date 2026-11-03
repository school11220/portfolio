# Neo accuracy changes — 2026-11-03

The improvement is to the application’s evidence and answer-generation pipeline, not a fine-tuned set of model weights. The free-tier configuration remains in place. The current Qwen model is retained; no unmeasured superiority claim is made for a larger model.

## Reviewed evidence

All twelve repositories were fetched at their pinned revisions. The source manifest now covers 72 distinct files. Thirty-two focused evidence records were added, with full commit SHA, source path, line range and exact code anchors. They cover implementation details, demo behavior, actual evaluation results and limitations. Only curated public facts are included, not environment files or raw repository instructions.

Examples include SecureVault’s persisted fields and demo unlock bypass, the detector’s uncertainty-gate formula, Nexus’s STOMP membership checks, disclosure sentiment metrics and AI-adjudicated label provenance, TheMovie’s small-cohort temporal evaluation, Editorial’s Yjs persistence/size bounds, and Shikshan’s attendance update logic. Reported metrics are attributed to the checked-in result/report files; they are not independently reproduced performance measurements.

`src/lib/neo/evidence.json` is the corpus. `scripts/audit-neo-sources.mjs` checks paths and code anchors against the pinned Git revisions. Updating a fact requires inspecting the source and updating its provenance, not merely changing a keyword.

## Retrieval and memory

- BM25 ranking uses corpus term frequencies and length normalization, with title/feature signals.
- Boundary-aware aliases recognize names such as “Secure Vault,” “college ERP” and “Linux utility suite.” The chatbot and the desktop Neo project are disambiguated.
- Follow-ups inspect earlier user turns and retain a bounded, server-validated project/topic hint. Comparisons balance both applications; a new named project resets the topic.
- Topic hints persist in the browser session alongside message history. They are retrieval hints, never factual evidence or permission to execute actions. Unknown identifiers are rejected; clear history clears both stores.
- Context packing keeps complete records and returns exactly the source IDs actually supplied to the model. It no longer cuts the last document midway through a fact.

## Answer behavior

The prompt asks for a direct answer before mechanisms and relevant limitations. It requires source support for implementation/numeric claims, distinguishes measurements from theories, and does not invent an author’s personal design rationale. Missing personal information and ambiguous Neo questions have deterministic responses.

Normal completions are bounded to 500 tokens, detailed/comparison completions to 1,100. Reservations include the actual selected output limit. The shared Redis quota guard is unchanged. Model answers with no citation IDs or out-of-range IDs are replaced with reviewed notes; this is a citation-format check, not proof that every cited claim is entailed. Truncated answers are labeled so they are not silently treated as complete.

## Deterministic evaluation

Run from `nextjs-portfolio`:

```sh
npm run test:neo
npm run eval:neo -- docs/neo-improved.json
```

The 48-question set covers twelve project overviews, detailed implementation questions, paraphrases, multi-hop follow-ups, comparisons and missing information. It was authored for these observed failure modes; it is not an independent held-out benchmark.

| Retrieval check | Before | After |
| --- | ---: | ---: |
| Cases satisfying all retrieval checks | 21 / 48 | 47 / 48 |
| Expected project scope | 38 / 48 | 48 / 48 |
| Required evidence markers retrieved | 70 / 102 | 101 / 102 |

These are deterministic retrieval/evidence-coverage results, **not an LLM answer accuracy percentage**. Reports are in `nextjs-portfolio/docs/neo-baseline.json` and `neo-improved.json`.

The remaining raw retrieval-marker failure asks for the author’s personal Java-vs-Go rationale. Such a rationale is not in the selected evidence. The assistant correctly abstains using a separate deterministic guard, and that behavior has a regression test; no rationale was fabricated merely to satisfy the retrieval metric.

## Live model pilot

`scripts/evaluate-neo-models.ts` makes a bounded optional evaluation through the same shared reservation guard. Two Qwen answers were generated and inspected against the supplied sources:

- TheMovie: exact NDCG/recall, lack of normalization improvement, and the 14/30-user cohort qualification were preserved.
- SecureVault: master-key non-persistence, reload derivation/verifier behavior and the demo bypass were preserved.

The guard declined the two GPT-OSS candidate calls. They are explicitly recorded as skipped in `nextjs-portfolio/docs/neo-model-pilot.json`. Therefore this run does not establish a model ranking, and no larger-model switch was justified. Evaluation does not bypass the free-tier protection or enable paid fallbacks.

The model can still make mistakes. Source citations, refusal of undocumented claims, regression tests and measured retrieval improvements reduce errors; they do not establish perfect factual accuracy on arbitrary questions.
