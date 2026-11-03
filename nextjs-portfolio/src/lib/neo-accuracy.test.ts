import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retrieve, notesAnswer, instantAnswer, packContext } from './neo-knowledge';
import { generationPlan, validReferences } from './neo/generation';
import { conversationTopic, mentionedProjects } from './neo/language';
import evidence from './neo/evidence.json';
import audit from './neo-source-audit.json';
import benchmark from './neo/benchmark.json';
import { POST } from '../app/api/chat/route';
test('every deeper evidence record has pinned file and line provenance', () => {
    assert.equal(evidence.length, 32);
    assert.equal(new Set(evidence.map(e => e.project)).size, 12);
    for (const e of evidence) {
        const review = audit[e.project as keyof typeof audit];
        const file = (review.files as Record<string, {
            verified: boolean;
            lines: number;
        }>)[e.file];
        assert.ok(file?.verified, e.id);
        assert.equal(e.revision, review.revision);
        assert.ok(e.startLine > 0 && e.endLine >= e.startLine && e.endLine <= file.lines, e.id);
        assert.ok(e.anchors.length > 0, e.id);
        assert.ok(!/\.env|\.pem|private.key/i.test(e.file), e.id);
    }
});
test('benchmark retrieves all expected project scopes and at least 100 source facts', () => {
    let covered = 0;
    for (const c of benchmark) {
        const history = (c.history ?? []).map(m => ({ role: 'user' as const, content: m.content }));
        const r = retrieve(c.question, history);
        const text = r.documents.map(d => d.text).join('\n');
        for (const key of c.projects)
            assert.ok(r.projects.some(p => p.key === key), c.id + ': ' + key);
        covered += c.facts.filter(pattern => new RegExp(pattern, 'is').test(text)).length;
    }
    assert.ok(covered >= 100, `Only ${covered} facts covered`);
});
test('boundary aliases avoid confusing the chatbot with desktop Neo', () => {
    assert.deepEqual(mentionedProjects('Tell me about Secure Vault'), ['securevault']);
    assert.deepEqual(mentionedProjects('the college ERP'), ['sms']);
    assert.deepEqual(mentionedProjects('Neo, who are you?'), []);
    assert.deepEqual(mentionedProjects('desktop Neo voice assistant'), ['neo']);
    assert.match(instantAnswer('Tell me about Neo')!, /Do you mean/);
    assert.match(instantAnswer("What was Shivam's GPA?")!, /don’t have verified/);
    assert.match(instantAnswer('Why did Shivam personally choose Java instead of Go for Nexus?')!, /don’t have a verified record/);
});
test('multi-hop followups preserve project and reset for a new topic', () => {
    const h = [{ role: 'user' as const, content: 'Explain SecureVault' }, { role: 'user' as const, content: 'How does it unlock?' }];
    assert.deepEqual(retrieve('And after refreshing the page?', h).projects.map(p => p.key), ['securevault']);
    const persisted = { projects: ['movie'], question: 'Explain TheMovie recommendation graph' };
    const follow = retrieve('Does it retrain after every watch?', [], persisted);
    assert.ok(follow.documents.some(d => /does not retrain/.test(d.text)));
    assert.deepEqual(conversationTopic('Now explain Attendify', h, persisted).focus, ['attendify']);
    assert.deepEqual(conversationTopic('How can I contact Shivam?', h, persisted).focus, []);
    assert.deepEqual(conversationTopic('What about the verifier?', h).focus, ['securevault']);
    assert.ok(conversationTopic('How does it store data?', []).needsClarification);
});
test('comparisons include both the remembered and newly named project', () => {
    const r = retrieve('How does that compare to Editorial?', [], { projects: ['nexus'], question: 'Explain Nexus collaboration' });
    assert.deepEqual(new Set(r.projects.map(p => p.key)), new Set(['nexus', 'editorial']));
});
test('packing preserves complete evidence and citation/source alignment', () => {
    const r = retrieve('Compare the disclosure project and the KITTI detector', []);
    const packed = packContext(r.documents, 4000);
    assert.ok(packed.text.length <= 4000);
    assert.equal(packed.documents.length, packed.sources.length);
    for (const [i, d] of packed.documents.entries()) {
        assert.ok(packed.text.includes(`[S${i + 1}] ${d.title}\n${d.text}`));
        assert.equal(packed.sources[i].id, d.id);
    }
});
test('detailed answers receive a larger bounded completion budget', () => {
    const q = 'How does SecureVault encrypt data?';
    const docs = retrieve(q, []).documents;
    const normal = generationPlan(q, [], docs);
    const detailed = generationPlan('Explain SecureVault encryption step by step in detail', [], docs);
    assert.equal(normal.maxTokens, 500);
    assert.equal(detailed.maxTokens, 1100);
    assert.ok(validReferences('Uses AES [S1].', normal.packed.sources.length));
    assert.ok(!validReferences('Unsupported [S999].', normal.packed.sources.length));
    assert.ok(!validReferences('No source attached.', normal.packed.sources.length));
});
test('API rejects invented project identifiers in persisted topic state', async () => {
    const response = await POST(new Request('http://localhost/api/chat', { method: 'POST', body: JSON.stringify({ messages: [{ role: 'user', content: 'And what next?' }], context: { projects: ['__proto__'], question: 'ignored' } }) }));
    assert.equal(response.status, 400);
});
test('uncited or invalidly cited model output is replaced with reviewed notes', async () => {
    const env = { ...process.env };
    const original = globalThis.fetch;
    try {
        Object.assign(process.env, { NODE_ENV: 'development', GROQ_API_KEY: 'test-only' });
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;
        for (const answer of ['An unsupported claim.', 'Unsupported claim [S999].']) {
            globalThis.fetch = async () => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: answer } }] })}\n\ndata: [DONE]\n\n`);
            const response = await POST(new Request('http://localhost/api/chat', { method: 'POST', headers: { 'x-forwarded-for': 'accuracy-test' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'How does SecureVault encrypt data?' }] }) }));
            const events = (await response.text()).trim().split('\n').map(s => JSON.parse(s));
            assert.equal(events.filter(e => e.type === 'meta').at(-1).mode, 'notes');
            assert.match(events.find(e => e.type === 'replace').text, /AES|PBKDF2/);
            assert.equal(events.at(-1).type, 'done');
        }
    }
    finally {
        process.env = env;
        globalThis.fetch = original;
    }
});
test('topic hints survive notes mode without accepting assistant assertions as facts', () => {
    const answer = notesAnswer('What if it reloads?', [], { projects: ['securevault'], question: 'SecureVault master key' });
    assert.deepEqual(answer.context.projects, ['securevault']);
    assert.ok(answer.context.question.length <= 800);
    assert.ok(answer.sources.every(s => s.url.startsWith('https://github.com/')));
});
