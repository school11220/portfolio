import { createHash } from "node:crypto";

type Counter = { count: number; expires: number };
const localCounters = new Map<string, Counter>();
const lua = `
local minute = tonumber(redis.call('GET', KEYS[1]) or '0')
local visitor = tonumber(redis.call('GET', KEYS[2]) or '0')
local budget = tonumber(redis.call('GET', KEYS[3]) or '0')
if minute >= tonumber(ARGV[1]) or visitor >= tonumber(ARGV[2]) or budget + tonumber(ARGV[3]) > tonumber(ARGV[4]) then return 0 end
redis.call('INCR', KEYS[1]); redis.call('EXPIRE', KEYS[1], 120)
redis.call('INCR', KEYS[2]); redis.call('EXPIRE', KEYS[2], 172800)
redis.call('INCRBY', KEYS[3], ARGV[3]); redis.call('EXPIRE', KEYS[3], 172800)
return 1`;

export function hasSharedLimits() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Reserve the complete bounded request before inference, atomically across all
// serverless instances. Reservations remain charged on cancellation/failure.
export async function reserveModelBudget(ip: string, estimatedTokens: number): Promise<boolean> {
  const now = Date.now(); const minute = Math.floor(now / 60000); const day = Math.floor(now / 86400000);
  const visitor = createHash("sha256").update(`${day}:${ip}`).digest("hex").slice(0, 24);
  const keys = [`neo:m:${visitor}:${minute}`, `neo:v:${visitor}:${day}`, `neo:b:${day}`];
  const configured = Number(process.env.NEO_DAILY_TOKEN_BUDGET ?? 40000);
  const budget = Number.isFinite(configured) ? Math.max(500, Math.min(60000, configured)) : 40000;
  if (hasSharedLimits()) {
    try {
      const url = new URL(process.env.UPSTASH_REDIS_REST_URL!);
      if (url.protocol !== "https:") return false;
      const response = await fetch(url, {
        method: "POST", headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(["EVAL", lua, "3", ...keys, "6", "25", String(estimatedTokens), String(budget)]),
        signal: AbortSignal.timeout(3000), cache: "no-store",
      });
      if (!response.ok) { console.warn("neo.quota.unavailable", { status: response.status }); return false; }
      const data = await response.json();
      if (data.error) console.warn("neo.quota.command_rejected");
      return !data.error && data.result === 1;
    } catch (error) { console.warn("neo.quota.unavailable", { reason: error instanceof Error ? error.name : "unknown" }); return false; }
  }
  // Development convenience only. Production never substitutes process memory
  // for a shared budget: it serves verified notes without making a model call.
  if (process.env.NODE_ENV === "production") return false;
  for (const [key, value] of localCounters) if (value.expires <= now) localCounters.delete(key);
  if (localCounters.size > 1500) return false;
  const costs = [1, 1, estimatedTokens]; const limits = [6, 25, budget];
  if (keys.some((key, i) => (localCounters.get(key)?.count ?? 0) + costs[i] > limits[i])) return false;
  keys.forEach((key, i) => localCounters.set(key, { count: (localCounters.get(key)?.count ?? 0) + costs[i], expires: now + (i === 0 ? 120000 : 172800000) }));
  return true;
}
