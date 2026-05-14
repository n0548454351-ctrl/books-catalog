#!/usr/bin/env node
/**
 * merge-books.mjs  v5
 * ─────────────────────────────────────────────────────────────────
 * Safe merge of enriched-books.json → Supabase `books` table.
 *
 * Eligible record = status==="done" && needs_review!==true && verified_title
 * Guards: broken encoding, false-match detection (Jaro-Winkler)
 * Reports: dry-run CSV + suspicious.json
 *
 * Usage:
 *   node migration/merge-books.mjs --input migration/enriched-books.json
 *   node migration/merge-books.mjs --input migration/enriched-books.json --verbose
 *   node migration/merge-books.mjs --input migration/enriched-books.json --strict
 *   node migration/merge-books.mjs --input migration/enriched-books.json --apply
 *   node migration/merge-books.mjs --input migration/enriched-books.json --apply --yes
 *
 * Flags:
 *   --input <file>        Enriched JSON (required)
 *   --apply               Write to Supabase (default: dry-run)
 *   --strict              Raise similarity threshold to 0.92
 *   --yes                 Skip confirm when >50 writes
 *   --threshold <0-1>     Override similarity cutoff
 *   --backup-dir <dir>    Backup dir   (default: ./migration/backups)
 *   --suspicious <file>   (default: ./migration/suspicious.json)
 *   --report <file>       CSV report   (default: ./migration/reports/merge-preview.csv)
 *   --verbose             Show old→new diffs
 *   --help
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import fs       from "fs";
import path     from "path";
import readline from "readline";
import { parseArgs } from "util";

// ── CLI ───────────────────────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    input:        { type: "string" },
    apply:        { type: "boolean", default: false },
    strict:       { type: "boolean", default: false },
    yes:          { type: "boolean", default: false },
    threshold:    { type: "string" },
    "backup-dir": { type: "string", default: "./migration/backups" },
    suspicious:   { type: "string", default: "./migration/suspicious.json" },
    report:       { type: "string", default: "./migration/reports/merge-preview.csv" },
    verbose:      { type: "boolean", default: false },
    help:         { type: "boolean", default: false },
  },
  strict: false,
});

if (args.help || !args.input) {
  console.log(`
Usage:
  node migration/merge-books.mjs --input <file.json> [options]

Options:
  --input <file>        Enriched JSON (required)
  --apply               Write to Supabase (default: dry-run)
  --strict              Similarity threshold 0.92 (default 0.82)
  --yes                 Skip confirm when >50 writes
  --threshold <n>       Override similarity cutoff (0-1)
  --backup-dir <dir>    Backup dir (default: ./migration/backups)
  --suspicious <file>   Blocked matches output (default: ./migration/suspicious.json)
  --report <file>       CSV report output (default: ./migration/reports/merge-preview.csv)
  --verbose             Show old→new field diffs
  --help
`);
  process.exit(0);
}

// ── Supabase ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Thresholds ────────────────────────────────────────────────────
const DEFAULT_THRESHOLD = args.strict ? 0.92 : 0.82;
const SIM_THRESHOLD     = args.threshold
  ? Math.max(0, Math.min(1, parseFloat(args.threshold)))
  : DEFAULT_THRESHOLD;
const MAX_LENGTH_RATIO  = 1.5;

// ── Broken encoding guard ─────────────────────────────────────────
/**
 * Detects garbled UTF-8 / Windows-1252 characters that indicate
 * the string was read with the wrong encoding.
 * Typical offenders: ╫ Γ ö □ (box-drawing in text context)
 */
function hasBrokenEncoding(str = "") {
  return /[╫Γ\uFFFD\u2593\u2592\u2591\u2502\u2500\u255A\u2554\u2569\u2566\u2560\u2550\u256C]/.test(str);
}

function recordHasBrokenEncoding(rec) {
  return (
    hasBrokenEncoding(rec.verified_title)  ||
    hasBrokenEncoding(rec.verified_author) ||
    hasBrokenEncoding(rec.title)           ||
    hasBrokenEncoding(rec.author)          ||
    hasBrokenEncoding(rec.existing_title)  ||
    hasBrokenEncoding(rec.existing_author)
  );
}

// ── Jaro-Winkler similarity ───────────────────────────────────────
function jaro(s1, s2) {
  if (s1 === s2) return 1.0;
  const l1 = s1.length, l2 = s2.length;
  if (!l1 || !l2) return 0.0;
  const range = Math.floor(Math.max(l1, l2) / 2) - 1;
  const m1 = new Array(l1).fill(false);
  const m2 = new Array(l2).fill(false);
  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const lo = Math.max(0, i - range), hi = Math.min(i + range + 1, l2);
    for (let j = lo; j < hi; j++) {
      if (!m2[j] && s1[i] === s2[j]) { m1[i] = m2[j] = true; matches++; break; }
    }
  }
  if (!matches) return 0.0;
  let t = 0, k = 0;
  for (let i = 0; i < l1; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  return (matches / l1 + matches / l2 + (matches - t / 2) / matches) / 3;
}

function jaroWinkler(s1, s2, p = 0.1) {
  const j = jaro(s1, s2);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
    if (s1[i] === s2[i]) prefix++; else break;
  }
  return j + prefix * p * (1 - j);
}

function similarity(a, b) {
  if (!a || !b) return 0;
  if (a === b)  return 1.0;
  return jaroWinkler(a, b);
}

// ── General helpers ───────────────────────────────────────────────
function normalize(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnknown(str) {
  if (!str) return true;
  const low = String(str).toLowerCase().trim();
  return low === "" || low === "unknown" || low === "n/a" || low === "-";
}

function driveFileId(url) {
  if (!url || typeof url !== "string") return null;
  return (
    url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] ||
    url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1]    ||
    url.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]       ||
    null
  );
}

function driveIdsFromEnriched(rec) {
  const ids = new Set();
  if (rec.drive_file_id) ids.add(rec.drive_file_id);
  const fromUrl = driveFileId(rec.image_url);
  if (fromUrl) ids.add(fromUrl);
  return [...ids];
}

async function promptConfirm(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(r => rl.question(q, a => { rl.close(); r(a.trim().toLowerCase()); }));
}

// ── Field resolvers ───────────────────────────────────────────────
function resolveTitle(rec) {
  return rec.verified_title?.trim() || rec.raw_title?.trim() || rec.existing_title?.trim() || "";
}

function resolveAuthor(rec) {
  return rec.verified_author?.trim() || rec.raw_author?.trim() || rec.existing_author?.trim() || "";
}

function resolveIsbn(rec) {
  return rec.verified_isbn13?.trim() || rec.verified_isbn10?.trim() || null;
}

// ── Eligibility ───────────────────────────────────────────────────
function checkEligible(rec) {
  // Must be done + not flagged for review
  if (rec.status !== "done")
    return { ok: false, bucket: "failed",  reason: `status="${rec.status}"` };
  if (rec.needs_review === true || rec.needs_review === "true")
    return { ok: false, bucket: "review",  reason: "needs_review=true" };

  // Must have a usable title
  if (!resolveTitle(rec))
    return { ok: false, bucket: "failed",  reason: "no usable title" };

  // Broken encoding guard
  if (recordHasBrokenEncoding(rec))
    return { ok: false, bucket: "encoding", reason: "broken_encoding" };

  // error_log with content
  if (rec.error_log && String(rec.error_log).trim().length > 0)
    return { ok: false, bucket: "failed",  reason: `error_log: ${String(rec.error_log).slice(0, 50)}` };

  return { ok: true };
}

// ── Match safety ──────────────────────────────────────────────────
function evaluateMatch(enriched, existing) {
  const newTitle  = normalize(resolveTitle(enriched));
  const newAuthor = normalize(resolveAuthor(enriched));
  const oldTitle  = normalize(existing.title_he || existing.title || "");
  const oldAuthor = normalize(existing.author || "");

  const titleSim  = similarity(newTitle, oldTitle);
  const authorSim = similarity(newAuthor, oldAuthor);

  const lenRatio = newTitle.length && oldTitle.length
    ? Math.max(newTitle.length, oldTitle.length) / Math.min(newTitle.length, oldTitle.length)
    : 99;

  const reasons = [];
  if (lenRatio > MAX_LENGTH_RATIO)
    reasons.push(`title length ratio ${lenRatio.toFixed(2)} > ${MAX_LENGTH_RATIO}`);
  if (titleSim < SIM_THRESHOLD)
    reasons.push(`title similarity ${titleSim.toFixed(3)} < ${SIM_THRESHOLD}`);
  if (!isUnknown(oldAuthor) && !isUnknown(newAuthor) && authorSim < 0.75)
    reasons.push(`author similarity ${authorSim.toFixed(3)} < 0.75`);

  const score = { title: titleSim, author: authorSim, lengthRatio: lenRatio };
  return reasons.length > 0
    ? { safe: false, score, reason: reasons.join("; ") }
    : { safe: true,  score, reason: "ok" };
}

// ── CSV helpers ───────────────────────────────────────────────────
function csvEscape(val) {
  const s = String(val ?? "").replace(/\r?\n/g, " ");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const CSV_HEADERS = [
  "source_id","title","author","matched_by","action",
  "changed_fields","reason","existing_title","existing_author",
  "new_title","new_author",
];

function csvRow(obj) {
  return CSV_HEADERS.map(h => csvEscape(obj[h] ?? "")).join(",");
}

// ── STEP 1: Detect books columns ──────────────────────────────────
console.log("\n🔍  Detecting books table schema...");

const { data: sampleRows, error: sampleErr } = await supabase
  .from("books").select("*").limit(1);

if (sampleErr) { console.error("❌ ", sampleErr.message); process.exit(1); }

let ACTUAL_COLUMNS;
if (sampleRows?.length > 0) {
  ACTUAL_COLUMNS = new Set(Object.keys(sampleRows[0]));
  console.log(`✅  ${ACTUAL_COLUMNS.size} columns detected`);
} else {
  ACTUAL_COLUMNS = new Set([
    "id","title","title_he","author","description","publisher",
    "year","language","category_id","slug","is_published","created_at","updated_at",
  ]);
  console.log("⚠️   Table empty — conservative column set");
}

const NEVER_UPDATE = new Set(["id","created_at","images","image_url","category","inventory"]);
const HAS_ISBN     = ACTUAL_COLUMNS.has("isbn");
if (!HAS_ISBN) console.log("ℹ️   isbn column absent — ISBN matching disabled");

const UPDATABLE = ["title","title_he","author","description","publisher","year","language","slug"]
  .filter(f => ACTUAL_COLUMNS.has(f) && !NEVER_UPDATE.has(f));
if (HAS_ISBN) UPDATABLE.push("isbn");

console.log(`📋  Updatable: ${UPDATABLE.join(", ")}\n`);

// ── STEP 2: Categories (name → id) ───────────────────────────────
const { data: catRows } = await supabase.from("categories").select("id,name,name_he");
const CAT_NAME_TO_ID    = new Map();
for (const c of catRows ?? []) {
  if (c.name)    CAT_NAME_TO_ID.set(normalize(c.name),    c.id);
  if (c.name_he) CAT_NAME_TO_ID.set(normalize(c.name_he), c.id);
}

function resolveCategoryId(verifiedCategory) {
  // Never update category_id unless there's a clear exact match in categories table
  if (!verifiedCategory || !ACTUAL_COLUMNS.has("category_id")) return null;
  return CAT_NAME_TO_ID.get(normalize(verifiedCategory)) ?? null;
}

// ── STEP 3: Load enriched JSON ────────────────────────────────────
const inputPath = path.resolve(args.input);
if (!fs.existsSync(inputPath)) { console.error(`❌  File not found: ${inputPath}`); process.exit(1); }

let rawData;
try { rawData = JSON.parse(fs.readFileSync(inputPath, "utf8")); }
catch (e) { console.error(`❌  JSON parse error: ${e.message}`); process.exit(1); }

const allRecords = Array.isArray(rawData)
  ? rawData
  : rawData.books ?? rawData.data ?? rawData.results ?? [];

if (!allRecords.length) { console.error("❌  No records found."); process.exit(1); }
console.log(`📂  Loaded ${allRecords.length} records from ${path.basename(inputPath)}`);

// ── STEP 4: Eligibility filter ────────────────────────────────────
const eligible = [];
let skipNeedsReview = 0, skipFailed = 0, skipEncoding = 0, skipOther = 0;
const csvRows = [];  // accumulate all rows for CSV

for (const rec of allRecords) {
  const check = checkEligible(rec);
  if (check.ok) {
    eligible.push(rec);
  } else {
    switch (check.bucket) {
      case "review":   skipNeedsReview++; break;
      case "encoding": skipEncoding++;    break;
      case "failed":   skipFailed++;      break;
      default:         skipOther++;
    }
    // Add to CSV as skipped
    csvRows.push({
      source_id:       rec.id ?? "",
      title:           resolveTitle(rec),
      author:          resolveAuthor(rec),
      matched_by:      "",
      action:          "SKIPPED",
      changed_fields:  "",
      reason:          check.reason,
      existing_title:  "",
      existing_author: "",
      new_title:       resolveTitle(rec),
      new_author:      resolveAuthor(rec),
    });
  }
}

console.log(`✅  Eligible: ${eligible.length} / ${allRecords.length}\n`);

// ── STEP 5: Load existing books ───────────────────────────────────
console.log("🔌  Fetching books from Supabase...");

const selectCols = ["id","title","title_he","author","slug","category_id",
                    ...(HAS_ISBN ? ["isbn"] : [])];

const { data: existingBooks, error: fetchErr } = await supabase
  .from("books").select(selectCols.join(", "));

if (fetchErr) { console.error("❌ ", fetchErr.message); process.exit(1); }
console.log(`📚  ${existingBooks.length} books in Supabase\n`);

// ── STEP 6: Load book_images for drive_id matching ────────────────
const { data: imageRows } = await supabase.from("book_images").select("book_id, image_url");
const driveIdToBookId     = new Map();
for (const img of imageRows ?? []) {
  const id = driveFileId(img.image_url);
  if (id && !driveIdToBookId.has(id)) driveIdToBookId.set(id, img.book_id);
}
const byId = new Map(existingBooks.map(b => [b.id, b]));

// ── STEP 7: Build lookup indexes ──────────────────────────────────
const byIsbn    = new Map();
const byNormKey = new Map();

for (const book of existingBooks) {
  if (HAS_ISBN && book.isbn) byIsbn.set(String(book.isbn).trim(), book);
  const key = `${normalize(book.title_he || book.title)}__${normalize(book.author)}`;
  if (key !== "__") byNormKey.set(key, book);
}

// ── STEP 8: Payload builder ───────────────────────────────────────
function buildPayload(rec) {
  // Never update images — images live in book_images table, not books
  const catId = resolveCategoryId(rec.verified_category);

  const raw = {
    title:       resolveTitle(rec)   || undefined,
    author:      resolveAuthor(rec)  || undefined,
    description: rec.verified_description?.trim() || undefined,
    publisher:   rec.verified_publisher?.trim()   || undefined,
    year:        rec.verified_year ? parseInt(rec.verified_year, 10) : undefined,
    language:    rec.verified_language?.trim()    || undefined,
    isbn:        HAS_ISBN ? (resolveIsbn(rec) || undefined) : undefined,
    category_id: catId || undefined,
  };

  const payload = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v === "") continue;
    if (k === "year" && isNaN(v)) continue;
    if (!ACTUAL_COLUMNS.has(k) || NEVER_UPDATE.has(k)) continue;
    payload[k] = v;
  }
  payload.updated_at = new Date().toISOString();
  return payload;
}

function diffFields(existing, payload) {
  return Object.entries(payload)
    .filter(([k]) => k !== "updated_at")
    .filter(([k, nv]) => String(existing[k] ?? "").trim() !== String(nv ?? "").trim())
    .map(([field, newVal]) => ({ field, old: existing[field], new: newVal }));
}

// ── STEP 9: Match with safety evaluation ─────────────────────────
const safeMatches   = [];
const reviewMatches = [];
const newBooks      = [];

for (const rec of eligible) {
  let candidate = null;
  let matchedBy = null;

  // 1. ISBN (trusted — skip similarity check)
  if (!candidate && HAS_ISBN) {
    const isbn = resolveIsbn(rec);
    if (isbn) {
      candidate = byIsbn.get(isbn);
      if (candidate) matchedBy = "isbn";
    }
  }

  // 2. Exact normalized key
  if (!candidate) {
    const titleCandidates  = [rec.verified_title, rec.raw_title, rec.existing_title].filter(Boolean);
    const authorCandidates = [rec.verified_author, rec.raw_author, rec.existing_author].filter(Boolean);
    outer: for (const t of titleCandidates) {
      for (const a of authorCandidates) {
        const key = `${normalize(t)}__${normalize(a)}`;
        if (key !== "__" && byNormKey.has(key)) {
          candidate = byNormKey.get(key);
          matchedBy = "title+author(exact)";
          break outer;
        }
      }
    }
  }

  // 3. Fuzzy title similarity
  if (!candidate) {
    let bestScore = 0, bestBook = null;
    const normNew = normalize(resolveTitle(rec));
    for (const book of existingBooks) {
      const normOld = normalize(book.title_he || book.title || "");
      const s = similarity(normNew, normOld);
      if (s > bestScore && s >= SIM_THRESHOLD) { bestScore = s; bestBook = book; }
    }
    if (bestBook) { candidate = bestBook; matchedBy = `fuzzy(${bestScore.toFixed(3)})`; }
  }

  // 4. Drive ID via book_images (supplementary only)
  if (!candidate) {
    for (const driveId of driveIdsFromEnriched(rec)) {
      const bookId = driveIdToBookId.get(driveId);
      if (bookId) { candidate = byId.get(bookId); matchedBy = "drive_id(book_images)"; break; }
    }
  }

  if (!candidate) {
    newBooks.push(rec);
    csvRows.push({
      source_id: rec.id ?? "", title: resolveTitle(rec), author: resolveAuthor(rec),
      matched_by: "", action: "INSERT", changed_fields: "", reason: "no match found",
      existing_title: "", existing_author: "",
      new_title: resolveTitle(rec), new_author: resolveAuthor(rec),
    });
    continue;
  }

  // Safety evaluation (ISBN is always trusted)
  const isTrusted = matchedBy === "isbn";
  const safety = isTrusted
    ? { safe: true, score: { title: 1, author: 1, lengthRatio: 1 }, reason: "isbn-exact" }
    : evaluateMatch(rec, candidate);

  // Extra guard: don't overwrite known title/author with too-different values
  let flagged = !safety.safe;
  if (!flagged && !isUnknown(candidate.title_he || candidate.title) && safety.score.title < 0.88) {
    flagged = true;
    safety.reason = `title overwrite risk (sim=${safety.score.title.toFixed(3)})`;
  }
  if (!flagged && !isUnknown(candidate.author) && !isUnknown(resolveAuthor(rec)) && safety.score.author < 0.75) {
    flagged = true;
    safety.reason = `author overwrite risk (sim=${safety.score.author.toFixed(3)})`;
  }

  if (flagged) {
    reviewMatches.push({
      rec, existing: candidate, matchedBy,
      reason:         safety.reason, score: safety.score,
      newTitle:       resolveTitle(rec),  newAuthor:      resolveAuthor(rec),
      existingTitle:  candidate.title_he || candidate.title,
      existingAuthor: candidate.author,
    });
    csvRows.push({
      source_id: rec.id ?? "", title: resolveTitle(rec), author: resolveAuthor(rec),
      matched_by: matchedBy, action: "BLOCKED",
      changed_fields: "", reason: safety.reason,
      existing_title: candidate.title_he || candidate.title, existing_author: candidate.author,
      new_title: resolveTitle(rec), new_author: resolveAuthor(rec),
    });
    continue;
  }

  const payload = buildPayload(rec);
  const diff    = diffFields(candidate, payload);
  safeMatches.push({ rec, existing: candidate, payload, diff, matchedBy, score: safety.score });
  csvRows.push({
    source_id:       rec.id ?? "",
    title:           resolveTitle(rec),
    author:          resolveAuthor(rec),
    matched_by:      matchedBy,
    action:          diff.length > 0 ? "UPDATE" : "NO_CHANGE",
    changed_fields:  diff.map(d => d.field).join("|"),
    reason:          diff.length === 0 ? "already up-to-date" : "",
    existing_title:  candidate.title_he || candidate.title,
    existing_author: candidate.author,
    new_title:       resolveTitle(rec),
    new_author:      resolveAuthor(rec),
  });
}

const withChanges = safeMatches.filter(m => m.diff.length > 0);
const noChanges   = safeMatches.filter(m => m.diff.length === 0);

// ── STEP 10: Write suspicious.json ───────────────────────────────
const suspiciousPath = path.resolve(args.suspicious);
fs.mkdirSync(path.dirname(suspiciousPath), { recursive: true });
fs.writeFileSync(
  suspiciousPath,
  JSON.stringify(reviewMatches.map(m => ({
    reason:          m.reason,
    matchedBy:       m.matchedBy,
    score:           m.score,
    enriched_title:  m.newTitle,
    enriched_author: m.newAuthor,
    existing_id:     m.existing.id,
    existing_title:  m.existingTitle,
    existing_author: m.existingAuthor,
  })), null, 2),
  "utf8"
);

// ── STEP 11: Write CSV report ─────────────────────────────────────
const reportPath = path.resolve(args.report);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const csvContent = [CSV_HEADERS.join(","), ...csvRows.map(csvRow)].join("\n");
fs.writeFileSync(reportPath, csvContent, "utf8");

// ── STEP 12: Print report ─────────────────────────────────────────
const backupDir  = path.resolve(args["backup-dir"]);
const backupFile = path.join(
  backupDir,
  `books-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);

console.log("═".repeat(68));
console.log(args.apply ? "🟢  APPLY MODE" : "🔵  DRY-RUN — nothing written to Supabase");
if (args.strict) console.log(`⚙️   STRICT MODE — threshold=${SIM_THRESHOLD}`);
else             console.log(`⚙️   threshold=${SIM_THRESHOLD}  (--strict raises to 0.92)`);
console.log("═".repeat(68));

console.log(`
📊  Eligibility
   Total in file              : ${allRecords.length}
   Successful scan (eligible) : ${eligible.length}
   Skipped — needs review     : ${skipNeedsReview}
   Skipped — broken encoding  : ${skipEncoding}
   Skipped — failed / error   : ${skipFailed}
   Skipped — other            : ${skipOther}

🔍  Matching results
   ✅  SAFE MATCHES            : ${safeMatches.length}
       → with actual changes   : ${withChanges.length}   ← WILL UPDATE
       → already up-to-date    : ${noChanges.length}
   ⚠️   POSSIBLE FALSE MATCHES : ${reviewMatches.length}   ← BLOCKED
   ➕  NEW (no match)          : ${newBooks.length}   ← WILL INSERT
   ──────────────────────────────────────────────────────────────
   Total writes if applied     : ${withChanges.length + newBooks.length}

📄  Reports
   CSV    → ${reportPath}  (${csvRows.length} rows)
   Blocked → ${suspiciousPath}  (${reviewMatches.length} records)
`);

if (args.apply) console.log(`💾  Backup will be saved to:\n    ${backupFile}\n`);

// Changes preview
if (withChanges.length > 0) {
  const shown = withChanges.slice(0, 20);
  console.log(`── SAFE changes preview (${shown.length} of ${withChanges.length}) ${"─".repeat(20)}`);
  for (const { existing, diff, matchedBy, score } of shown) {
    const lbl = existing.title_he || existing.title || "(no title)";
    console.log(`\n  ✅  ${lbl}  [${matchedBy}  title-sim=${score.title.toFixed(3)}]`);
    for (const { field, old: o, new: n } of diff) {
      if (args.verbose) {
        console.log(`     ${field}:`);
        console.log(`       OLD: ${String(o ?? "—").slice(0, 90)}`);
        console.log(`       NEW: ${String(n ?? "—").slice(0, 90)}`);
      } else {
        console.log(`     · ${field}`);
      }
    }
  }
  if (withChanges.length > 20) console.log(`  … +${withChanges.length - 20} more`);
}

// Blocked preview
if (reviewMatches.length > 0) {
  const shown = reviewMatches.slice(0, 15);
  console.log(`\n── ⚠️  BLOCKED false matches (${shown.length} of ${reviewMatches.length}) ${"─".repeat(14)}`);
  for (const m of shown) {
    console.log(`\n  ⚠️   ENRICHED : "${m.newTitle}" / "${m.newAuthor}"`);
    console.log(`       EXISTING : "${m.existingTitle}" / "${m.existingAuthor}"`);
    console.log(`       REASON   : ${m.reason}`);
  }
  if (reviewMatches.length > 15) console.log(`  … +${reviewMatches.length - 15} more → see suspicious.json`);
}

// New books preview
if (newBooks.length > 0) {
  const shown = newBooks.slice(0, 8);
  console.log(`\n── NEW books (${shown.length} of ${newBooks.length}) ${"─".repeat(30)}`);
  for (const r of shown) console.log(`  ➕  "${resolveTitle(r)}"  —  ${resolveAuthor(r)}`);
  if (newBooks.length > 8) console.log(`  … +${newBooks.length - 8} more`);
}

// Dry-run exit
if (!args.apply) {
  console.log(`
${"─".repeat(68)}
ℹ️   Dry-run complete. Zero changes made.

Next steps:
  1. Open ${reportPath}  (full CSV)
  2. Review ${suspiciousPath}  (${reviewMatches.length} blocked)
  3. Run --verbose to see field diffs
  4. Run --strict to tighten threshold to 0.92
  5. When ready: --apply
${"─".repeat(68)}
`);
  process.exit(0);
}

// ── STEP 13: Confirm ──────────────────────────────────────────────
const totalWrites = withChanges.length + newBooks.length;
if (totalWrites > 50 && !args.yes) {
  console.log(`\n⚠️   ${totalWrites} records will be written.`);
  const ans = await promptConfirm("   Type YES to continue: ");
  if (ans !== "yes") { console.log("   Aborted."); process.exit(0); }
}

// ── STEP 14: Backup ───────────────────────────────────────────────
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  backupFile,
  JSON.stringify(withChanges.map(m => m.existing), null, 2),
  "utf8"
);
console.log(`\n💾  Backup → ${backupFile}  (${withChanges.length} records)\n`);

// ── STEP 15: Updates ─────────────────────────────────────────────
let updateOk = 0, updateFail = 0;
if (withChanges.length > 0) {
  console.log(`🔄  Updating ${withChanges.length} books...`);
  for (const { existing, payload } of withChanges) {
    const safe = Object.fromEntries(
      Object.entries(payload).filter(([k]) => ACTUAL_COLUMNS.has(k) && !NEVER_UPDATE.has(k))
    );
    const { error } = await supabase.from("books").update(safe).eq("id", existing.id);
    if (error) { console.error(`  ❌  ${existing.title}: ${error.message}`); updateFail++; }
    else { if (args.verbose) console.log(`  ✅  ${existing.title}`); updateOk++; }
  }
}

// ── STEP 16: Inserts ─────────────────────────────────────────────
let insertOk = 0, insertFail = 0;
if (newBooks.length > 0) {
  console.log(`\n➕  Inserting ${newBooks.length} new books...`);
  for (const rec of newBooks) {
    const payload = buildPayload(rec);
    if (!payload.slug) {
      payload.slug = normalize(resolveTitle(rec)).replace(/\s+/g, "-").slice(0, 90)
        + "-" + Date.now().toString(36);
    }
    payload.is_published ??= false;
    payload.created_at = new Date().toISOString();
    const safe = Object.fromEntries(
      Object.entries(payload).filter(([k]) => ACTUAL_COLUMNS.has(k) && !NEVER_UPDATE.has(k))
    );
    const { error } = await supabase.from("books").insert(safe);
    if (error) { console.error(`  ❌  ${safe.title}: ${error.message}`); insertFail++; }
    else { if (args.verbose) console.log(`  ✅  ${safe.title}`); insertOk++; }
  }
}

console.log(`
${"═".repeat(68)}
✅  Done.
   Updated : ${updateOk}${updateFail ? `  (${updateFail} failed)` : ""}
   Inserted: ${insertOk}${insertFail ? `  (${insertFail} failed)` : ""}
   Blocked : ${reviewMatches.length} → ${suspiciousPath}
   Backup  : ${backupFile}
   CSV     : ${reportPath}
${"═".repeat(68)}
`);
