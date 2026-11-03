import { tokens } from './language';
import type { KnowledgeDocument } from '../neo-knowledge';
// BM25 uses corpus document frequencies and length normalization instead of
// counting generic project aliases equally in every architecture component.
export function rankDocuments(documents: KnowledgeDocument[], query: string) {
    const indexed = documents.map(doc => ({ doc, words: [...tokens(doc.title), ...tokens(doc.title), ...tokens(doc.terms), ...tokens(doc.text)] }));
    const average = indexed.reduce((n, d) => n + d.words.length, 0) / Math.max(1, indexed.length);
    const queryWords = [...new Set(tokens(query))];
    const counts = new Map<string, number>();
    for (const { words } of indexed)
        for (const word of new Set(words))
            counts.set(word, (counts.get(word) ?? 0) + 1);
    return indexed.map(({ doc, words }) => {
        const tf = new Map<string, number>();
        for (const word of words)
            tf.set(word, (tf.get(word) ?? 0) + 1);
        const score = queryWords.reduce((total, word) => {
            const frequency = tf.get(word) ?? 0;
            if (!frequency)
                return total;
            const idf = Math.log(1 + (documents.length - (counts.get(word) ?? 0) + .5) / ((counts.get(word) ?? 0) + .5));
            return total + idf * (frequency * 2.2) / (frequency + 1.2 * (.25 + .75 * words.length / Math.max(1, average)));
        }, 0);
        return { doc, score };
    }).filter(item => item.score > .15).sort((a, b) => b.score - a.score || a.doc.id.localeCompare(b.doc.id));
}
