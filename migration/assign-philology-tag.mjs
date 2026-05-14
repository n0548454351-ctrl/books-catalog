#!/usr/bin/env node
/**
 * assign-philology-tag.mjs
 * ─────────────────────────────────────────────────────────────────
 * Reads migration/reports/philology-books.csv and assigns the
 * "philology" tag to matching books in Supabase.
 *
 * Usage:
 *   node migration/assign-philology-tag.mjs
 *   node migration/assign-philology-tag.mjs --apply
 *   node migration/assign-philology-tag.mjs --apply --min-score 0.28
 *   node migration/assign-philology-tag.mjs --apply --confidence high
 *
 * Flags:
 *   --apply               Write to Supabase (default: dry-run)
 *   --min-score <0-1>     Minimum philology_score (default: 0.20)
 *   --confidence <level>  Only assign if confidence = high|medium|low
 *   --input <file>        CSV path (default: migration/reports/philology-books.csv)
 *   --help
 *
 * Match strategy (in order):
 *   1. id column in CSV → books.id (if UUID)
 *   2. title + author normalized match against Supabase books
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs   from "fs";
import path from "path";
import { parseArgs } from "util";

// ── CLI ───────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    apply:         { type: "boolean", default: false },
    "min-score":   { type: "string",  default: "0.20" },
    confidence:    { type: "string"  },          // high | medium | low
    input:         { type: "string",  default: "./migration/reports/philology-books.csv" },
    help:          { type: "boolean", default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`
Usage:
  node migration/assign-philology-tag.mjs [--apply] [options]

Options:
  --apply              Write to Supabase (default: dry-run)
  --min-score <n>      Min philology_score 0-1 (default: 0.20)
  --confidence <lvl>   Only high|medium|low (default: all)
  --input <file>       CSV file path
  --help
`);
  process.exit(0);
}

const MIN_SCORE = parseFloat(args["min-score"] ?? "0.20");
const CONF_FILTER = args.confidence ?? null;

// ── Supabase ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Helpers ───────────────────────────────────────────────────────
function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUuid(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

// ── Parse CSV ─────────────────────────────────────────────────────
function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
      if (ch === '"' &&  inQuotes) { inQuotes = false; continue; }
      if (ch === ","  && !inQuotes) { values.push(current); current = ""; continue; }
      current += ch;
    }
    values.push(current);

    const row = {};
    for (let k = 0; k < headers.length; k++) {
      row[headers[k]] = (values[k] ?? "").trim();
    }
    rows.push(row);
  }
  return rows;
}

// ── MAIN ──────────────────────────────────────────────────────────
const inputPath = path.resolve(args.input);
if (!fs.existsSync(inputPath)) {
  console.error(`❌  File not found: ${inputPath}`);
  console.error("    Run classify-philology.mjs first.");
  process.exit(1);
}

console.log(`\n📂  Reading ${path.basename(inputPath)}...`);
const csvText = fs.readFileSync(inputPath, "utf8");
const csvRows = parseCsv(csvText);
console.log(`    ${csvRows.length} rows loaded`);

// Apply filters
let eligible = csvRows.filter(r => {
  const score = parseFloat(r.philology_score ?? "0");
  if (score < MIN_SCORE) return false;
  if (CONF_FILTER && r.confidence !== CONF_FILTER) return false;
  return true;
});

console.log(`    ${eligible.length} eligible (score ≥ ${MIN_SCORE}${CONF_FILTER ? `, confidence=${CONF_FILTER}` : ""})`);

// ── Fetch philology tag id ────────────────────────────────────────
console.log("\n🔌  Connecting to Supabase...");

const { data: tagData, error: tagErr } = await supabase
  .from("tags")
  .select("id, name, slug")
  .eq("slug", "philology")
  .single();

if (tagErr || !tagData) {
  console.error("❌  Philology tag not found. Did you run 001_add_tags.sql first?");
  console.error("    Error:", tagErr?.message);
  process.exit(1);
}

const TAG_ID = tagData.id;
console.log(`✅  Found tag: "${tagData.name}" (${TAG_ID})`);

// ── Fetch existing book_tags to avoid duplicates ──────────────────
const { data: existingBT } = await supabase
  .from("book_tags")
  .select("book_id")
  .eq("tag_id", TAG_ID);

const alreadyTagged = new Set((existingBT ?? []).map(r => r.book_id));
console.log(`    ${alreadyTagged.size} books already have this tag`);

// ── Load ALL books from Supabase using pagination ─────────────────
console.log("\n📚  Loading all books from Supabase...");

const allBooks = [];
const PAGE_SIZE = 1000;
let   pageNum   = 0;

while (true) {
  const from = pageNum * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from("books")
    .select("id, title, title_he, author")
    .range(from, to);

  if (error) { console.error("❌ ", error.message); process.exit(1); }
  if (!data || data.length === 0) break;

  allBooks.push(...data);
  process.stdout.write(`    Loaded ${allBooks.length} books...\r`);

  if (data.length < PAGE_SIZE) break;   // last page
  pageNum++;
}

console.log(`    ✅  ${allBooks.length} books loaded from Supabase`);

// Build lookup indexes
const byId      = new Map(allBooks.map(b => [b.id, b]));
const byNormKey = new Map();
for (const b of allBooks) {
  const key = `${normalize(b.title_he || b.title)}__${normalize(b.author || "")}`;
  if (key !== "__") byNormKey.set(key, b);
}

// ── Match CSV rows to Supabase books ──────────────────────────────
const toAssign   = [];   // book_ids to tag
const notFound   = [];
const alreadyDone = [];

for (const row of eligible) {
  let book = null;
  let matchedBy = null;

  // 1. source_id (UUID) — כפי שה-classifier כותב לCSV
  const candidateId = row.source_id || row.id;
  if (candidateId && isUuid(candidateId)) {
    book = byId.get(candidateId);
    if (book) matchedBy = "id";
  }

  // 2. title + author normalized
  if (!book) {
    const key = `${normalize(row.title)}__${normalize(row.author)}`;
    if (key !== "__") {
      book = byNormKey.get(key);
      if (book) matchedBy = "title+author";
    }
  }

  // 3. title only (fallback when author differs slightly)
  if (!book) {
    const normTitle = normalize(row.title);
    if (normTitle.length >= 6) {
      for (const b of allBooks) {
        if (normalize(b.title_he || b.title) === normTitle) {
          book = b;
          matchedBy = "title-only";
          break;
        }
      }
    }
  }

  if (!book) {
    notFound.push(row);
    continue;
  }

  if (alreadyTagged.has(book.id)) {
    alreadyDone.push(book);
    continue;
  }

  toAssign.push({ book_id: book.id, tag_id: TAG_ID, matchedBy, csvTitle: row.title });
}

// ── Report ────────────────────────────────────────────────────────
console.log(`
═══════════════════════════════════════════════════════
${args.apply ? "🟢  APPLY MODE" : "🔵  DRY-RUN — nothing written"}
═══════════════════════════════════════════════════════

📊  Results
   CSV eligible       : ${eligible.length}
   Already tagged     : ${alreadyDone.length}
   Not found in DB    : ${notFound.length}
   Will assign tag    : ${toAssign.length}
`);

if (notFound.length > 0) {
  console.log(`  ⚠️  Not found (first 10):`);
  for (const r of notFound.slice(0, 10)) {
    console.log(`     "${r.title}" — ${r.author}`);
  }
}

console.log(`\n  ➕  Will tag (first 20):`);
for (const r of toAssign.slice(0, 20)) {
  console.log(`     [${r.matchedBy}] "${r.csvTitle}"`);
}
if (toAssign.length > 20) console.log(`     … +${toAssign.length - 20} more`);

if (!args.apply) {
  console.log(`
───────────────────────────────────────────────────────
ℹ️   Dry-run complete. Nothing written.
    Run with --apply to assign tags.
───────────────────────────────────────────────────────
`);
  process.exit(0);
}

// ── Apply: insert book_tags ───────────────────────────────────────
console.log(`\n🔖  Assigning tag to ${toAssign.length} books...`);

const BATCH = 100;
let ok = 0, fail = 0;

for (let i = 0; i < toAssign.length; i += BATCH) {
  const batch = toAssign.slice(i, i + BATCH).map(({ book_id, tag_id }) => ({
    book_id,
    tag_id,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("book_tags")
    .insert(batch)
    .throwOnError();

  if (error) {
    console.error(`  ❌  Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
    fail += batch.length;
  } else {
    ok += batch.length;
    process.stdout.write(`  ✅  ${ok}/${toAssign.length}\r`);
  }
}

console.log(`
═══════════════════════════════════════════════════════
✅  Done.
   Tagged  : ${ok}${fail ? `  (${fail} failed)` : ""}
   Skipped : ${alreadyDone.length} (already tagged)
═══════════════════════════════════════════════════════
`);
