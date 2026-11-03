export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatContext = { projects: string[]; question: string };
export type ChatSource = { id: string; title: string; url: string; revision?: string };
export type ChatProject = { title: string; key: string; description: string };
export type ChatMeta = { mode: "ai" | "notes"; sources: ChatSource[]; projects: ChatProject[]; context?: ChatContext };
export type ChatEvent = ({ type: "meta" } & ChatMeta) | { type: "delta"; text: string } | { type: "replace"; text: string } | { type: "done" } | { type: "error"; text: string };
