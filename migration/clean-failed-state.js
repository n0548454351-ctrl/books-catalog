/**
 * clean-failed-state.js
 *
 * Resets only "failed" and "needs_review with 0 score" entries in enrichment-state.json
 * back to "pending" so they retry on next run.
 *
 * Keeps all "done" and "needs_review" with real data intact.
 *
 * Usage: node migration/clean-failed-state.js
 */

const fs   = require("fs");
const path = require("path");

const STATE_FILE = path.join(__dirname, "enrichment-state.json");
const CACHE_FILE = path.join(__dirname, "api-cache.json");

if (!fs.existsSync(STATE_FILE)) {
  console.log("No enrichment-state.json found.");
  process.exit(0);
}

// ── 1. Reset failed/empty records in state ────────────────────────────────────
const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
let kept = 0, reset = 0;

const cleaned = state.map(record => {
  // Keep done records untouched
  if (record.status === "done") {
    kept++;
    return record;
  }

  // Keep needs_review that have real data
  if (record.status === "needs_review" && record.match_score > 0 && record.verified_title) {
    kept++;
    return record;
  }

  // Reset everything else to pending with 0 attempts
  reset++;
  return {
    ...record,
    status: "pending",
    attempt_count: 0,
    error_log: "",
    match_score: 0,
    needs_review: true,
  };
});

// Backup
fs.writeFileSync(STATE_FILE + ".bak", JSON.stringify(state, null, 2));
fs.writeFileSync(STATE_FILE, JSON.stringify(cleaned, null, 2));

console.log(`\n✅ State cleaned:`);
console.log(`   Kept (done/review with data) : ${kept}`);
console.log(`   Reset to pending              : ${reset}`);
console.log(`   Backup                        : ${STATE_FILE}.bak\n`);

// ── 2. Clean null entries from cache ─────────────────────────────────────────
if (fs.existsSync(CACHE_FILE)) {
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  const keys  = Object.keys(cache);
  const cleaned_cache = {};
  let keptC = 0, removedC = 0;

  for (const key of keys) {
    if (cache[key] !== null) {
      cleaned_cache[key] = cache[key];
      keptC++;
    } else {
      removedC++;
    }
  }

  fs.writeFileSync(CACHE_FILE + ".bak", JSON.stringify(cache, null, 2));
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cleaned_cache, null, 2));

  console.log(`✅ Cache cleaned:`);
  console.log(`   Kept (real data) : ${keptC}`);
  console.log(`   Removed (null)   : ${removedC}\n`);
}

console.log(`Now run: npx ts-node --project tsconfig.migration.json migration/enrich-books-gemini-v9.ts`);
