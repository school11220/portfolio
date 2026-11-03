import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Explicit project-local chat settings win over stale machine-level credentials
// during development. All other settings retain Next.js's normal precedence.
if (existsSync(".env.local")) {
  const local = parseEnv(readFileSync(".env.local", "utf8"));
  for (const key of ["GROQ_API_KEY", "GROQ_MODEL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "NEO_DAILY_TOKEN_BUDGET"]) {
    if (Object.hasOwn(local, key)) process.env[key] = local[key];
  }
}
