import type { ChatContext, ChatTurn } from '../neo-types';
export const projectAliases: Record<string, string[]> = {
    market: ['cross market disclosure analysis', 'disclosure project', 'disclosure benchmark', 'financial disclosure', 'cross market'],
    detection: ['hybrid cnn', 'cnn transformer', 'object detection', 'kitti', 'detector'],
    nexus: ['nexus'], bb84: ['bb84', 'bb 84', 'quantum messenger', 'quantum messaging'],
    securevault: ['securevault', 'secure vault'], movie: ['themovie', 'the movie', 'movie app', 'movie project'],
    neo: ['desktop neo', 'neo desktop', 'neo the desktop', 'neo voice', 'voice assistant', 'python neo'],
    sms: ['shikshan', 'college erp', 'college management', 'school management', 'sms'],
    attendify: ['attendify', 'attendance tracker', 'attendance app'],
    eventhub: ['eventhub', 'event hub', 'ticketing project'],
    editorial: ['editorial', 'collaborative document editor', 'document editor project'],
    unix: ['unix', 'linux utility', 'linux toolkit', 'utility suite'],
};
export const topicTags: Record<string, string> = {
    market: 'finance rag retrieval embedding sentiment benchmark ai ml', detection: 'vision ai ml pytorch training inference',
    nexus: 'backend java spring authentication workspace realtime collaboration ai', bb84: 'security quantum chat messaging realtime',
    securevault: 'security encryption passwords vault', movie: 'recommendations ranking movies ai ml', neo: 'voice speech python desktop systems',
    sms: 'college erp flask sql attendance backend', attendify: 'attendance calendar clerk express backend',
    eventhub: 'events tickets payments qr backend', editorial: 'documents editor collaboration realtime yjs ai', unix: 'linux systems c bash processes network scheduling',
};
export function normalize(text: string) { return text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+#]+/g, ' ').trim(); }
const stop = new Set('a an and are as at be by can could do does for from have how i in is it its me my of on or please project projects show tell than that the their them these they this to use uses using was what when where which who why will with work works would you your built build about more explain compare comparison details detail shivam personally now then also after'.split(' '));
const stems: Record<string, string> = { authentication: 'auth', authenticated: 'auth', authenticate: 'auth', authorization: 'auth', authorize: 'auth', permissions: 'permission', encrypts: 'encrypt', encrypted: 'encrypt', encryption: 'encrypt', decrypts: 'decrypt', decrypted: 'decrypt', decryption: 'decrypt', protect: 'security', protects: 'security', protecting: 'security', saved: 'save', saving: 'save', stores: 'store', storing: 'store', storage: 'store', persistence: 'persist', persisted: 'persist', persists: 'persist', refresh: 'reload', refreshing: 'reload', refreshed: 'reload', reloads: 'reload', recognizing: 'recognition', recognize: 'recognition', recognizer: 'recognition', recommendations: 'recommend', recommendation: 'recommend', recommender: 'recommend', personalizes: 'personalize', personalization: 'personalize', scheduling: 'scheduler', simulation: 'simulate', waiting: 'wait', arrivals: 'arrival', failures: 'failure', failing: 'failure', fails: 'failure', failed: 'failure', merges: 'merge', merging: 'merge', edits: 'edit', editing: 'edit', labels: 'label', labeled: 'label', measured: 'measure', results: 'result', movies: 'movie', payments: 'payment', signatures: 'signature', holidays: 'holiday', cancellations: 'cancellation', databases: 'database', devices: 'device' };
export function tokens(text: string): string[] {
    return normalize(text.replace(/real[ -]time/gi, 'realtime').replace(/end.to.end/gi, 'e2e')).split(/\s+/).filter(w => (w.length > 1 || w === 'c') && !stop.has(w)).flatMap(w => {
        const token = stems[w] ?? w;
        if (token === 'encrypt' || token === 'decrypt')
            return [token, 'crypto'];
        return [token];
    });
}
export function mentionedProjects(text: string): string[] {
    const phrase = ` ${normalize(text)} `;
    return Object.entries(projectAliases).filter(([, aliases]) => aliases.some(alias => phrase.includes(` ${alias} `))).map(([key]) => key);
}
export function isProfileQuestion(question: string) {
    return !mentionedProjects(question).length && /\b(contact|hire|resume|résumé|cv|email|linkedin|gpa|salary|degree|graduat|birthday|phone|who are you|who is shivam)\b/i.test(question);
}
export function conversationTopic(question: string, history: ChatTurn[], hint?: ChatContext) {
    const direct = mentionedProjects(question);
    const comparison = /\b(compare|comparison|versus|vs|difference|differences|different|between|both)\b/i.test(question);
    const reference = /\b(it|its|that|this|those|they|them|both|same|and what|and how)\b/i.test(question) || /^(why|how so|what if|what about|how about|explain the|and |does it|can it)/i.test(question.trim());
    let previous: string[] = hint?.projects ?? [];
    const recent: string[] = [];
    for (const turn of history.filter(m => m.role === 'user').slice(-8).reverse()) {
        if (isProfileQuestion(turn.content)) {
            previous = [];
            break;
        }
        recent.push(turn.content);
        const projects = mentionedProjects(turn.content);
        if (projects.length) {
            previous = projects;
            break;
        }
    }
    const focus = isProfileQuestion(question) ? [] : direct.length ? (comparison && reference ? [...new Set([...previous, ...direct])] : direct) : reference ? previous : [];
    const inherited = reference && previous.length ? [hint?.question ?? '', ...recent.reverse().slice(-3)].join(' ').slice(-1400) : '';
    const ambiguousNeo = !direct.length && /\bneo\b/i.test(question) && !/\b(who are you|chatbot|portfolio assistant|can you)\b/i.test(question);
    return { focus, comparison, reference, query: `${question} ${inherited}`, ambiguousNeo, needsClarification: ambiguousNeo || (reference && !focus.length && !isProfileQuestion(question)), detailed: /\b(detailed|detail|step.by.step|walkthrough|formula|algorithm|compare|comparison|versus|architecture)\b/i.test(question) };
}
