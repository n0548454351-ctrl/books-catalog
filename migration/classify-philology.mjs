#!/usr/bin/env node
/**
 * classify-philology.mjs
 * ─────────────────────────────────────────────────────────────────
 * Scans enriched-books.json + Supabase books table and identifies
 * books relevant to Philology, Linguistics, Classical Studies, etc.
 *
 * Usage:
 *   node migration/classify-philology.mjs
 *   node migration/classify-philology.mjs --input migration/enriched-books.json
 *   node migration/classify-philology.mjs --supabase-only
 *   node migration/classify-philology.mjs --min-score 0.3
 *   node migration/classify-philology.mjs --verbose
 *
 * Flags:
 *   --input <file>       Enriched JSON (default: migration/enriched-books.json)
 *   --supabase-only      Only scan Supabase, skip local JSON
 *   --json-only          Only scan local JSON, skip Supabase
 *   --min-score <0-1>    Minimum score to include in report (default: 0.15)
 *   --verbose            Print each scored book
 *   --help
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
    input:          { type: "string",  default: "./migration/enriched-books.json" },
    "supabase-only":{ type: "boolean", default: false },
    "json-only":    { type: "boolean", default: false },
    "min-score":    { type: "string",  default: "0.15" },
    verbose:        { type: "boolean", default: false },
    help:           { type: "boolean", default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`
Usage:
  node migration/classify-philology.mjs [options]

Options:
  --input <file>        Enriched JSON (default: migration/enriched-books.json)
  --supabase-only       Only scan Supabase
  --json-only           Only scan local JSON
  --min-score <n>       Min score 0-1 to include (default: 0.15)
  --verbose             Print each scored book
  --help
`);
  process.exit(0);
}

const MIN_SCORE = Math.max(0, Math.min(1, parseFloat(args["min-score"] ?? "0.15")));

// ── Supabase ──────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ── Report paths ──────────────────────────────────────────────────
const REPORT_DIR = path.resolve("./migration/reports");
const REPORT_CSV  = path.join(REPORT_DIR, "philology-books.csv");
const REPORT_TOP  = path.join(REPORT_DIR, "philology-top100.csv");

// ═════════════════════════════════════════════════════════════════
// CLASSIFICATION ENGINE
// ═════════════════════════════════════════════════════════════════

// ── Philology keyword groups (each has a weight) ──────────────────
const KEYWORD_GROUPS = [

  // ── Core philology terms (highest weight) ──────────────────────
  {
    weight: 1.0,
    tags: ["classical_philology"],
    terms: [
      "philology", "philological", "philologisch", "philologue",
      "textual criticism", "lower criticism", "textual transmission",
      "stemma", "stemmatic", "manuscript tradition", "recensio",
      "editio princeps", "critical edition", "apparatus criticus",
    ],
  },

  // ── Greek language & literature ────────────────────────────────
  {
    weight: 0.9,
    tags: ["greek"],
    terms: [
      "ancient greek", "classical greek", "koine greek", "attic greek",
      "ionic greek", "homeric", "homer", "iliad", "odyssey",
      "greek grammar", "greek lexicon", "greek dictionary",
      "liddell", "scott", "greek tragedy", "greek comedy",
      "septuagint", "lxx", "new testament greek", "byzantine greek",
      "greek papyri", "greek epigraphy", "greek inscriptions",
      "mycenaean", "linear b", "aeschylus", "sophocles", "euripides",
      "aristophanes", "thucydides", "herodotus", "plato", "aristotle",
      "demosthenes", "lysias", "pindar", "sappho", "hesiod",
    ],
  },

  // ── Latin language & literature ────────────────────────────────
  {
    weight: 0.9,
    tags: ["latin"],
    terms: [
      "latin", "classical latin", "medieval latin", "vulgar latin",
      "latin grammar", "latin dictionary", "latin lexicon",
      "lewis and short", "thesaurus linguae latinae",
      "cicero", "virgil", "vergil", "ovid", "horace", "tacitus",
      "livy", "caesar", "sallust", "lucretius", "catullus",
      "plautus", "terence", "seneca", "pliny", "juvenal",
      "latin inscriptions", "corpus inscriptionum latinarum",
      "neo-latin", "renaissance latin", "ecclesiastical latin",
    ],
  },

  // ── Semitic languages ──────────────────────────────────────────
  {
    weight: 0.9,
    tags: ["semitic_languages"],
    terms: [
      "semitic", "proto-semitic", "semitic languages",
      "akkadian", "babylonian", "assyrian", "cuneiform",
      "ugaritic", "phoenician", "aramaic", "syriac",
      "classical arabic", "arabic grammar", "arabic philology",
      "ethiopic", "ge'ez", "tigrinya", "amharic",
      "maltese", "south arabian",
    ],
  },

  // ── Hebrew & Jewish philology ──────────────────────────────────
  {
    weight: 0.9,
    tags: ["jewish_philology", "biblical_studies"],
    terms: [
      "biblical hebrew", "classical hebrew", "mishnaic hebrew",
      "hebrew grammar", "hebrew lexicon", "hebrew dictionary",
      "gesenius", "brown driver briggs", "biblical aramaic",
      "dead sea scrolls", "qumran", "talmud", "mishnah",
      "midrash", "rabbinic", "rabbinica", "targum", "targumim",
      "masoretic", "masoretes", "massorah", "ketiv", "qere",
      "septuagint", "peshitta", "vulgate", "old testament",
      "hebrew bible", "torah", "tanakh", "pentateuch",
      "talmudic", "halakha", "aggadah", "responsa", "genizah",
      "cairo geniza", "yiddish philology",
    ],
  },

  // ── Manuscripts & codicology ───────────────────────────────────
  {
    weight: 0.85,
    tags: ["manuscripts", "codicology"],
    terms: [
      "manuscript", "manuscripts", "codex", "codices",
      "palimpsest", "parchment", "vellum", "papyrus", "papyri",
      "codicology", "codicological", "illuminated manuscript",
      "scriptorium", "scribe", "scribal", "paleography",
      "palaeography", "handwriting", "calligraphy",
      "book of hours", "breviary", "lectionary",
    ],
  },

  // ── Epigraphy & papyrology ─────────────────────────────────────
  {
    weight: 0.85,
    tags: ["epigraphy", "papyrology"],
    terms: [
      "epigraphy", "epigraphic", "inscription", "inscriptions",
      "ostracon", "ostraca", "stele", "stela",
      "papyrology", "papyrological", "papyrus", "papyri",
      "oxyrhynchus", "elephantine", "herculaneum",
      "numismatics", "seals", "sigillography",
    ],
  },

  // ── Indo-European linguistics ──────────────────────────────────
  {
    weight: 0.8,
    tags: ["linguistics", "indo_european"],
    terms: [
      "indo-european", "proto-indo-european", "pie",
      "comparative linguistics", "historical linguistics",
      "historical grammar", "comparative grammar",
      "language reconstruction", "etymology", "etymological",
      "ablaut", "umlaut", "grimm's law", "verner's law",
      "sanskrit", "vedic", "avestan", "old persian",
      "old irish", "old english", "gothic", "old norse",
      "slavic", "baltic", "anatolian", "hittite", "tocharian",
      "armenian", "albanian", "illyrian",
    ],
  },

  // ── Lexicography & grammar ─────────────────────────────────────
  {
    weight: 0.8,
    tags: ["lexicography", "grammar"],
    terms: [
      "lexicography", "lexicographical", "lexicon", "glossary",
      "thesaurus linguae", "concordance", "concordances",
      "grammar", "grammatical", "syntax", "morphology",
      "phonology", "phonetics", "prosody", "meter", "metre",
      "metrics", "versification", "scansion",
      "dictionary of", "vocabularium", "wörterbuch",
      "dictionnaire", "dizionario",
    ],
  },

  // ── Ancient history & classical studies ───────────────────────
  {
    weight: 0.7,
    tags: ["classical_studies"],
    terms: [
      "classical antiquity", "classical world", "ancient greece",
      "ancient rome", "greco-roman", "hellenistic",
      "byzantine", "byzantium", "late antiquity",
      "classical association", "classical quarterly",
      "harvard studies classical philology",
      "transactions american philological",
      "american journal philology",
      "greek roman byzantine",
    ],
  },

  // ── Biblical & patristic studies ──────────────────────────────
  {
    weight: 0.75,
    tags: ["biblical_studies", "patristics"],
    terms: [
      "biblical", "old testament", "new testament",
      "patristics", "patristic", "church fathers",
      "early christian", "apocrypha", "pseudepigrapha",
      "intertestamental", "second temple",
      "biblical commentary", "exegesis", "hermeneutics",
      "biblical theology", "textual history",
    ],
  },

  // ── Medieval texts & philology ─────────────────────────────────
  {
    weight: 0.7,
    tags: ["medieval_texts"],
    terms: [
      "medieval", "mediaeval", "middle ages",
      "middle english", "old english", "anglo-saxon",
      "middle high german", "old high german",
      "old french", "provençal", "troubadour",
      "medieval latin", "scholastic", "scholasticism",
      "chanson de geste", "minnesang",
      "beowulf", "chaucer", "dante",
    ],
  },

  // ── Academic journals in classics/philology ────────────────────
  {
    weight: 0.85,
    tags: ["journal", "periodical"],
    terms: [
      "journal of classical", "transactions of",
      "proceedings of the classical",
      "bulletin of the classical",
      "annual of the",
      "review of",
      "quarterly",
      "philologische",
      "zeitschrift für",
      "revue des études",
      "musée belge",
      "mnemosyne",
      "hermes",
      "glotta",
      "eranos",
      "gnomon",
    ],
    requireContext: ["classical", "philolog", "greek", "latin", "ancient", "semitic"],
  },

];

// ── False positive exclusion terms ────────────────────────────────
const FALSE_POSITIVE_GROUPS = [

  // Modern tech
  {
    weight: -0.8,
    terms: [
      "azure cloud", "aws lambda", "kubernetes", "docker",
      "microservices", "devops", "agile", "scrum",
      "javascript", "python programming", "machine learning model",
      "data science", "neural network", "deep learning",
      "blockchain", "cryptocurrency", "nft",
      "software engineering", "web development", "api design",
    ],
  },

  // Modern business
  {
    weight: -0.6,
    terms: [
      "startup", "entrepreneurship", "leadership skills",
      "management consulting", "marketing strategy",
      "stock market", "investing for beginners",
      "real estate", "personal finance",
      "diet plan", "weight loss",
      "self-help", "mindfulness app",
    ],
  },

  // Generic modern reference (but NOT ancient dictionaries)
  {
    weight: -0.3,
    terms: [
      "encyclopedia britannica 2020",
      "world almanac",
      "guinness book",
      "modern english dictionary",
    ],
  },

];

// ─── Scoring engine ───────────────────────────────────────────────

// ── Scholars whose authorship signals high relevance ──────────────
const SCHOLAR_AUTHORS = [
  // Dead Sea Scrolls / OT Textual Criticism
  { name: "Emanuel Tov",           bonus: 0.9, tag: "biblical_textual_criticism" },
  { name: "Geza Vermes",           bonus: 0.8, tag: "jewish_philology" },
  { name: "Lawrence Schiffman",    bonus: 0.8, tag: "jewish_philology" },
  { name: "Michael Stone",         bonus: 0.7, tag: "jewish_philology" },
  { name: "R.H. Charles",          bonus: 0.7, tag: "biblical_studies" },
  { name: "R. H. Charles",         bonus: 0.7, tag: "biblical_studies" },
  // Semitic / Aramaic / Syriac
  { name: "Michael Sokoloff",      bonus: 0.9, tag: "semitic_languages" },
  { name: "Geoffrey Khan",         bonus: 0.9, tag: "semitic_languages" },
  { name: "Sebastian Brock",       bonus: 0.9, tag: "semitic_languages" },
  { name: "Gideon Goldenberg",     bonus: 0.8, tag: "semitic_languages" },
  // Classical
  { name: "Liddell",               bonus: 0.8, tag: "greek" },
  { name: "Henry George Liddell",  bonus: 0.8, tag: "greek" },
  { name: "Lewis and Short",       bonus: 0.7, tag: "latin" },
  { name: "Charlton T. Lewis",     bonus: 0.7, tag: "latin" },
  { name: "August Immanuel Bekker",bonus: 0.6, tag: "classical_philology" },
  { name: "Theodor Mommsen",       bonus: 0.7, tag: "classical_philology" },
];

// ── Title-level strong signals (checked on title only, not full blob) ─
const TITLE_BOOST_TERMS = [
  { term: "textual criticism",   bonus: 0.7, tag: "textual_criticism" },
  { term: "concordance",         bonus: 0.6, tag: "lexicography" },
  { term: "grammar",             bonus: 0.5, tag: "grammar" },
  { term: "lexicon",             bonus: 0.6, tag: "lexicography" },
  { term: "manuscript",          bonus: 0.5, tag: "manuscripts" },
  { term: "papyri",              bonus: 0.6, tag: "papyrology" },
  { term: "septuagint",          bonus: 0.7, tag: "biblical_studies" },
  { term: "talmudic",            bonus: 0.6, tag: "jewish_philology" },
  { term: "syriac",              bonus: 0.7, tag: "semitic_languages" },
  { term: "aramaic",             bonus: 0.7, tag: "semitic_languages" },
  { term: "philology",           bonus: 0.8, tag: "classical_philology" },
  { term: "greek",               bonus: 0.4, tag: "greek" },
  { term: "latin",               bonus: 0.4, tag: "latin" },
  { term: "inscriptions",        bonus: 0.5, tag: "epigraphy" },
  { term: "epigraphy",           bonus: 0.6, tag: "epigraphy" },
  { term: "papyrology",          bonus: 0.6, tag: "papyrology" },
  { term: "paleography",         bonus: 0.6, tag: "manuscripts" },
  { term: "palaeography",        bonus: 0.6, tag: "manuscripts" },
  { term: "masoretic",           bonus: 0.7, tag: "jewish_philology" },
  { term: "codicology",          bonus: 0.6, tag: "manuscripts" },
  { term: "hebrew grammar",      bonus: 0.8, tag: "jewish_philology" },
  { term: "greek grammar",       bonus: 0.8, tag: "greek" },
  { term: "latin grammar",       bonus: 0.8, tag: "latin" },
  { term: "hebrew lexicon",      bonus: 0.8, tag: "jewish_philology" },
  { term: "greek lexicon",       bonus: 0.8, tag: "greek" },
  { term: "indo-european",       bonus: 0.7, tag: "indo_european" },
  { term: "dead sea scrolls",    bonus: 0.8, tag: "jewish_philology" },
  { term: "qumran",              bonus: 0.7, tag: "jewish_philology" },
];

// ── Curated journal titles → guaranteed boost ──────────────────────
const JOURNAL_BOOSTS = [
  { pattern: /phoenix/i,                                    bonus: 0.5, tag: "journal" },
  { pattern: /transactions.*american.*philological/i,       bonus: 0.9, tag: "journal" },
  { pattern: /american.*philological.*association/i,        bonus: 0.9, tag: "journal" },
  { pattern: /cambridge.*philological.*society/i,           bonus: 0.9, tag: "journal" },
  { pattern: /proceedings.*cambridge.*philological/i,       bonus: 0.9, tag: "journal" },
  { pattern: /mnemosyne/i,                                  bonus: 0.8, tag: "journal" },
  { pattern: /harvard.*studies.*classical.*philology/i,     bonus: 0.9, tag: "journal" },
  { pattern: /american.*journal.*philology/i,               bonus: 0.9, tag: "journal" },
  { pattern: /greek.*roman.*byzantine/i,                    bonus: 0.8, tag: "journal" },
  { pattern: /bibliographical.*society/i,                   bonus: 0.6, tag: "journal" },
  { pattern: /papers.*bibliographical/i,                    bonus: 0.6, tag: "journal" },
  { pattern: /classical.*quarterly/i,                       bonus: 0.8, tag: "journal" },
  { pattern: /classical.*review/i,                          bonus: 0.8, tag: "journal" },
  { pattern: /journal.*jewish.*studies/i,                   bonus: 0.8, tag: "journal" },
  { pattern: /journal.*semitic.*studies/i,                  bonus: 0.8, tag: "journal" },
  { pattern: /vetus.*testamentum/i,                         bonus: 0.8, tag: "journal" },
  { pattern: /zeitschrift.*alttestamentlich/i,              bonus: 0.8, tag: "journal" },
  { pattern: /hermes.*zeitschrift/i,                        bonus: 0.7, tag: "journal" },
  { pattern: /glotta/i,                                 bonus: 0.8, tag: "journal" },
  { pattern: /hermes.*classical/i,                      bonus: 0.7, tag: "journal" },
  { pattern: /gnomon/i,                                 bonus: 0.7, tag: "journal" },
  { pattern: /eranos/i,                                 bonus: 0.6, tag: "journal" },
];

// ── Curated collection definitions ───────────────────────────────
const CURATED_COLLECTIONS = {
  "Jewish Philology": (b) =>
    b.philology_tags.includes("jewish_philology") ||
    b.philology_tags.includes("biblical_studies") ||
    b.philology_tags.includes("semitic_languages"),

  "Classical Philology": (b) =>
    b.philology_tags.includes("classical_philology") ||
    b.philology_tags.includes("greek") ||
    b.philology_tags.includes("latin"),

  "Semitic Languages": (b) =>
    b.philology_tags.includes("semitic_languages") ||
    /(aramaic|syriac|akkadian|ugaritic|phoenician)/i.test(b.matched_terms),

  "Greek & Latin": (b) =>
    b.philology_tags.includes("greek") ||
    b.philology_tags.includes("latin"),

  "Biblical Textual Criticism": (b) =>
    b.philology_tags.includes("textual_criticism") ||
    b.philology_tags.includes("biblical_studies") ||
    /(septuagint|masoretic|dead sea scrolls|textual criticism)/i.test(b.matched_terms),

  "Manuscripts & Papyrology": (b) =>
    b.philology_tags.includes("manuscripts") ||
    b.philology_tags.includes("codicology") ||
    b.philology_tags.includes("papyrology") ||
    b.philology_tags.includes("epigraphy"),
};


function normalize(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether a term appears in text.
 * Handles multi-word phrases and single words with word-boundary awareness.
 */
function termInText(term, text) {
  if (!text) return false;
  if (term.includes(" ")) {
    return text.includes(term);
  }
  // single word — word boundary check
  const re = new RegExp(`(?<![a-z])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "i");
  return re.test(text);
}

function scoreBook(book) {
  // Title-only text (for title-specific boosts)
  const titleText = normalize([
    book.verified_title, book.title, book.raw_title, book.existing_title,
  ].filter(Boolean).join(" "));

  const authorText = normalize([
    book.verified_author, book.author, book.raw_author, book.existing_author,
  ].filter(Boolean).join(" "));

  // Combine all text fields
  const textBlob = normalize([
    book.title, book.title_he,
    book.raw_title, book.existing_title,
    book.verified_title,
    book.subtitle, book.raw_subtitle,
    book.author, book.verified_author, book.raw_author, book.existing_author,
    book.description, book.verified_description, book.google_books_description,
    book.verified_subjects, book.google_books_categories,
    book.openlibrary_subjects,
    book.verified_category,
    book.publisher, book.verified_publisher, book.google_books_publisher,
  ].filter(Boolean).join(" "));

  const tags     = new Set();
  let   rawScore = 0;
  const matched  = [];

  // ── Positive signals ─────────────────────────────────────────
  for (const group of KEYWORD_GROUPS) {
    let groupHit = false;

    // If group has requireContext, at least one context term must appear
    if (group.requireContext) {
      const hasContext = group.requireContext.some(c => textBlob.includes(c));
      if (!hasContext) continue;
    }

    for (const term of group.terms) {
      if (termInText(term, textBlob)) {
        if (!groupHit) {
          rawScore += group.weight;
          groupHit = true;
        } else {
          rawScore += group.weight * 0.2; // diminishing returns per extra term
        }
        matched.push(term);
        for (const tag of group.tags) tags.add(tag);
      }
    }
  }

  // ── Title-level boosts (title only, not full blob) ──────────────
  for (const { term, bonus, tag } of TITLE_BOOST_TERMS) {
    if (termInText(term, titleText)) {
      rawScore += bonus;
      matched.push(`[title:${term}]`);
      tags.add(tag);
    }
  }

  // ── Scholar author bonus ──────────────────────────────────────
  for (const { name, bonus, tag } of SCHOLAR_AUTHORS) {
    if (termInText(name.toLowerCase(), authorText)) {
      rawScore += bonus;
      matched.push(`[scholar:${name}]`);
      tags.add(tag);
      break; // one author match per record is enough
    }
  }

  // ── Journal title boosts ──────────────────────────────────────
  for (const { pattern, bonus, tag } of JOURNAL_BOOSTS) {
    if (pattern.test(titleText)) {
      rawScore += bonus;
      matched.push(`[journal:${pattern.source}]`);
      tags.add(tag);
      tags.add("journal");
      break;
    }
  }

  // ── Negative signals ──────────────────────────────────────────
  for (const group of FALSE_POSITIVE_GROUPS) {
    for (const term of group.terms) {
      if (termInText(term, textBlob)) {
        rawScore += group.weight; // weight is negative
        matched.push(`[excluded:${term}]`);
      }
    }
  }

  // ── Normalize to 0-1 ─────────────────────────────────────────
  // Max theoretical raw ~ boosts(3) + groups(12) + scholars(1) + titles(3) ≈ 20
  const score = Math.max(0, Math.min(1, rawScore / 12));

  // ── Confidence tier ───────────────────────────────────────────
  let confidence;
  if      (score >= 0.55) confidence = "high";
  else if (score >= 0.30) confidence = "medium";
  else if (score >= 0.15) confidence = "low";
  else                    confidence = "none";

  // ── Journal detection ─────────────────────────────────────────
  const isJournal = tags.has("journal") || tags.has("periodical") ||
    /\b(journal|transactions|proceedings|bulletin|review|quarterly|annual|yearbook)\b/i.test(
      textBlob
    ) && /\b(classical|philolog|greek|latin|ancient|semitic|hebrew|biblical)\b/i.test(textBlob);

  return {
    score:          Math.round(score * 1000) / 1000,
    confidence,
    tags:           [...tags].sort().join("|"),
    matched:        [...new Set(matched.filter(m => !m.startsWith("[excluded")))].slice(0, 12),
    is_journal:     isJournal,
    is_excluded:    matched.some(m => m.startsWith("[excluded")),
  };
}

// ─── CSV helpers ──────────────────────────────────────────────────
function csvEsc(val) {
  const s = String(val ?? "").replace(/\r?\n/g, " ").replace(/"/g, "''");
  return s.includes(",") || s.includes('"') ? `"${s}"` : s;
}

// ─── Deduplication ────────────────────────────────────────────────
function dedupKey(book) {
  const t = normalize(book.verified_title || book.title || book.raw_title || "");
  const a = normalize(book.verified_author || book.author || book.raw_author || "");
  return `${t}__${a}`;
}

// ═════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════

console.log("\n📚  Philology Classifier\n" + "─".repeat(50));

const allBooks = [];

// ── Source 1: enriched-books.json ────────────────────────────────
if (!args["supabase-only"]) {
  const inputPath = path.resolve(args.input);
  if (fs.existsSync(inputPath)) {
    const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
    const arr = Array.isArray(raw) ? raw : raw.books ?? raw.data ?? [];
    console.log(`📂  Loaded ${arr.length} records from ${path.basename(inputPath)}`);
    for (const r of arr) {
      allBooks.push({ _source: "json", ...r });
    }
  } else {
    console.warn(`⚠️   JSON file not found: ${inputPath}`);
  }
}

// ── Source 2: Supabase books table ───────────────────────────────
if (!args["json-only"]) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn("⚠️   Supabase credentials missing — skipping DB scan");
  } else {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("🔌  Fetching books from Supabase...");

    let page = 0;
    const pageSize = 1000;
    let total = 0;

    while (true) {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, title_he, author, description, publisher, language, category_id, slug")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) { console.error("❌  Supabase error:", error.message); break; }
      if (!data || data.length === 0) break;

      for (const r of data) {
        allBooks.push({ _source: "supabase", ...r });
      }
      total += data.length;
      page++;
      if (data.length < pageSize) break;
    }

    console.log(`📚  Loaded ${total} books from Supabase`);
  }
}

if (allBooks.length === 0) {
  console.error("❌  No books to classify.");
  process.exit(1);
}

console.log(`\n🔍  Classifying ${allBooks.length} books...\n`);

// ── Score all books ───────────────────────────────────────────────
const scored = [];
for (const book of allBooks) {
  const result = scoreBook(book);
  if (result.score < MIN_SCORE) continue;

  scored.push({
    id:               book.id ?? "",
    source:           book._source ?? "",
    title:            book.verified_title || book.title || book.raw_title || book.existing_title || "",
    title_he:         book.title_he ?? "",
    author:           book.verified_author || book.author || book.raw_author || book.existing_author || "",
    category:         book.verified_category || book.category?.name_he || book.category?.name || "",
    language:         book.verified_language || book.language || "",
    publisher:        book.verified_publisher || book.publisher || "",
    philology_score:  result.score,
    philology_tags:   result.tags,
    confidence:       result.confidence,
    is_journal:       result.is_journal,
    matched_terms:    result.matched.join("; "),
    status:           book.status ?? "",
    needs_review:     book.needs_review ?? false,
    _dedup_key:       dedupKey(book),
    collection:       "",   // filled below
  });
}

// Sort by score descending
scored.sort((a, b) => b.philology_score - a.philology_score);

// ── Deduplication ─────────────────────────────────────────────────
const seenKeys = new Map();   // key → first entry
const duplicates = [];

for (const entry of scored) {
  const k = entry._dedup_key;
  if (seenKeys.has(k)) {
    duplicates.push(entry);
  } else {
    seenKeys.set(k, entry);
  }
}

const unique = [...seenKeys.values()];

// ── Verbose output ────────────────────────────────────────────────
if (args.verbose) {
  console.log("── Top 50 philology candidates ─────────────────────────────\n");
  for (const b of unique.slice(0, 50)) {
    const icon = b.confidence === "high" ? "🏛️ " : b.confidence === "medium" ? "📖 " : "📄 ";
    const jrn  = b.is_journal ? " [JOURNAL]" : "";
    console.log(`${icon} [${b.philology_score.toFixed(3)}] ${b.title || "(no title)"}${jrn}`);
    console.log(`      Author : ${b.author || "—"}   Lang: ${b.language || "—"}`);
    console.log(`      Tags   : ${b.philology_tags}`);
    console.log(`      Matched: ${b.matched_terms.slice(0, 80)}`);
    console.log();
  }
}

// ── Assign curated collections ──────────────────────────────────
for (const entry of unique) {
  const cols = [];
  for (const [name, fn] of Object.entries(CURATED_COLLECTIONS)) {
    if (fn(entry)) cols.push(name);
  }
  entry.collection = cols.join(" | ");
}

// ── Write CSV ─────────────────────────────────────────────────────
fs.mkdirSync(REPORT_DIR, { recursive: true });

const CSV_COLS = [
  "id", "source", "title", "title_he", "author",
  "philology_score", "confidence", "philology_tags",
  "collection", "category", "language", "publisher",
  "is_journal", "matched_terms",
  "status", "needs_review",
];

const csvLines = [
  CSV_COLS.join(","),
  ...unique.map(b => CSV_COLS.map(c => csvEsc(b[c])).join(",")),
];

fs.writeFileSync(REPORT_CSV, csvLines.join("\n"), "utf8");

// ── Write top100 CSV (score >= 0.28, no duplicates) ───────────────
const top100 = unique
  .filter(b => b.philology_score >= 0.28)
  .sort((a, b) => b.philology_score - a.philology_score)
  .slice(0, 100);

const top100Lines = [
  CSV_COLS.join(","),
  ...top100.map(b => CSV_COLS.map(c => csvEsc(b[c])).join(",")),
];

fs.writeFileSync(REPORT_TOP, top100Lines.join("\n"), "utf8");

// ── Summary ───────────────────────────────────────────────────────
const highConf   = unique.filter(b => b.confidence === "high");
const medConf    = unique.filter(b => b.confidence === "medium");
const lowConf    = unique.filter(b => b.confidence === "low");
const journals   = unique.filter(b => b.is_journal);

// Tag breakdown
const tagCounts = {};
for (const b of unique) {
  for (const tag of b.philology_tags.split("|").filter(Boolean)) {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  }
}
const topTags = Object.entries(tagCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12);

console.log("═".repeat(60));
console.log("📊  PHILOLOGY CLASSIFICATION RESULTS");
console.log("═".repeat(60));
console.log(`
  Total candidates    : ${scored.length}  (score ≥ ${MIN_SCORE})
  Unique books        : ${unique.length}
  Duplicates          : ${duplicates.length}
  ──────────────────────────────────────────────
  🏛️  High confidence  : ${highConf.length}   (score ≥ 0.55)
  📖  Medium           : ${medConf.length}   (score ≥ 0.30)
  📄  Low              : ${lowConf.length}   (score ≥ 0.15)
  ──────────────────────────────────────────────
  📰  Journals         : ${journals.length}
  ──────────────────────────────────────────────
  📄  Full report      : ${REPORT_CSV}
  🏆  Top 100          : ${REPORT_TOP}  (${top100.length} books, score ≥ 0.28)
`);

console.log("  Top philology tags:");
for (const [tag, count] of topTags) {
  const bar = "█".repeat(Math.round(count / (unique.length || 1) * 20));
  console.log(`    ${tag.padEnd(25)} ${String(count).padStart(4)}  ${bar}`);
}

// ── Collections summary ───────────────────────────────────────────
console.log("\n  Curated collections:");
for (const [name] of Object.entries(CURATED_COLLECTIONS)) {
  const cnt = unique.filter(b => b.collection.includes(name)).length;
  const bar = "█".repeat(Math.min(20, Math.round(cnt / Math.max(1, unique.length) * 40)));
  console.log(`    ${name.padEnd(35)} ${String(cnt).padStart(4)}  ${bar}`);
}

console.log("\n  Top 15 high-confidence books:");
for (const b of highConf.slice(0, 15)) {
  const jrn = b.is_journal ? " 📰" : "";
  console.log(`    [${b.philology_score.toFixed(3)}] ${(b.title || "(no title)").slice(0, 55)}${jrn}`);
}

if (duplicates.length > 0) {
  console.log(`\n  Sample duplicates (${Math.min(5, duplicates.length)} of ${duplicates.length}):`);
  for (const d of duplicates.slice(0, 5)) {
    console.log(`    ↳ "${(d.title || "").slice(0, 55)}" — ${d.author || "—"}`);
  }
}

console.log("\n" + "═".repeat(60) + "\n");
