import { writeFileSync } from 'node:fs';
import { retrieve } from '../src/lib/neo-knowledge';
import { generationPlan } from '../src/lib/neo/generation';
import { reserveModelBudget } from '../src/lib/neo-limits';
const questions = [
    { id: 'movie-results', question: 'What NDCG and recall did TheMovie report, and did normalization improve it?' },
    { id: 'vault-unlock', question: 'Does SecureVault persist the master key across refreshes and is there a demo bypass?' },
];
async function main() {
    const results = [];
    for (const model of ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b'])
        for (const test of questions) {
            const found = retrieve(test.question, []);
            const plan = generationPlan(test.question, [], found.documents.slice(0, 2), undefined, model);
            const outputTokens = model.startsWith('openai/') ? 1100 : 500;
            const cost = plan.messages.reduce((n, m) => n + Buffer.byteLength(m.content) + 12, 0) + outputTokens;
            if (!await reserveModelBudget('neo-model-evaluation', cost)) {
                results.push({ model, id: test.id, skipped: 'Shared quota guard declined evaluation' });
                continue;
            }
            const start = performance.now();
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, ...plan.parameters, messages: plan.messages, temperature: .1, max_completion_tokens: outputTokens, stream: false }), signal: AbortSignal.timeout(25000) });
            const data = await response.json();
            results.push({ model, id: test.id, question: test.question, status: response.status, elapsedMs: Math.round(performance.now() - start), answer: data.choices?.[0]?.message?.content ?? '', finishReason: data.choices?.[0]?.finish_reason, errorCode: data.error?.code, usage: data.usage, sources: plan.packed.sources });
            console.log(model, test.id, response.status, results.at(-1)?.elapsedMs, 'ms');
        }
    writeFileSync('docs/neo-model-pilot.json', JSON.stringify({ evaluatedAt: new Date().toISOString(), scope: 'Small qualitative pilot: two fixed questions per model, not a general benchmark or a training run', results }, null, 2) + '\n');
}
main().catch(e => { console.error('Evaluation failed:', e.name); process.exitCode = 1; });
