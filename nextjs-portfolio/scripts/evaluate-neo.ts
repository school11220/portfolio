import { writeFileSync } from 'node:fs';
import { retrieve, notesAnswer, instantAnswer } from '../src/lib/neo-knowledge';
import cases from '../src/lib/neo/benchmark.json';
type BenchmarkCase = {
    id: string;
    question: string;
    projects: string[];
    facts: string[];
    history?: {
        role: string;
        content: string;
    }[];
    abstain?: boolean;
};
const results = (cases as BenchmarkCase[]).map(c => {
    const history = (c.history ?? []).map(m => ({ role: 'user' as const, content: m.content }));
    const found = retrieve(c.question, history);
    const text = found.documents.map(d => d.text).join('\n');
    const scope = c.projects.every(key => found.projects.some(p => p.key === key)) && (c.projects.length !== 1 || found.projects.every(p => c.projects.includes(p.key)));
    const matched = c.facts.map(pattern => new RegExp(pattern, 'is').test(text));
    const answer = instantAnswer(c.question) ?? notesAnswer(c.question, history).text;
    const abstained = !c.abstain || /not.*(document|verified|provided)|don.t have verified|which.*neo|mean.*(assistant|project)|portfolio assistant.*desktop/i.test(answer);
    return { id: c.id, scope, facts: matched.filter(Boolean).length, totalFacts: c.facts.length, abstained, pass: scope && matched.every(Boolean) && abstained, projects: found.projects.map(p => p.key) };
});
const report = { evaluatedAt: new Date().toISOString(), metric: 'Deterministic retrieval evidence coverage, NOT an LLM accuracy score', questions: results.length, passed: results.filter(r => r.pass).length, scopePass: results.filter(r => r.scope).length, factsCovered: results.reduce((n, r) => n + r.facts, 0), factsTotal: results.reduce((n, r) => n + r.totalFacts, 0), results };
const output = process.argv[2];
if (output)
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ questions: report.questions, passed: report.passed, scopePass: report.scopePass, factsCovered: report.factsCovered, factsTotal: report.factsTotal, failures: results.filter(r => !r.pass).map(r => r.id) }, null, 2));
