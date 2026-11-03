import { personalInfo, projects, skills } from "./data";
import { architectures, architectureKeyByProject, architectureReviews, architectureSources } from "./architectureData";
import type { ChatProject, ChatSource, ChatTurn } from "./neo-types";

type Document = { id: string; project?: string; title: string; text: string; source: ChatSource; terms: string };
const aliases: Record<string, string> = {
  market: "financial finance disclosure rag retrieval sentiment risk india us ai ml",
  detection: "vision machine learning ml ai cnn transformer kitti detector autonomous",
  nexus: "workspace team chat collaboration spring java organization auth authentication ai retrieval",
  bb84: "quantum messenger qkd bb84 alice bob eve eavesdrop encryption socket chat security",
  securevault: "securevault secure vault password encryption crypto aes pbkdf2 security backup",
  movie: "themovie movie movies film tv recommendation recommender watch diary ai ml",
  neo: "desktop voice assistant speech windows microphone python",
  sms: "shikshan college school erp sms attendance teacher student library fees",
  attendify: "attendify attendance clerk timetable calendar subjects",
  eventhub: "eventhub events ticket qr razorpay payment checkin check-in",
  editorial: "editorial editor document documents collaboration yjs tiptap realtime socket ai writing",
  unix: "unix linux utility utilities toolkit os system network process scheduling scheduler bash c zenity",
};
const stop = new Set("a an and are as at be by can could do does for from have how i in is it its me my of on or please project projects show tell than that the their them these they this to use uses using was what when where which who why will with work works would you your built build about more explain compare comparison details detail".split(" "));
function tokens(text: string) {
  return text.toLowerCase().replace(/real-time/g, "realtime").replace(/[^a-z0-9+#.-]/g, " ").split(/\s+/).filter((word) => word.length > 1 && !stop.has(word)).map((word) => {
    if (/^(encrypt|decrypt|cryptograph)/.test(word)) return "crypto";
    if (/^(authenticat|authorization)/.test(word)) return "auth";
    if (/^recommend/.test(word)) return "recommend";
    return word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word;
  });
}

const profile: Document = {
  id: "profile", title: "Shivam — profile and contact", terms: "profile experience skills stack resume cv contact hire email linkedin github full stack developer",
  text: `${personalInfo.name} is a ${personalInfo.title}, based in India, available for select work. His portfolio spans low-level systems tools, full-stack web applications, security demonstrations and machine-learning projects. Listed skills: ${skills.map((s) => s.name).join(", ")}. Contact: ${personalInfo.email}. LinkedIn: ${personalInfo.linkedin}. GitHub: ${personalInfo.github}. Resume: ${personalInfo.resume}. Detailed employment history, salary, start dates, degree and GPA are not documented in these sources. Neo the portfolio chatbot is separate from Neo the Python desktop voice assistant project.`,
  source: { id: "profile", title: "Portfolio profile", url: "https://justshivamm.in/#about" },
};

export const knowledge: Document[] = [profile, ...projects.flatMap((project) => {
  const key = architectureKeyByProject[project.title as keyof typeof architectureKeyByProject];
  const architecture = architectures[key]; const review = architectureReviews[key];
  const source = (file: string, id: string): ChatSource => ({ id, title: `${project.title} · ${file}`, url: `https://github.com/${review.repository}/blob/${review.revision}/${file.split("/").map(encodeURIComponent).join("/")}`, revision: review.revision });
  const overview: Document = {
    id: `${key}-overview`, project: key, title: project.title, terms: `${project.title} ${aliases[key]} ${project.techStack.join(" ")}`,
    text: `${project.description} ${architecture.summary} Stack: ${project.techStack.join(", ")}. Workflows: ${architecture.flows.map((f) => `${f.name}: ${f.description}`).join(" ")} Important limitations: ${architecture.caveat} ${review.workingTree ? "Some architecture notes were reviewed against local working changes; do not present all those features as verified in the pinned GitHub commit." : ""} ${project.link ? `Live app: ${project.link}.` : "No live application URL is listed."}`,
    source: { id: `${key}-overview`, title: `${project.title} · reviewed repository`, url: `https://github.com/${review.repository}/tree/${review.revision}`, revision: review.revision },
  };
  return [overview, ...architecture.nodes.map((node): Document => ({ id: `${key}-${node.id}`, project: key, title: `${project.title}: ${node.title}`, terms: `${project.title} ${aliases[key]} ${node.title} ${node.subtitle}`, text: node.detail, source: source(architectureSources[key][node.id], `${key}-${node.id}`) }))];
})];

export function retrieve(question: string, history: ChatTurn[]) {
  // Resolve follow-ups using the last user topic, never instructions from assistant text.
  const previous = history.filter((m) => m.role === "user").slice(-1)[0]?.content ?? "";
  const mentionedProjects = (text: string) => Object.keys(aliases).filter((key) => {
    const project = projects.find((p) => architectureKeyByProject[p.title as keyof typeof architectureKeyByProject] === key)!;
    return text.toLowerCase().includes(project.title.toLowerCase()) || text.toLowerCase().includes(key === "market" ? "disclosure" : key === "detection" ? "detector" : key === "movie" ? "movie" : key === "unix" ? "unix" : key === "sms" ? "shikshan" : key);
  });
  const direct = mentionedProjects(question);
  const isFollowUp = /\b(it|its|that|this|those|they|more|also)\b/i.test(question) && !direct.length;
  const focus = direct.length ? direct : isFollowUp ? mentionedProjects(previous) : [];
  const query = [...new Set(tokens(`${question} ${isFollowUp ? previous : ""}`))];
  const ranked = knowledge.filter((doc) => !focus.length || (doc.project && focus.includes(doc.project))).map((doc) => {
    const title = tokens(doc.title); const terms = tokens(doc.terms); const text = tokens(doc.text);
    let score = query.reduce((sum, word) => sum + (title.includes(word) ? 6 : 0) + (terms.includes(word) ? 2 : 0) + (text.includes(word) ? 1 : 0), 0);
    if (doc.project && direct.includes(doc.project)) score += 18;
    if (doc.id.endsWith("overview")) score += score > 0 ? 1 : 0;
    return { doc, score };
  }).filter((item) => item.score > 1).sort((a, b) => b.score - a.score);
  const chosen: Document[] = []; const perProject = new Map<string, number>();
  const ordered = !direct.length && !isFollowUp ? [...ranked.filter(({ doc }) => doc.id.endsWith("overview") || doc.id === "profile"), ...ranked.filter(({ doc }) => !doc.id.endsWith("overview") && doc.id !== "profile")] : ranked;
  for (const { doc } of ordered) {
    const count = perProject.get(doc.project ?? "profile") ?? 0;
    if (count >= (direct.length === 1 ? 4 : 2)) continue;
    chosen.push(doc); perProject.set(doc.project ?? "profile", count + 1);
    if (chosen.length === 6) break;
  }
  const projectKeys = [...new Set(chosen.map((d) => d.project).filter(Boolean))];
  const related: ChatProject[] = projectKeys.map((key) => {
    const p = projects.find((p) => architectureKeyByProject[p.title as keyof typeof architectureKeyByProject] === key)!;
    return { title: p.title, key: key!, description: p.description };
  });
  return { documents: chosen, sources: chosen.map((doc) => doc.source), projects: related };
}

export function instantAnswer(question: string): string | null {
  if (/^(hi|hello|hey|help|what can you do)[!?.\s]*$/i.test(question.trim())) return "I’m Neo, Shivam’s portfolio assistant. Ask about a project’s implementation, compare stacks, explore architecture, or find his contact details. My answers use reviewed project notes and source files.";
  if (/\b(contact|hire|resume|résumé|\bcv\b|email|linkedin)\b/i.test(question) && !/\b(project|implement|auth|system|integrat)\b/i.test(question)) return `You can reach Shivam at ${personalInfo.email}. He is a full-stack developer based in India, available for select work.\n\nRésumé: ${personalInfo.resume}\nLinkedIn: ${personalInfo.linkedin}\nGitHub: ${personalInfo.github}\n\nFor rates, dates, or detailed employment history, please contact him directly.`;
  if (/^(what (have you|has shivam) (built|made)|(?:list|show|what are|tell me about) (?:me )?(?:all |your |the |his )?projects)[?.!\s]*$/i.test(question.trim())) return `Shivam’s portfolio includes ${projects.length} projects:\n\n${projects.map((p) => `• ${p.title}: ${p.description}`).join("\n\n")}\n\nAsk about any one of these to explore its implementation and source references.`;
  return null;
}

export function notesAnswer(question: string, history: ChatTurn[] = []) {
  const retrieved = retrieve(question, history);
  const text = instantAnswer(question) ?? (retrieved.documents.length
    ? `From the reviewed project notes:\n\n${retrieved.documents.slice(0, 3).map((d) => `${d.title}\n${d.text}`).join("\n\n")}\n\n${[...new Set(retrieved.documents.slice(0, 3).filter((d) => d.project).map((d) => architectures[d.project!].caveat))].map((note) => `Implementation note: ${note}`).join("\n\n")}`
    : "I don’t have verified portfolio information for that question. Ask about Shivam’s projects, skills, architecture, or contact details. I can’t confirm private information or topics outside these sources.");
  return { ...retrieved, text };
}

export function modelContext(documents: Document[]) {
  const notes = [...new Set(documents.filter((d) => d.project).map((d) => architectures[d.project!].caveat))].join("\n");
  return `Important source limitations: ${notes}\n\n${documents.map((d, i) => `[S${i + 1}] ${d.title}\n${d.text}`).join("\n\n")}`.slice(0, 6500);
}
