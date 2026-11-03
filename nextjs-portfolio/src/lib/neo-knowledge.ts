import { personalInfo, projects, skills } from './data';
import { architectures, architectureKeyByProject, architectureReviews, architectureSources } from './architectureData';
import evidence from './neo/evidence.json';
import { conversationTopic, mentionedProjects, projectAliases, tokens, topicTags } from './neo/language';
import { rankDocuments } from './neo/retrieval';
import type { ChatContext, ChatProject, ChatSource, ChatTurn } from './neo-types';
export type KnowledgeDocument = {
    id: string;
    project?: string;
    title: string;
    text: string;
    source: ChatSource;
    terms: string;
    kind: 'profile' | 'overview' | 'component' | 'evidence';
};
const profile: KnowledgeDocument = { id: 'profile', title: 'Shivam — profile and contact', kind: 'profile', terms: 'profile skills stack resume cv contact hire email linkedin github developer', text: `Shivam is a full-stack developer based in India and available for select work. Listed skills: ${skills.map(s => s.name).join(', ')}. Public contact: ${personalInfo.email}. LinkedIn: ${personalInfo.linkedin}. GitHub: ${personalInfo.github}. Resume: ${personalInfo.resume}. These sources do not document GPA, degree, exact employment history, salary, phone number or start dates. The portfolio assistant Neo is separate from the desktop Python voice-assistant project.`, source: { id: 'profile', title: 'Portfolio profile', url: 'https://justshivamm.in/#about' } };
export const knowledge: KnowledgeDocument[] = [profile, ...projects.flatMap(project => {
        const key = architectureKeyByProject[project.title as keyof typeof architectureKeyByProject];
        const arch = architectures[key];
        const review = architectureReviews[key];
        const overview: KnowledgeDocument = { id: `${key}-overview`, project: key, title: project.title, kind: 'overview', terms: `${projectAliases[key].join(' ')} ${topicTags[key]} ${project.techStack.join(' ')}`, text: `${project.description} ${arch.summary} Stack: ${project.techStack.join(', ')}. ${project.link ? `Listed app URL: ${project.link}.` : 'No live app URL is listed.'} ${review.workingTree ? 'Some prior architecture notes include local working changes; only code evidence records are pinned implementation evidence.' : ''}`, source: { id: `${key}-overview`, title: `${project.title} · reviewed overview`, url: `https://github.com/${review.repository}/tree/${review.revision}`, revision: review.revision } };
        return [overview, ...arch.nodes.map((node): KnowledgeDocument => ({ id: `${key}-${node.id}`, project: key, title: `${project.title}: ${node.title}`, kind: 'component', terms: `${node.title} ${node.subtitle}`, text: node.detail, source: { id: `${key}-${node.id}`, title: `${project.title} · ${architectureSources[key][node.id]}`, url: `https://github.com/${review.repository}/blob/${review.revision}/${architectureSources[key][node.id].split('/').map(encodeURIComponent).join('/')}`, revision: review.revision } }))];
    }), ...evidence.map((e): KnowledgeDocument => ({ id: e.id, project: e.project, title: e.title, kind: 'evidence', terms: e.terms, text: e.text, source: { id: e.id, title: `${e.title} · ${e.file}:${e.startLine}–${e.endLine}`, url: `https://github.com/${e.repository}/blob/${e.revision}/${e.file.split('/').map(encodeURIComponent).join('/')}#L${e.startLine}-L${e.endLine}`, revision: e.revision.slice(0, 7) } }))];
export function retrieve(question: string, history: ChatTurn[], hint?: ChatContext) {
    const topic = conversationTopic(question, history, hint);
    if (topic.needsClarification)
        return { documents: [] as KnowledgeDocument[], sources: [] as ChatSource[], projects: [] as ChatProject[], topic };
    const candidates = knowledge.filter(d => !topic.focus.length || (d.project && topic.focus.includes(d.project)));
    const ranked = rankDocuments(candidates, topic.query);
    const chosen: KnowledgeDocument[] = [];
    const counts = new Map<string, number>();
    const add = (doc: KnowledgeDocument) => { if (chosen.some(d => d.id === doc.id))
        return; chosen.push(doc); counts.set(doc.project ?? 'profile', (counts.get(doc.project ?? 'profile') ?? 0) + 1); };
    // Balance explicit comparisons before filling additional detail from one app.
    for (const key of topic.focus.slice(0, 8)) {
        const best = ranked.find(r => r.doc.project === key);
        if (best)
            add(best.doc);
    }
    const overviewQuestion = /^(explain|tell me about|what is|describe)\s+/i.test(question) && tokens(question).length <= 5;
    if (!topic.focus.length) {
        const broad = /\b(projects|apps|applications|stack|skills)\b/i.test(question);
        if (broad)
            for (const { doc } of ranked.filter(r => r.doc.kind === 'overview')) {
                add(doc);
                if (chosen.length === 6)
                    break;
            }
    }
    const maximum = topic.comparison ? 8 : 6;
    for (const { doc } of ranked) {
        if (chosen.length >= maximum)
            break;
        if ((counts.get(doc.project ?? 'profile') ?? 0) >= (topic.focus.length === 1 ? 5 : 2))
            continue;
        add(doc);
    }
    if (overviewQuestion && topic.focus.length === 1) {
        const overview = knowledge.find(d => d.project === topic.focus[0] && d.kind === 'overview');
        if (overview && !chosen.some(d => d.id === overview.id)) {
            if (chosen.length >= maximum)
                chosen.pop();
            chosen.unshift(overview);
        }
    }
    const keys = [...new Set(chosen.map(d => d.project).filter(Boolean))];
    const related: ChatProject[] = keys.map(key => { const p = projects.find(p => architectureKeyByProject[p.title as keyof typeof architectureKeyByProject] === key)!; return { title: p.title, key: key!, description: p.description }; });
    return { documents: chosen, sources: chosen.map(d => d.source), projects: related, topic };
}
export function instantAnswer(question: string): string | null {
    if (/^(?:neo[,!\s]+)?(hi|hello|hey|help|who are you|what can you do)[!?.\s]*$/i.test(question.trim()))
        return 'I’m Neo, Shivam’s portfolio assistant. I explain his projects using reviewed code and source-linked notes. Ask about implementation, compare projects, or find his contact details.';
    if (conversationTopic(question, []).ambiguousNeo)
        return 'Do you mean Neo, this portfolio chatbot, or Neo, the Python desktop voice-assistant project? I can explain either.';
    if (!mentionedProjects(question).length && /\b(gpa|salary|birthday|phone number|graduation date|degree|employer)\b/i.test(question))
        return 'I don’t have verified portfolio information for that personal detail. Please contact Shivam directly rather than relying on a guessed answer.';
    if (/\bwhy\b.*\b(personally|shivam)\b|\bwhy did (you|he) choose\b/i.test(question))
        return 'The reviewed sources document the implementation, but I don’t have a verified record of Shivam’s personal rationale for that choice. I can explain the implemented design and discuss general tradeoffs separately.';
    if (!mentionedProjects(question).length && /\b(contact|hire|resume|résumé|cv|email|linkedin)\b/i.test(question) && !/\b(implement|auth|system|integration|provider)\b/i.test(question))
        return `You can reach Shivam at ${personalInfo.email}. He is a full-stack developer based in India, available for select work.\n\nRésumé: ${personalInfo.resume}\nLinkedIn: ${personalInfo.linkedin}\nGitHub: ${personalInfo.github}\n\nFor rates, dates or detailed employment history, contact him directly.`;
    if (/^(what (have you|has shivam) (built|made)|(?:list|show|what are|tell me about) (?:me )?(?:all |your |the |his )?projects)[?.!\s]*$/i.test(question.trim()))
        return `Shivam’s portfolio includes ${projects.length} projects:\n\n${projects.map(p => `• ${p.title}: ${p.description}`).join('\n\n')}\n\nAsk about one to explore its implementation and source references.`;
    return null;
}
export function notesAnswer(question: string, history: ChatTurn[] = [], hint?: ChatContext) {
    const result = retrieve(question, history, hint);
    const instant = instantAnswer(question);
    const selected = result.documents.slice(0, 3);
    const text = instant ?? (result.topic.needsClarification ? 'Which project or feature do you mean? Name one and I can explain its actual implementation.' : selected.length ? `From the reviewed sources:\n\n${selected.map((d) => `${d.title}\n${d.text} [S${result.documents.indexOf(d) + 1}]`).join('\n\n')}` : 'I don’t have verified portfolio information for that question. Ask about Shivam’s projects, skills, architecture or contact details.');
    const context: ChatContext = { projects: (result.topic.focus.length ? result.topic.focus : result.projects.map(p => p.key)).slice(0, 6), question: result.topic.query.slice(0, 800) };
    return { ...result, text, context };
}
export function packContext(documents: KnowledgeDocument[], maxCharacters = 6500) {
    const selected: KnowledgeDocument[] = [];
    const blocks: string[] = [];
    // Include limitations once and pack whole records; never cut a record mid-fact.
    const caveats = [...new Set(documents.filter(d => d.project).map(d => architectures[d.project!].caveat))];
    const prefix = `Source scope: pinned snapshots, not live infrastructure checks. Relevant limitations: ${caveats.join(' ')}\n\n`;
    let used = prefix.length;
    for (const doc of documents) {
        const block = `[S${selected.length + 1}] ${doc.title}\n${doc.text}`;
        if (used + block.length + 2 > maxCharacters)
            continue;
        selected.push(doc);
        blocks.push(block);
        used += block.length + 2;
    }
    return { text: prefix + blocks.join('\n\n'), documents: selected, sources: selected.map(d => d.source) };
}
export function modelContext(documents: KnowledgeDocument[]) { return packContext(documents).text; }
