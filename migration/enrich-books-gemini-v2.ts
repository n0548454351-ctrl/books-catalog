/**
 * ============================================================
 * enrich-books-gemini-v2.ts
 *
 * Fixed version — passes image URL directly to Gemini instead
 * of downloading and converting to base64.
 * Gemini can fetch URLs directly, which avoids Drive auth issues.
 *
 * Usage:
 *   npx ts-node --project tsconfig.migration.json migration/enrich-books-gemini-v2.ts
 *
 * Env (.env.local):
 *   GEMINI_API_KEY         required — https://aistudio.google.com/app/apikey
 *   GOOGLE_BOOKS_API_KEY   recommended — https://console.cloud.google.com
 *   INPUT_FILE             default: migration/input-images.json
 *   BATCH_SIZE             default: 20
 *   DELAY_MS               default: 3000
 *   BATCH_DELAY_MS         default: 30000
 *   SCORE_AUTO_THRESHOLD   default: 0.85
 *   SCORE_REVIEW_THRESHOLD default: 0.60
 * ============================================================
 */

import * as fs     from "fs";
import * as path   from "path";
import * as https  from "https";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const GOOGLE_KEY   = process.env.GOOGLE_BOOKS_API_KEY ?? "";
const INPUT_FILE   = process.env.INPUT_FILE ?? path.join(__dirname, "input-images.json");
const STATE_FILE   = path.join(__dirname, "enrichment-state.json");
const OUTPUT_FILE  = path.join(__dirname, "enriched-books.json");
const CACHE_FILE   = path.join(__dirname, "api-cache.json");

const BATCH_SIZE   = parseInt(process.env.BATCH_SIZE    ?? "20");
const DELAY_MS     = parseInt(process.env.DELAY_MS      ?? "3000");
const BATCH_DELAY  = parseInt(process.env.BATCH_DELAY_MS ?? "30000");
const SCORE_AUTO   = parseFloat(process.env.SCORE_AUTO_THRESHOLD   ?? "0.85");
const SCORE_REVIEW = parseFloat(process.env.SCORE_REVIEW_THRESHOLD ?? "0.60");
const MAX_RETRIES  = 3;

// Gemini model for vision — free tier
const GEMINI_MODEL = "gemini-2.5-flash-preview-04-17";

if (!GEMINI_KEY) {
  console.error(`
❌  GEMINI_API_KEY missing.
    Get FREE key: https://aistudio.google.com/app/apikey
    Add to .env.local: GEMINI_API_KEY=AIza...
`);
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Confidence  = "high" | "medium" | "low" | "none";
type RecordStatus = "pending" | "done" | "needs_review" | "failed";

interface InputBook {
  id:               string;
  drive_file_id?:   string;
  image_url?:       string;
  existing_title?:  string;
  existing_author?: string;
}

interface RawFields {
  raw_title:         string;
  raw_subtitle:      string;
  raw_author:        string;
  raw_visible_text:  string;
  language_guess:    string;
  confidence_title:  Confidence;
  confidence_author: Confidence;
}

interface BookRecord extends InputBook, RawFields {
  google_books_id:          string;
  google_books_title:       string;
  google_books_author:      string;
  google_books_publisher:   string;
  google_books_year:        string;
  google_books_isbn10:      string;
  google_books_isbn13:      string;
  google_books_language:    string;
  google_books_categories:  string;
  google_books_description: string;
  google_books_page_count:  string;
  openlibrary_id:           string;
  openlibrary_title:        string;
  openlibrary_author:       string;
  openlibrary_year:         string;
  openlibrary_isbn:         string;
  openlibrary_subjects:     string;
  openlibrary_publisher:    string;
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
  status:               RecordStatus;
  attempt_count:        number;
  processed_at:         string;
  error_log:            string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadState(): Map<string, BookRecord> {
  if (!fs.existsSync(STATE_FILE)) return new Map();
  const arr: BookRecord[] = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  return new Map(arr.map(r => [r.id, r]));
}
function saveState(m: Map<string, BookRecord>) {
  fs.writeFileSync(STATE_FILE, JSON.stringify([...m.values()], null, 2));
}
function loadCache(): Map<string, any> {
  if (!fs.existsSync(CACHE_FILE)) return new Map();
  return new Map(Object.entries(JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"))));
}
function saveCache(m: Map<string, any>) {
  const o: Record<string, any> = {};
  m.forEach((v, k) => o[k] = v);
  fs.writeFileSync(CACHE_FILE, JSON.stringify(o, null, 2));
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      { hostname: u.hostname, path: u.pathname + u.search, method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
      res => {
        let d = "";
        res.on("data", (c: string) => d += c);
        res.on("end", () => resolve(d));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function httpGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "BookEnricher/2.0" } }, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        resolve(httpGetJson(res.headers.location!)); return;
      }
      let d = "";
      res.on("data", (c: string) => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch { reject(new Error(`Bad JSON`)); }
      });
      res.on("error", reject);
    }).on("error", reject);
  });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries - 1) throw err;
      await sleep(2000 * Math.pow(2, i));
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── Image URL resolution ─────────────────────────────────────────────────────

/**
 * Returns the best URL for the image.
 * We try multiple Drive URL formats — Gemini can fetch them server-side.
 * Priority: lh3 thumbnail (most reliable) > direct Drive URL
 */
function resolveImageUrl(book: InputBook): { url: string; fileId: string | null } | null {
  let fileId: string | null = null;

  // Extract file ID from any source
  if (book.drive_file_id && book.drive_file_id.length > 10) {
    fileId = book.drive_file_id;
  } else if (book.image_url) {
    const m = book.image_url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)
           ?? book.image_url.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
           ?? book.image_url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) fileId = m[1];
  }

  if (fileId) {
    // lh3 thumbnail — works without auth, Gemini can fetch it
    return { url: `https://lh3.googleusercontent.com/d/${fileId}`, fileId };
  }

  // Non-Drive URL — use as-is
  if (book.image_url?.startsWith("http")) {
    return { url: book.image_url, fileId: null };
  }

  return null;
}

// ─── Step 1: Gemini Vision (URL mode — no download needed) ───────────────────

const VISION_PROMPT = `You are a bibliographic data extraction expert examining a book cover image.

Extract ONLY what you can directly READ on the cover — never guess or complete information.

Return ONLY a valid JSON object with these exact keys:
{
  "raw_title": "main title text exactly as written, empty string if unreadable",
  "raw_subtitle": "subtitle if visible, empty string if none",
  "raw_author": "author name(s) exactly as written, empty string if not clearly visible",
  "raw_visible_text": "ALL text visible on the cover verbatim, semicolon-separated",
  "language_guess": "primary language of the title: Hebrew/English/French/German/Arabic/Yiddish/Latin/Other",
  "confidence_title": "how clearly you can read the title: high/medium/low/none",
  "confidence_author": "how clearly you can read the author name: high/medium/low/none"
}

Critical rules:
- If text is blurry or partially visible, write what you can and set confidence to low
- Do NOT complete partial words, names, or phrases
- Do NOT translate — preserve original language and script exactly
- For Hebrew books: write the Hebrew characters as they appear
- Return ONLY the JSON object — no markdown fences, no explanation text`;

async function extractWithGemini(imageUrl: string): Promise<RawFields> {
  const body = JSON.stringify({
    contents: [{
      parts: [
        // Pass URL directly — Gemini fetches it server-side
        { file_data: { mime_type: "image/jpeg", file_uri: imageUrl } },
        { text: VISION_PROMPT },
      ],
    }],
    generationConfig: { temperature: 0.05, maxOutputTokens: 400 },
  });

  const raw = await withRetry(async () => {
    const res = await httpPost(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      body
    );
    const parsed = JSON.parse(res);

    // Rate limit
    if (parsed.error?.code === 429) {
      const wait = (parseInt(parsed.error?.details?.[0]?.retryDelay ?? "60") || 60) * 1000;
      console.warn(`\n  ⏳ Rate limit — waiting ${wait / 1000}s...`);
      await sleep(wait + 2000);
      throw new Error("Rate limit — retry");
    }

    // Other errors
    if (parsed.error) throw new Error(`Gemini: ${parsed.error.message}`);

    // No candidates (image blocked/unavailable)
    if (!parsed.candidates?.[0]) {
      // Fallback: try inline URL via image_url workaround
      throw new Error("No candidates returned — image may be unavailable");
    }

    return parsed;
  });

  const text = raw.candidates[0].content.parts[0].text ?? "{}";
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const r = JSON.parse(clean);
    return {
      raw_title:         String(r.raw_title         ?? ""),
      raw_subtitle:      String(r.raw_subtitle       ?? ""),
      raw_author:        String(r.raw_author         ?? ""),
      raw_visible_text:  String(r.raw_visible_text   ?? ""),
      language_guess:    String(r.language_guess     ?? ""),
      confidence_title:  (r.confidence_title  as Confidence) ?? "none",
      confidence_author: (r.confidence_author as Confidence) ?? "none",
    };
  } catch {
    return {
      raw_title: "", raw_subtitle: "", raw_author: "",
      raw_visible_text: text.slice(0, 200),
      language_guess: "", confidence_title: "none", confidence_author: "none",
    };
  }
}

// ─── Step 2: Google Books ─────────────────────────────────────────────────────

async function searchGoogleBooks(title: string, author: string, cache: Map<string, any>): Promise<any> {
  if (!title.trim()) return null;
  const cacheKey = `gb:${title.toLowerCase().slice(0, 50)}|${author.toLowerCase().slice(0, 30)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const kp = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : "";
  const queries = [
    author.trim()
      ? `intitle:${encodeURIComponent(title.slice(0, 40))}+inauthor:${encodeURIComponent(author.slice(0, 30))}`
      : null,
    `intitle:${encodeURIComponent(title.slice(0, 50))}`,
    encodeURIComponent(`${title} ${author}`.trim().slice(0, 60)),
  ].filter(Boolean) as string[];

  for (const q of queries) {
    try {
      await sleep(400);
      const data = await withRetry(() =>
        httpGetJson(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=5&printType=books${kp}`)
      );
      if (!data.items?.length) continue;

      let best: any = null, bestScore = 0;
      for (const item of data.items) {
        const v = item.volumeInfo;
        const s = strSim(title, v.title ?? "") * 0.7
                + strSim(author, (v.authors ?? []).join(" ")) * 0.3;
        if (s > bestScore) { bestScore = s; best = item; }
      }

      if (best && bestScore > 0.25) {
        const v = best.volumeInfo;
        const isbns = v.industryIdentifiers ?? [];
        const result = {
          google_books_id:          best.id,
          google_books_title:       v.title ?? "",
          google_books_author:      (v.authors ?? []).join("; "),
          google_books_publisher:   v.publisher ?? "",
          google_books_year:        (v.publishedDate ?? "").slice(0, 4),
          google_books_isbn10:      isbns.find((x: any) => x.type === "ISBN_10")?.identifier ?? "",
          google_books_isbn13:      isbns.find((x: any) => x.type === "ISBN_13")?.identifier ?? "",
          google_books_language:    v.language ?? "",
          google_books_categories:  (v.categories ?? []).join(", "),
          google_books_description: (v.description ?? "").slice(0, 800),
          google_books_page_count:  String(v.pageCount ?? ""),
          _score: bestScore,
        };
        cache.set(cacheKey, result);
        return result;
      }
    } catch { continue; }
  }

  cache.set(cacheKey, null);
  return null;
}

// ─── Step 3: Open Library ─────────────────────────────────────────────────────

async function searchOpenLibrary(title: string, author: string, isbn: string, cache: Map<string, any>): Promise<any> {
  const cacheKey = `ol:${isbn || (title.slice(0, 40) + "|" + author.slice(0, 20))}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    await sleep(300);
    if (isbn) {
      const data = await withRetry(() =>
        httpGetJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
      );
      const entry: any = Object.values(data ?? {})[0];
      if (entry) {
        const r = {
          openlibrary_id:        entry.key ?? "",
          openlibrary_title:     entry.title ?? "",
          openlibrary_author:    entry.authors?.[0]?.name ?? "",
          openlibrary_year:      entry.publish_date ?? "",
          openlibrary_isbn:      isbn,
          openlibrary_subjects:  (entry.subjects ?? []).slice(0, 5).map((s: any) => s.name ?? s).join(", "),
          openlibrary_publisher: entry.publishers?.[0]?.name ?? "",
        };
        cache.set(cacheKey, r);
        return r;
      }
    }

    if (!title.trim()) { cache.set(cacheKey, null); return null; }
    const q = encodeURIComponent(`${title} ${author}`.trim().slice(0, 60));
    const data = await withRetry(() =>
      httpGetJson(`https://openlibrary.org/search.json?q=${q}&limit=3&fields=key,title,author_name,first_publish_year,isbn,subject,publisher`)
    );
    const doc = data?.docs?.[0];
    if (!doc) { cache.set(cacheKey, null); return null; }
    const r = {
      openlibrary_id:        doc.key ?? "",
      openlibrary_title:     doc.title ?? "",
      openlibrary_author:    doc.author_name?.[0] ?? "",
      openlibrary_year:      String(doc.first_publish_year ?? ""),
      openlibrary_isbn:      doc.isbn?.[0] ?? "",
      openlibrary_subjects:  (doc.subject ?? []).slice(0, 5).join(", "),
      openlibrary_publisher: doc.publisher?.[0] ?? "",
    };
    cache.set(cacheKey, r);
    return r;
  } catch {
    cache.set(cacheKey, null);
    return null;
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/[\u0590-\u05FF\u05B0-\u05BD]/g, "") // strip Hebrew
    .replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function strSim(a: string, b: string): number {
  if (!a || !b) return 0;
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length > 8 && nb.includes(na.slice(0, 8))) return 0.85;
  if (nb.length > 8 && na.includes(nb.slice(0, 8))) return 0.85;
  const tri = (s: string) => {
    const t = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i + 3));
    return t;
  };
  const ta = tri(na), tb = tri(nb);
  const inter = [...ta].filter(x => tb.has(x)).length;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

// ─── Merge ────────────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  he: "Hebrew", en: "English", fr: "French", de: "German",
  ar: "Arabic", yi: "Yiddish", la: "Latin", es: "Spanish",
  it: "Italian", ru: "Russian", pl: "Polish",
};

function pick(...vals: (string | undefined | null)[]): string {
  return vals.find(v => v && String(v).trim() && !["null", "undefined"].includes(String(v))) ?? "";
}

function buildRecord(
  input: InputBook,
  raw: RawFields,
  gb: any,
  ol: any,
): BookRecord {
  const candidates: Array<{ score: number; source: string; d: any }> = [];
  if (gb) {
    const s = strSim(raw.raw_title, gb.google_books_title) * 0.7
            + strSim(raw.raw_author, gb.google_books_author) * 0.3;
    candidates.push({ score: Math.min(1, s + 0.03), source: "google_books", d: gb });
  }
  if (ol) {
    const s = strSim(raw.raw_title, ol.openlibrary_title) * 0.7
            + strSim(raw.raw_author, ol.openlibrary_author) * 0.3;
    candidates.push({ score: s * 0.9, source: "open_library", d: ol });
  }

  const reasons: string[] = [];
  if (raw.confidence_title  === "none") reasons.push("Title not readable");
  if (raw.confidence_author === "none") reasons.push("Author not readable");

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const score = best?.score ?? 0;
  if (score < SCORE_REVIEW) reasons.push(`Low match score: ${score.toFixed(2)}`);

  const d = best?.d ?? {};
  const langCode = pick(d.google_books_language, "").slice(0, 2).toLowerCase();
  const lang = LANG_MAP[langCode] ?? pick(d.google_books_language, raw.language_guess);
  const year = (pick(d.google_books_year, d.openlibrary_year).match(/\b(1[0-9]{3}|20[0-2][0-9])\b/) ?? [])[0] ?? "";

  const status: RecordStatus = score >= SCORE_AUTO ? "done"
    : score >= SCORE_REVIEW ? "needs_review" : "failed";

  if (!pick(d.google_books_isbn13, d.google_books_isbn10, d.openlibrary_isbn)) {
    reasons.push("No ISBN found");
  }

  return {
    ...input, ...raw,
    // Google Books candidate fields
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
    // Open Library candidate fields
    openlibrary_id:           ol?.openlibrary_id        ?? "",
    openlibrary_title:        ol?.openlibrary_title      ?? "",
    openlibrary_author:       ol?.openlibrary_author     ?? "",
    openlibrary_year:         ol?.openlibrary_year       ?? "",
    openlibrary_isbn:         ol?.openlibrary_isbn       ?? "",
    openlibrary_subjects:     ol?.openlibrary_subjects   ?? "",
    openlibrary_publisher:    ol?.openlibrary_publisher  ?? "",
    // Verified merged fields
    verified_title:       pick(d.google_books_title, d.openlibrary_title, raw.raw_title),
    verified_author:      pick(d.google_books_author, d.openlibrary_author, raw.raw_author),
    verified_publisher:   pick(d.google_books_publisher, d.openlibrary_publisher),
    verified_year:        year,
    verified_isbn10:      pick(d.google_books_isbn10),
    verified_isbn13:      pick(d.google_books_isbn13, d.openlibrary_isbn),
    verified_language:    lang,
    verified_category:    pick(d.google_books_categories?.split(",")?.[0]?.trim(), d.openlibrary_subjects?.split(",")?.[0]?.trim()),
    verified_subjects:    pick(d.google_books_categories, d.openlibrary_subjects),
    verified_description: pick(d.google_books_description),
    verified_page_count:  pick(d.google_books_page_count),
    verified_source:      best?.source ?? "vision_only",
    match_score:          Math.round(score * 100) / 100,
    needs_review:         score < SCORE_AUTO,
    review_reason:        reasons.join("; "),
    status,
    attempt_count:        0,
    processed_at:         new Date().toISOString(),
    error_log:            "",
  };
}

// ─── Process one book ─────────────────────────────────────────────────────────

function emptyRecord(input: InputBook, err: string): BookRecord {
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
    verified_source: "", match_score: 0, needs_review: true, review_reason: err,
    status: "failed", attempt_count: 0, processed_at: new Date().toISOString(), error_log: err,
  };
}

async function processBook(
  input: InputBook,
  state: Map<string, BookRecord>,
  cache: Map<string, any>,
): Promise<RecordStatus> {
  const existing = state.get(input.id);
  if (existing?.status === "done") return "done";

  const attempt = (existing?.attempt_count ?? 0) + 1;
  const resolved = resolveImageUrl(input);

  if (!resolved) {
    state.set(input.id, { ...emptyRecord(input, "No image URL"), attempt_count: attempt });
    return "failed";
  }

  try {
    // 1. Gemini Vision — URL mode
    const raw = await extractWithGemini(resolved.url);

    const searchTitle  = raw.raw_title  || input.existing_title  || "";
    const searchAuthor = raw.raw_author || input.existing_author || "";

    // 2 & 3. APIs (parallel)
    const [gb, ol] = await Promise.all([
      searchGoogleBooks(searchTitle, searchAuthor, cache),
      searchOpenLibrary(searchTitle, searchAuthor, "", cache),
    ]);

    // ISBN-based OL lookup
    const isbn = gb?.google_books_isbn13 || gb?.google_books_isbn10;
    const olEnriched = isbn
      ? await searchOpenLibrary("", "", isbn, cache)
      : ol;

    // 4. Build record
    const record = buildRecord(input, raw, gb, olEnriched ?? ol);
    record.attempt_count = attempt;
    state.set(input.id, record);
    return record.status;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    state.set(input.id, {
      ...(existing ?? emptyRecord(input, msg)),
      status:        attempt >= MAX_RETRIES ? "failed" : "pending",
      attempt_count: attempt,
      processed_at:  new Date().toISOString(),
      error_log:     msg,
    });
    return "failed";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n📚  Book Enrichment — Gemini Vision v2 (URL mode)\n");
  console.log(`  Model   : ${GEMINI_MODEL}`);
  console.log(`  Batch   : ${BATCH_SIZE} books, ${DELAY_MS}ms delay, ${BATCH_DELAY / 1000}s between batches`);
  console.log(`  Scores  : auto≥${SCORE_AUTO}, review≥${SCORE_REVIEW}\n`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  ${INPUT_FILE} not found`);
    process.exit(1);
  }

  const rawInput = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const inputs: InputBook[] = Array.isArray(rawInput)
    ? rawInput : rawInput.books ?? rawInput.data ?? [];

  const state = loadState();
  const cache = loadCache();

  const pending = inputs.filter(i => {
    const s = state.get(i.id);
    return !s || s.status === "pending"
      || (s.status === "failed" && (s.attempt_count ?? 0) < MAX_RETRIES);
  });

  console.log(`  Total   : ${inputs.length}`);
  console.log(`  Done    : ${[...state.values()].filter(r => r.status === "done").length}`);
  console.log(`  Pending : ${pending.length}`);
  console.log(`  Cache   : ${cache.size} entries\n`);

  if (pending.length > 1200) {
    const days = Math.ceil(pending.length / 1200);
    console.log(`  ⚠️  Free tier ~1,200/day → ~${days} days total`);
    console.log(`     Run once per day — resumes automatically.\n`);
  }

  console.log("─".repeat(65));

  let ok = 0, review = 0, fail = 0;

  for (let b = 0; b < pending.length; b += BATCH_SIZE) {
    const batch = pending.slice(b, b + BATCH_SIZE);
    const bNum = Math.floor(b / BATCH_SIZE) + 1;
    const bTotal = Math.ceil(pending.length / BATCH_SIZE);

    console.log(`\n  ── Batch ${bNum}/${bTotal} ─────────────────────────────\n`);

    for (let j = 0; j < batch.length; j++) {
      const book = batch[j];
      const n = b + j + 1;
      process.stdout.write(`  [${n}/${pending.length}] ${String(book.id).slice(0, 8)}...`);

      const status = await processBook(book, state, cache);
      const rec = state.get(book.id)!;

      if (status === "done")         ok++;
      if (status === "needs_review") review++;
      if (status === "failed")       fail++;

      const icon  = status === "done" ? "✅" : status === "needs_review" ? "🟡" : "❌";
      const title = (rec.verified_title || rec.raw_title || "—").slice(0, 36);
      const score = rec.match_score ? ` (${Math.round(rec.match_score * 100)}%)` : "";
      const err   = status === "failed" ? ` [${rec.error_log.slice(0, 40)}]` : "";
      process.stdout.write(` ${icon} ${title}${score}${err}\n`);

      saveState(state);
      saveCache(cache);

      if (j < batch.length - 1) await sleep(DELAY_MS);
    }

    if (b + BATCH_SIZE < pending.length) {
      console.log(`\n  ⏸  Batch done. Waiting ${BATCH_DELAY / 1000}s...\n`);
      await sleep(BATCH_DELAY);
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const all = [...state.values()];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));

  if (review + fail > 0) {
    const reviewFile = path.join(__dirname, "needs-review.json");
    fs.writeFileSync(reviewFile,
      JSON.stringify(all.filter(r => r.status !== "done"), null, 2));
    console.log(`\n  Review  → ${reviewFile}`);
  }

  console.log("\n" + "═".repeat(65));
  console.log("  RESULTS");
  console.log(`  ✅  Auto-verified : ${ok}`);
  console.log(`  🟡  Needs review  : ${review}`);
  console.log(`  ❌  Failed        : ${fail}`);
  console.log(`  📄  Output        : ${OUTPUT_FILE}`);
  console.log("═".repeat(65) + "\n");
}

main().catch(e => { console.error("❌  Fatal:", e); process.exit(1); });
