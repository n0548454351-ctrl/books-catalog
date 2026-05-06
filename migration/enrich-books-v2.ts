/**
 * ============================================================
 * enrich-books-v2.ts
 *
 * Production-grade book enrichment pipeline for 7,000+ images.
 *
 * Architecture:
 *   1. Claude Vision  → raw_* fields only (minimal extraction)
 *   2. Normalization  → clean title/author for search
 *   3. Google Books   → primary bibliographic source
 *   4. Open Library   → secondary / cross-reference
 *   5. Scoring        → confidence per field
 *   6. Decision       → verified / needs_review / failed
 *   7. Persist        → JSON state file (resume-safe)
 *
 * Features:
 *   - Batching with configurable size + delay
 *   - Full resume from last checkpoint
 *   - Exponential backoff on failures
 *   - Per-record status tracking
 *   - Title/author cache to avoid duplicate API calls
 *   - Three output layers: raw_*, candidate_*, verified_*
 *   - needs_review flag with score threshold
 *
 * Usage:
 *   npx ts-node --project tsconfig.migration.json migration/enrich-books-v2.ts
 *
 * Env:
 *   ANTHROPIC_API_KEY       required
 *   GOOGLE_BOOKS_API_KEY    required (get free key from Google Cloud Console)
 *   INPUT_FILE              default: migration/input-images.json
 *   BATCH_SIZE              default: 25
 *   DELAY_MS                default: 2000  (between books)
 *   BATCH_DELAY_MS          default: 20000 (between batches)
 *   SCORE_AUTO_THRESHOLD    default: 0.85  (above = auto-verified)
 *   SCORE_REVIEW_THRESHOLD  default: 0.60  (below = failed)
 * ============================================================
 */

import * as fs     from "fs";
import * as path   from "path";
import * as https  from "https";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Config ───────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY;
const GOOGLE_KEY       = process.env.GOOGLE_BOOKS_API_KEY ?? "";
const INPUT_FILE       = process.env.INPUT_FILE ?? path.join(__dirname, "input-images.json");
const STATE_FILE       = path.join(__dirname, "enrichment-state.json");
const OUTPUT_FILE      = path.join(__dirname, "enriched-books-v2.json");
const CACHE_FILE       = path.join(__dirname, "api-cache.json");

const BATCH_SIZE       = parseInt(process.env.BATCH_SIZE       ?? "25");
const DELAY_MS         = parseInt(process.env.DELAY_MS         ?? "2000");
const BATCH_DELAY_MS   = parseInt(process.env.BATCH_DELAY_MS   ?? "20000");
const SCORE_AUTO       = parseFloat(process.env.SCORE_AUTO_THRESHOLD   ?? "0.85");
const SCORE_REVIEW     = parseFloat(process.env.SCORE_REVIEW_THRESHOLD ?? "0.60");
const MAX_RETRIES      = 3;

if (!ANTHROPIC_KEY) {
  console.error("❌  ANTHROPIC_API_KEY missing in .env.local");
  process.exit(1);
}
if (!GOOGLE_KEY) {
  console.warn("⚠️   GOOGLE_BOOKS_API_KEY not set — rate limits will be low (1,000/day)");
  console.warn("     Get a free key: https://console.cloud.google.com → Enable Books API\n");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordStatus = "pending" | "processing" | "done" | "needs_review" | "failed";

interface InputBook {
  id:               string;
  drive_file_id?:   string;
  image_url?:       string;
  existing_title?:  string;
  existing_author?: string;
}

// Layer 1: what Claude Vision actually read
interface RawFields {
  raw_title:            string;
  raw_subtitle:         string;
  raw_author:           string;
  raw_visible_text:     string;
  language_guess:       string;
  confidence_title:     "high" | "medium" | "low" | "none";
  confidence_author:    "high" | "medium" | "low" | "none";
}

// Layer 2: what external APIs returned
interface CandidateFields {
  google_books_id:         string;
  google_books_title:      string;
  google_books_author:     string;
  google_books_publisher:  string;
  google_books_year:       string;
  google_books_isbn10:     string;
  google_books_isbn13:     string;
  google_books_language:   string;
  google_books_categories: string;
  google_books_description:string;
  google_books_page_count: string;
  openlibrary_id:          string;
  openlibrary_title:       string;
  openlibrary_author:      string;
  openlibrary_year:        string;
  openlibrary_isbn:        string;
  openlibrary_subjects:    string;
  openlibrary_publisher:   string;
}

// Layer 3: final merged + scored output
interface VerifiedFields {
  verified_title:       string;
  verified_author:      string;
  verified_publisher:   string;
  verified_year:        string;
  verified_isbn10:      string;
  verified_isbn13:      string;
  verified_language:    string;
  verified_category:    string;
  verified_subjects:    string;
  verified_description: string;
  verified_page_count:  string;
  verified_source:      string;
  match_score:          number;
  needs_review:         boolean;
  review_reason:        string;
}

interface BookRecord extends InputBook, RawFields, CandidateFields, VerifiedFields {
  status:        RecordStatus;
  attempt_count: number;
  processed_at:  string;
  error_log:     string;
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

function loadState(): Map<string, BookRecord> {
  if (!fs.existsSync(STATE_FILE)) return new Map();
  const arr: BookRecord[] = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  return new Map(arr.map(r => [r.id, r]));
}

function saveState(state: Map<string, BookRecord>) {
  fs.writeFileSync(STATE_FILE, JSON.stringify([...state.values()], null, 2));
}

function loadCache(): Map<string, any> {
  if (!fs.existsSync(CACHE_FILE)) return new Map();
  const obj = JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
  return new Map(Object.entries(obj));
}

function saveCache(cache: Map<string, any>) {
  const obj: Record<string, any> = {};
  cache.forEach((v, k) => obj[k] = v);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2));
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function httpGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "BookEnricher/2.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve(httpGetJson(res.headers.location!));
        return;
      }
      let data = "";
      res.on("data", (c: string) => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Invalid JSON from ${url}`)); }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const backoff = 1000 * Math.pow(2, i);
      await sleep(backoff);
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── Image URL resolution ─────────────────────────────────────────────────────

function resolveImageUrl(book: InputBook): string | null {
  if (book.image_url && book.image_url.startsWith("http")) {
    // Convert drive.google.com → lh3 direct
    const m = book.image_url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=s1200`;
    return book.image_url;
  }
  if (book.drive_file_id) {
    return `https://lh3.googleusercontent.com/d/${book.drive_file_id}=s1200`;
  }
  return null;
}

// ─── Step 1: Claude Vision ────────────────────────────────────────────────────

async function extractFromCover(imageUrl: string): Promise<RawFields> {
  // Download image
  const imgBuffer = await withRetry(() => new Promise<Buffer>((resolve, reject) => {
    https.get(imageUrl, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        // Reject if Drive returned HTML
        if (buf[0] === 0x3c || buf.length < 1000) {
          reject(new Error("Image download returned HTML or empty content"));
          return;
        }
        resolve(buf);
      });
      res.on("error", reject);
    }).on("error", reject);
  }));

  const base64 = imgBuffer.toString("base64");

  const prompt = `You are a bibliographic data extraction expert. Examine this book cover image carefully.

Extract ONLY what you can directly READ on the cover — never guess, infer, or complete information.

Return ONLY a valid JSON object with these exact keys:

{
  "raw_title": "main title text exactly as written, empty string if unreadable",
  "raw_subtitle": "subtitle if visible, empty string if none",
  "raw_author": "author name(s) exactly as written, empty string if not visible",
  "raw_visible_text": "ALL text visible on the cover, verbatim, one line per element",
  "language_guess": "primary language of the title: Hebrew/English/French/German/Arabic/Yiddish/Latin/Other",
  "confidence_title": "how clearly you can read the title: high/medium/low/none",
  "confidence_author": "how clearly you can read the author: high/medium/low/none"
}

Critical rules:
- If text is partially visible or blurry, write what you can read and set confidence to low
- Do NOT complete partial words or names
- Do NOT translate — keep original language
- Do NOT add publisher, year, ISBN unless they are printed prominently as part of the title
- For Hebrew books: write Hebrew text in Hebrew characters
- Return ONLY the JSON object — no markdown, no explanation`;

  const body = JSON.stringify({
    model: "claude-opus-4-5",
    max_tokens: 400,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } },
        { type: "text", text: prompt },
      ],
    }],
  });

  const response = await withRetry(() => new Promise<string>((resolve, reject) => {
    const req = https.request("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY!,
        "anthropic-version": "2023-06-01",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c: string) => data += c);
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  }));

  const parsed = JSON.parse(response);
  if (parsed.error) throw new Error(`Claude API: ${parsed.error.message}`);

  const text = parsed.content?.[0]?.text ?? "{}";
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const result = JSON.parse(clean);
    return {
      raw_title:         result.raw_title         ?? "",
      raw_subtitle:      result.raw_subtitle       ?? "",
      raw_author:        result.raw_author         ?? "",
      raw_visible_text:  result.raw_visible_text   ?? "",
      language_guess:    result.language_guess     ?? "",
      confidence_title:  result.confidence_title   ?? "none",
      confidence_author: result.confidence_author  ?? "none",
    };
  } catch {
    return {
      raw_title: "", raw_subtitle: "", raw_author: "",
      raw_visible_text: text, language_guess: "",
      confidence_title: "none", confidence_author: "none",
    };
  }
}

// ─── Step 2: Normalization ────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0590-\u05FF]/g, " ") // keep Hebrew + alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Step 3: Google Books API ─────────────────────────────────────────────────

async function searchGoogleBooks(title: string, author: string, cache: Map<string, any>): Promise<CandidateFields["google_books_id"] extends string ? any : never> {
  if (!title) return null;

  const cacheKey = `gb:${normalize(title)}|${normalize(author)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const keyParam = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : "";

  // Try progressively broader queries
  const queries = [
    author ? `intitle:"${encodeURIComponent(title)}"` + `+inauthor:"${encodeURIComponent(author)}"` : null,
    `intitle:${encodeURIComponent(title)}`,
    encodeURIComponent(title.slice(0, 40)),
  ].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      await sleep(DELAY_MS / 2);
      const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&printType=books${keyParam}`;
      const data = await withRetry(() => httpGetJson(url));
      if (!data.items?.length) continue;

      // Score each result and pick best
      let best: any = null;
      let bestScore = 0;

      for (const item of data.items) {
        const v = item.volumeInfo;
        const s = quickScore(title, author, v.title ?? "", (v.authors ?? []).join(" "));
        if (s > bestScore) { bestScore = s; best = item; }
      }

      if (best && bestScore > 0.3) {
        const v = best.volumeInfo;
        const isbns = v.industryIdentifiers ?? [];
        const result = {
          google_books_id:          best.id,
          google_books_title:       v.title       ?? "",
          google_books_author:      (v.authors ?? []).join("; "),
          google_books_publisher:   v.publisher   ?? "",
          google_books_year:        (v.publishedDate ?? "").slice(0, 4),
          google_books_isbn10:      isbns.find((x: any) => x.type === "ISBN_10")?.identifier ?? "",
          google_books_isbn13:      isbns.find((x: any) => x.type === "ISBN_13")?.identifier ?? "",
          google_books_language:    v.language    ?? "",
          google_books_categories:  (v.categories ?? []).join(", "),
          google_books_description: (v.description ?? "").slice(0, 800),
          google_books_page_count:  String(v.pageCount ?? ""),
          _score: bestScore,
        };
        cache.set(cacheKey, result);
        return result;
      }
    } catch {
      continue;
    }
  }

  cache.set(cacheKey, null);
  return null;
}

// ─── Step 4: Open Library ─────────────────────────────────────────────────────

async function searchOpenLibrary(title: string, author: string, isbn: string, cache: Map<string, any>): Promise<any> {
  if (!title && !isbn) return null;

  const cacheKey = `ol:${isbn || normalize(title) + "|" + normalize(author)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    await sleep(DELAY_MS / 3);
    let data: any = null;

    // Prefer ISBN lookup (exact)
    if (isbn) {
      data = await withRetry(() => httpGetJson(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
      ));
      const entry = Object.values(data ?? {})[0] as any;
      if (entry) {
        const result = {
          openlibrary_id:        entry.key ?? "",
          openlibrary_title:     entry.title ?? "",
          openlibrary_author:    entry.authors?.[0]?.name ?? "",
          openlibrary_year:      entry.publish_date ?? "",
          openlibrary_isbn:      isbn,
          openlibrary_subjects:  (entry.subjects ?? []).slice(0, 5).map((s: any) => s.name ?? s).join(", "),
          openlibrary_publisher: entry.publishers?.[0]?.name ?? "",
        };
        cache.set(cacheKey, result);
        return result;
      }
    }

    // Fallback: search
    const q = encodeURIComponent(`${title} ${author}`.trim().slice(0, 60));
    data = await withRetry(() => httpGetJson(
      `https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,title,author_name,first_publish_year,isbn,subject,publisher`
    ));

    const doc = data?.docs?.[0];
    if (!doc) { cache.set(cacheKey, null); return null; }

    const result = {
      openlibrary_id:        doc.key ?? "",
      openlibrary_title:     doc.title ?? "",
      openlibrary_author:    doc.author_name?.[0] ?? "",
      openlibrary_year:      String(doc.first_publish_year ?? ""),
      openlibrary_isbn:      doc.isbn?.[0] ?? "",
      openlibrary_subjects:  (doc.subject ?? []).slice(0, 5).join(", "),
      openlibrary_publisher: doc.publisher?.[0] ?? "",
    };
    cache.set(cacheKey, result);
    return result;
  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}

// ─── Step 5: Scoring ──────────────────────────────────────────────────────────

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Trigram similarity
  const trigrams = (s: string) => {
    const t = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i + 3));
    return t;
  };
  const ta = trigrams(na);
  const tb = trigrams(nb);
  const intersection = [...ta].filter(x => tb.has(x)).length;
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function quickScore(rawTitle: string, rawAuthor: string, candidateTitle: string, candidateAuthor: string): number {
  const titleScore  = stringSimilarity(rawTitle, candidateTitle);
  const authorScore = stringSimilarity(rawAuthor, candidateAuthor);
  // Title weighted 70%, author 30%
  return rawAuthor
    ? titleScore * 0.7 + authorScore * 0.3
    : titleScore;
}

interface ScoredCandidate {
  score:           number;
  source:          string;
  title:           string;
  author:          string;
  publisher:       string;
  year:            string;
  isbn10:          string;
  isbn13:          string;
  language:        string;
  category:        string;
  subjects:        string;
  description:     string;
  page_count:      string;
}

function scoreAndReconcile(
  raw: RawFields,
  gb:  any | null,
  ol:  any | null,
): { best: ScoredCandidate | null; score: number; reasons: string[] } {
  const reasons: string[] = [];
  const candidates: ScoredCandidate[] = [];

  if (gb) {
    const s = quickScore(raw.raw_title, raw.raw_author, gb.google_books_title, gb.google_books_author);
    // Bonus for language match
    const langBonus = raw.language_guess && gb.google_books_language &&
      raw.language_guess.toLowerCase().slice(0, 2) === gb.google_books_language.toLowerCase().slice(0, 2)
        ? 0.05 : 0;
    candidates.push({
      score:       Math.min(1, s + langBonus + (gb._score ?? 0) * 0.1),
      source:      "google_books",
      title:       gb.google_books_title,
      author:      gb.google_books_author,
      publisher:   gb.google_books_publisher,
      year:        gb.google_books_year,
      isbn10:      gb.google_books_isbn10,
      isbn13:      gb.google_books_isbn13,
      language:    gb.google_books_language,
      category:    gb.google_books_categories,
      subjects:    gb.google_books_categories,
      description: gb.google_books_description,
      page_count:  gb.google_books_page_count,
    });
  }

  if (ol) {
    const s = quickScore(raw.raw_title, raw.raw_author, ol.openlibrary_title, ol.openlibrary_author);
    candidates.push({
      score:       s * 0.9, // OL slightly lower weight
      source:      "open_library",
      title:       ol.openlibrary_title,
      author:      ol.openlibrary_author,
      publisher:   ol.openlibrary_publisher,
      year:        ol.openlibrary_year,
      isbn10:      "",
      isbn13:      ol.openlibrary_isbn,
      language:    raw.language_guess,
      category:    ol.openlibrary_subjects.split(",")[0] ?? "",
      subjects:    ol.openlibrary_subjects,
      description: "",
      page_count:  "",
    });
  }

  if (!candidates.length) {
    reasons.push("No external match found");
    return { best: null, score: 0, reasons };
  }

  // Pick highest scoring candidate
  const best = candidates.sort((a, b) => b.score - a.score)[0];

  if (raw.confidence_title === "none")   reasons.push("Title not readable on cover");
  if (raw.confidence_author === "none")  reasons.push("Author not readable on cover");
  if (best.score < SCORE_REVIEW)         reasons.push(`Low match score: ${best.score.toFixed(2)}`);
  if (!best.isbn10 && !best.isbn13)      reasons.push("No ISBN found");

  return { best, score: best.score, reasons };
}

// ─── Step 6: Build final record ───────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  he: "Hebrew", en: "English", fr: "French", de: "German",
  ar: "Arabic", yi: "Yiddish", la: "Latin", es: "Spanish",
  it: "Italian", ru: "Russian", pl: "Polish", nl: "Dutch",
};

function buildRecord(
  input: InputBook,
  raw: RawFields,
  gb: any | null,
  ol: any | null,
  candidate: ScoredCandidate | null,
  score: number,
  reviewReasons: string[],
): Omit<BookRecord, "status" | "attempt_count" | "processed_at" | "error_log"> {
  const pick = (...vals: (string | undefined | null)[]) =>
    vals.find(v => v && String(v).trim() && String(v) !== "null" && String(v) !== "undefined") ?? "";

  const needsReview = score < SCORE_AUTO;
  const lang = LANG_MAP[candidate?.language?.toLowerCase().slice(0,2) ?? ""] ?? pick(candidate?.language, raw.language_guess);

  return {
    ...input,
    // raw layer
    raw_title:            raw.raw_title,
    raw_subtitle:         raw.raw_subtitle,
    raw_author:           raw.raw_author,
    raw_visible_text:     raw.raw_visible_text,
    language_guess:       raw.language_guess,
    confidence_title:     raw.confidence_title,
    confidence_author:    raw.confidence_author,
    // candidate layer (Google Books)
    google_books_id:          gb?.google_books_id          ?? "",
    google_books_title:       gb?.google_books_title        ?? "",
    google_books_author:      gb?.google_books_author       ?? "",
    google_books_publisher:   gb?.google_books_publisher    ?? "",
    google_books_year:        gb?.google_books_year         ?? "",
    google_books_isbn10:      gb?.google_books_isbn10       ?? "",
    google_books_isbn13:      gb?.google_books_isbn13       ?? "",
    google_books_language:    gb?.google_books_language     ?? "",
    google_books_categories:  gb?.google_books_categories   ?? "",
    google_books_description: gb?.google_books_description  ?? "",
    google_books_page_count:  gb?.google_books_page_count   ?? "",
    // candidate layer (Open Library)
    openlibrary_id:           ol?.openlibrary_id        ?? "",
    openlibrary_title:        ol?.openlibrary_title      ?? "",
    openlibrary_author:       ol?.openlibrary_author     ?? "",
    openlibrary_year:         ol?.openlibrary_year       ?? "",
    openlibrary_isbn:         ol?.openlibrary_isbn       ?? "",
    openlibrary_subjects:     ol?.openlibrary_subjects   ?? "",
    openlibrary_publisher:    ol?.openlibrary_publisher  ?? "",
    // verified layer
    verified_title:       pick(candidate?.title,     raw.raw_title),
    verified_author:      pick(candidate?.author,    raw.raw_author),
    verified_publisher:   pick(candidate?.publisher, ""),
    verified_year:        pick(candidate?.year,      ""),
    verified_isbn10:      pick(candidate?.isbn10,    ""),
    verified_isbn13:      pick(candidate?.isbn13,    ol?.openlibrary_isbn, ""),
    verified_language:    lang,
    verified_category:    pick(candidate?.category,  ""),
    verified_subjects:    pick(candidate?.subjects,  ol?.openlibrary_subjects, ""),
    verified_description: pick(candidate?.description,""),
    verified_page_count:  pick(candidate?.page_count, ""),
    verified_source:      candidate?.source ?? "vision_only",
    match_score:          Math.round(score * 100) / 100,
    needs_review:         needsReview,
    review_reason:        reviewReasons.join("; "),
  };
}

// ─── Process one book ─────────────────────────────────────────────────────────

async function processBook(
  input: InputBook,
  state: Map<string, BookRecord>,
  cache: Map<string, any>,
): Promise<RecordStatus> {
  const existing = state.get(input.id);
  if (existing?.status === "done") return "done"; // resume skip

  const imageUrl = resolveImageUrl(input);
  if (!imageUrl) {
    const rec = { ...emptyRecord(input), status: "failed" as const, error_log: "No image URL", processed_at: now() };
    state.set(input.id, rec);
    return "failed";
  }

  const attempt = (existing?.attempt_count ?? 0) + 1;

  try {
    // 1. Vision
    const raw = await extractFromCover(imageUrl);

    const searchTitle  = raw.raw_title  || input.existing_title  || "";
    const searchAuthor = raw.raw_author || input.existing_author || "";

    // 2 & 3. APIs (parallel to save time)
    const [gb, ol] = await Promise.all([
      searchGoogleBooks(searchTitle, searchAuthor, cache),
      searchOpenLibrary(searchTitle, searchAuthor, "", cache),
    ]);

    // 4. Score
    const { best, score, reasons } = scoreAndReconcile(raw, gb, ol);

    // 5. Build record
    const baseRecord = buildRecord(input, raw, gb, ol, best, score, reasons);
    const status: RecordStatus = score >= SCORE_AUTO ? "done" : score >= SCORE_REVIEW ? "needs_review" : "failed";

    const record: BookRecord = {
      ...baseRecord,
      status,
      attempt_count: attempt,
      processed_at:  now(),
      error_log:     "",
    };

    state.set(input.id, record);

    // Also fetch OL with ISBN for better data if we have one
    if (baseRecord.verified_isbn13 || baseRecord.verified_isbn10) {
      const isbn = baseRecord.verified_isbn13 || baseRecord.verified_isbn10;
      const olIsbn = await searchOpenLibrary("", "", isbn, cache);
      if (olIsbn) {
        record.openlibrary_subjects = olIsbn.openlibrary_subjects || record.openlibrary_subjects;
        record.openlibrary_publisher = olIsbn.openlibrary_publisher || record.openlibrary_publisher;
        if (!record.verified_subjects) record.verified_subjects = olIsbn.openlibrary_subjects;
        state.set(input.id, record);
      }
    }

    return status;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const rec: BookRecord = {
      ...emptyRecord(input),
      ...existing,
      status:        attempt >= MAX_RETRIES ? "failed" : "pending",
      attempt_count: attempt,
      processed_at:  now(),
      error_log:     msg,
    };
    state.set(input.id, rec);
    return rec.status;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function now() { return new Date().toISOString(); }

function emptyRecord(input: InputBook): BookRecord {
  return {
    ...input,
    raw_title: "", raw_subtitle: "", raw_author: "", raw_visible_text: "",
    language_guess: "", confidence_title: "none", confidence_author: "none",
    google_books_id: "", google_books_title: "", google_books_author: "",
    google_books_publisher: "", google_books_year: "", google_books_isbn10: "",
    google_books_isbn13: "", google_books_language: "", google_books_categories: "",
    google_books_description: "", google_books_page_count: "",
    openlibrary_id: "", openlibrary_title: "", openlibrary_author: "",
    openlibrary_year: "", openlibrary_isbn: "", openlibrary_subjects: "",
    openlibrary_publisher: "",
    verified_title: "", verified_author: "", verified_publisher: "", verified_year: "",
    verified_isbn10: "", verified_isbn13: "", verified_language: "", verified_category: "",
    verified_subjects: "", verified_description: "", verified_page_count: "",
    verified_source: "", match_score: 0, needs_review: true, review_reason: "",
    status: "pending", attempt_count: 0, processed_at: "", error_log: "",
  };
}

// ─── Progress display ─────────────────────────────────────────────────────────

function printProgress(done: number, total: number, counts: Record<string, number>) {
  const pct = Math.round((done / total) * 100);
  const bar = "█".repeat(Math.floor(pct / 4)) + "░".repeat(25 - Math.floor(pct / 4));
  process.stdout.write(
    `\r  [${bar}] ${pct}%  ✅${counts.done}  🟡${counts.needs_review}  ❌${counts.failed}  (${done}/${total})  `
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n📚  Book Enrichment Pipeline v2\n");
  console.log(`  Batch size : ${BATCH_SIZE} books`);
  console.log(`  Delay      : ${DELAY_MS}ms between books, ${BATCH_DELAY_MS}ms between batches`);
  console.log(`  Thresholds : auto=${SCORE_AUTO}, review=${SCORE_REVIEW}\n`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  Input not found: ${INPUT_FILE}`);
    console.error(`    Run: npx ts-node ... migration/prepare-input.ts --source supabase`);
    process.exit(1);
  }

  const rawInput = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const inputs: InputBook[] = Array.isArray(rawInput) ? rawInput : rawInput.books ?? rawInput.data ?? [];

  const state = loadState();
  const cache = loadCache();

  // Stats from existing state
  const pending = inputs.filter(i => {
    const s = state.get(i.id)?.status;
    return !s || s === "pending" || (s === "failed" && (state.get(i.id)?.attempt_count ?? 0) < MAX_RETRIES);
  });

  console.log(`  Total    : ${inputs.length}`);
  console.log(`  Done     : ${[...state.values()].filter(r => r.status === "done").length}`);
  console.log(`  Pending  : ${pending.length}\n`);
  console.log("─".repeat(72) + "\n");

  if (pending.length === 0) {
    console.log("  All books already processed. Writing output...");
  } else {
    const counts = { done: 0, needs_review: 0, failed: 0 };

    for (let b = 0; b < pending.length; b += BATCH_SIZE) {
      const batch = pending.slice(b, b + BATCH_SIZE);
      const batchNum = Math.floor(b / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(pending.length / BATCH_SIZE);

      console.log(`\n  Batch ${batchNum}/${totalBatches} (books ${b + 1}–${Math.min(b + BATCH_SIZE, pending.length)})\n`);

      for (let j = 0; j < batch.length; j++) {
        const book = batch[j];
        const label = `  [${b + j + 1}/${pending.length}]`;
        process.stdout.write(`${label} Processing ${book.id}...`);

        const status = await processBook(book, state, cache);
        const rec = state.get(book.id)!;
        counts[status as keyof typeof counts] = (counts[status as keyof typeof counts] ?? 0) + 1;

        const icon = status === "done" ? "✅" : status === "needs_review" ? "🟡" : "❌";
        const scoreStr = rec.match_score ? ` (${Math.round(rec.match_score * 100)}%)` : "";
        const titleStr = (rec.verified_title || rec.raw_title || "?").slice(0, 35);
        process.stdout.write(` ${icon} ${titleStr}${scoreStr}\n`);

        // Save state after every book
        saveState(state);
        saveCache(cache);

        // Delay between books (except last in batch)
        if (j < batch.length - 1) await sleep(DELAY_MS);
      }

      printProgress(Math.min(b + BATCH_SIZE, pending.length), pending.length, counts);

      // Delay between batches (except last)
      if (b + BATCH_SIZE < pending.length) {
        console.log(`\n\n  ⏸  Batch complete. Waiting ${BATCH_DELAY_MS / 1000}s before next batch...`);
        await sleep(BATCH_DELAY_MS);
      }
    }
  }

  // ── Final output ──────────────────────────────────────────────────────────
  const allRecords = [...state.values()];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allRecords, null, 2));

  const done         = allRecords.filter(r => r.status === "done").length;
  const needsReview  = allRecords.filter(r => r.status === "needs_review").length;
  const failed       = allRecords.filter(r => r.status === "failed").length;
  const highScore    = allRecords.filter(r => r.match_score >= 0.85).length;
  const medScore     = allRecords.filter(r => r.match_score >= 0.60 && r.match_score < 0.85).length;
  const lowScore     = allRecords.filter(r => r.match_score > 0 && r.match_score < 0.60).length;
  const visionOnly   = allRecords.filter(r => r.verified_source === "vision_only").length;

  console.log("\n\n" + "═".repeat(72));
  console.log("  FINAL REPORT");
  console.log("═".repeat(72));
  console.log(`  ✅  Auto-verified   : ${done}`);
  console.log(`  🟡  Needs review    : ${needsReview}`);
  console.log(`  ❌  Failed          : ${failed}`);
  console.log(`\n  Match score breakdown:`);
  console.log(`    🟢 ≥85% (high confidence)   : ${highScore}`);
  console.log(`    🟡 60–84% (medium)           : ${medScore}`);
  console.log(`    🔴 <60% (low / vision only)  : ${lowScore + visionOnly}`);
  console.log(`\n  Output  → ${OUTPUT_FILE}`);
  console.log(`  State   → ${STATE_FILE}`);
  console.log(`  Cache   → ${CACHE_FILE} (${cache.size} entries)`);

  if (needsReview > 0) {
    const reviewFile = path.join(__dirname, "needs-review.json");
    const reviewItems = allRecords.filter(r => r.status === "needs_review" || r.status === "failed");
    fs.writeFileSync(reviewFile, JSON.stringify(reviewItems, null, 2));
    console.log(`  Review  → ${reviewFile} (${reviewItems.length} books)`);
  }

  console.log("\n" + "═".repeat(72) + "\n");
}

main().catch(e => { console.error("❌  Fatal:", e); process.exit(1); });
