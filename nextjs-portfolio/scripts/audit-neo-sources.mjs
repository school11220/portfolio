// Re-check pinned public source references without cloning whole applications.
// Run: node scripts/audit-neo-sources.mjs (from nextjs-portfolio).
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const audit = JSON.parse(await readFile(new URL('../src/lib/neo-source-audit.json', import.meta.url), 'utf8'));
const dir = await mkdtemp(join(tmpdir(), 'neo-audit-'));
let failed = 0;
try {
  for (const [key, review] of Object.entries(audit)) {
    const repo = join(dir, key);
    execFileSync('git', ['clone', '--bare', '--depth=1', '--filter=blob:none', `https://github.com/${review.repository}.git`, repo], { stdio: 'ignore' });
    execFileSync('git', ['-C', repo, 'fetch', '--depth=1', '--filter=blob:none', 'origin', review.revision], { stdio: 'ignore' });
    for (const file of Object.keys(review.files)) {
      try { execFileSync('git', ['-C', repo, 'cat-file', '-e', `${review.revision}:${file}`], { stdio: 'ignore' }); }
      catch { failed++; console.error(`Missing: ${key}/${file}`); }
    }
    console.log(`Checked ${key}: ${review.revision.slice(0, 7)}`);
  }
} finally { await rm(dir, { recursive: true, force: true }); }
process.exitCode = failed ? 1 : 0;
