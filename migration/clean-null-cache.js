/**
 * clean-null-cache.js
 * Removes null entries from api-cache.json
 * Keeps all successful results intact
 *
 * Usage: node migration/clean-null-cache.js
 */

const fs   = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "api-cache.json");

if (!fs.existsSync(CACHE_FILE)) {
  console.log("No api-cache.json found — nothing to clean.");
  process.exit(0);
}

const raw   = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
const keys  = Object.keys(raw);
const total = keys.length;

// Keep only entries that have actual data (not null)
const cleaned = {};
let kept = 0, removed = 0;

for (const key of keys) {
  if (raw[key] !== null) {
    cleaned[key] = raw[key];
    kept++;
  } else {
    removed++;
  }
}

// Backup original
fs.writeFileSync(CACHE_FILE + ".bak", JSON.stringify(raw, null, 2));

// Write cleaned
fs.writeFileSync(CACHE_FILE, JSON.stringify(cleaned, null, 2));

console.log(`\n✅ Cache cleaned:`);
console.log(`   Total entries : ${total}`);
console.log(`   Kept (data)   : ${kept}`);
console.log(`   Removed (null): ${removed}`);
console.log(`   Backup saved  : ${CACHE_FILE}.bak\n`);
