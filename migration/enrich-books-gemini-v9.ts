import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// ─── Config ───────────────────────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? "";
const INPUT_FILE = process.env.INPUT_FILE ?? path.join(__dirname, "input-images.json");
const STATE_FILE = path.join(__dirname, "enrichment-state.json");
const OUTPUT_FILE = path.join(__dirname, "enriched-books.json");
const CACHE_FILE = path.join(__dirname, "api-cache.json");

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? "20");
const DELAY_MS = parseInt(process.env.DELAY_MS ?? "3000");
const BATCH_DELAY = parseInt(process.env.BATCH_DELAY_MS ?? "30000");
const SCORE_AUTO = parseFloat(process.env.SCORE_AUTO_THRESHOLD ?? "0.85");
const SCORE_REVIEW = parseFloat(process.env.SCORE_REVIEW_THRESHOLD ?? "0.60");
const MAX_RETRIES = 3;

const GEMINI_MODEL = "gemini-2.5-flash";

if (!GEMINI_KEY) {
  console.error(`
❌ GEMINI_API_KEY missing.
   Get FREE key: https://aistudio.google.com/app/apikey
   Add to .env.local: GEMINI_API_KEY=AIza...
`);
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Confidence = "high" | "medium" | "low" | "none";
type RecordStatus = "pending" | "done" | "needs_review" | "failed";

interface InputBook {
  id: string;
  drive_file_id?: string;
  image_url?: string;
  existing_title?: string;
  existing_author?: string;
}

interface RawFields {
  raw_title: string;
  raw_subtitle: string;
  raw_author: string;
  raw_visible_text: string;
  language_guess: string;
  confidence_title: Confidence;
  confidence_author: Confidence;
}

interface BookRecord extends InputBook, RawFields {
  google_books_id: string;
  google_books_title: string;
  google_books_author: string;
  google_books_publisher: string;
  google_books_year: string;
  google_books_isbn10: string;
  google_books_isbn13: string;
  google_books_language: string;
  google_books_categories: string;
  google_books_description: string;
  google_books_page_count: string;

  openlibrary_id: string;
  openlibrary_title: string;
  openlibrary_author: string;
  openlibrary_year: string;
  openlibrary_isbn: string;
  openlibrary_subjects: string;
  openlibrary_publisher: string;

  verified_title: string;
  verified_author: string;
  verified_publisher: string;
  verified_year: string;
  verified_isbn10: string;
  verified_isbn13: string;
  verified_language: string;
  verified_category: string;
  verified_subjects: string;
  verified_description: string;
  verified_page_count: string;
  verified_source: string;

  match_score: number;
  needs_review: boolean;
  review_reason: string;
  status: RecordStatus;
  attempt_count: number;
  processed_at: string;
  error_log: string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function loadState(): Map<string, BookRecord> {
  if (!fs.existsSync(STATE_FILE)) return new Map();
  const arr: BookRecord[] = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  return new Map(arr.map((r) => [r.id, r]));
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
  m.forEach((v, k) => {
    o[k] = v;
  });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(o, null, 2));
}

// ─── HTTP ─────────────────────────────────────────────────────────────────────

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c: string) => (d += c));
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
    https
      .get(url, { headers: { "User-Agent": "BookEnricher/2.0" } }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
          resolve(httpGetJson(res.headers.location));
          return;
        }
        let d = "";
        res.on("data", (c: string) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch {
            reject(new Error("Bad JSON"));
          }
        });
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await sleep(2000 * Math.pow(2, i));
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanTitle(t: string): string {
  return (t || "")
    .replace(/[\[\]{}()|\\/]/g, " ")
    .replace(/[^\p{L}\p{N}\s:'"-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function majorWords(t: string, maxWords = 4): string {
  return cleanTitle(t)
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, maxWords)
    .join(" ");
}

// ─── Image URL resolution ─────────────────────────────────────────────────────

function resolveImageUrl(book: InputBook): { url: string; fileId: string | null } | null {
  let fileId: string | null = null;

  if (book.drive_file_id && book.drive_file_id.length > 10) {
    fileId = book.drive_file_id;
  } else if (book.image_url) {
    const m =
      book.image_url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) ??
      book.image_url.match(/\/d\/([a-zA-Z0-9_-]{10,})/) ??
      book.image_url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m) fileId = m[1];
  }

  if (fileId) {
    return {
      url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      fileId,
    };
  }

  if (book.image_url?.startsWith("http")) {
    return { url: book.image_url, fileId: null };
  }

  return null;
}

// ─── Step 1: Gemini Vision ────────────────────────────────────────────────────

const VISION_PROMPT = `You are an expert librarian reading a book cover or title page image.

Your task: extract the bibliographic text visible in the image.

IMPORTANT RULES:
- Read the LARGEST and most prominent text first — that is the title
- If text is partially visible or slightly blurry, write what you can read — do NOT leave empty
- Make educated guesses based on visible letters — partial is better than empty
- Preserve exact spelling, language, and script (Hebrew, Latin, Cyrillic, etc.)
- Do NOT translate anything
- Look for author name: usually smaller text below the title, or at the top

Return ONLY this JSON object (no markdown, no explanation):
{
  "raw_title": "the main title — largest/most prominent text. Write partial if needed. Never leave empty if ANY text is visible.",
  "raw_subtitle": "subtitle or series name if visible, else empty string",
  "raw_author": "author/editor name if visible, else empty string",
  "raw_visible_text": "ALL text on the cover, semicolon-separated, verbatim",
  "language_guess": "Hebrew/English/French/German/Arabic/Yiddish/Latin/Russian/Other",
  "confidence_title": "high=clearly readable, medium=mostly readable, low=guessed from partial letters, none=no text visible at all",
  "confidence_author": "high/medium/low/none"
}`;

async function extractWithGemini(imageUrl: string): Promise<RawFields> {
  const fileId =
    imageUrl.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1] ??
    imageUrl.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1] ??
    null;

  const candidates: string[] = [imageUrl];
  if (fileId) {
    candidates.push(
      `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
      `https://lh3.googleusercontent.com/d/${fileId}=s1600`,
      `https://drive.google.com/uc?id=${fileId}&export=view`
    );
  }

  let imgBase64 = "";
  let mimeType = "image/jpeg";
  let usedUrl = "";

  for (const url of candidates) {
    try {
      const buf = await new Promise<Buffer>((resolve, reject) => {
        function doGet(u: string, hops = 0): void {
          if (hops > 8) {
            reject(new Error("redirect loop"));
            return;
          }

          const pu = new URL(u);
          https
            .get(
              {
                hostname: pu.hostname,
                path: pu.pathname + pu.search,
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
                  Referer: "https://drive.google.com/",
                  Cookie: "",
                },
              },
              (res) => {
                if (
                  res.statusCode &&
                  res.statusCode >= 300 &&
                  res.statusCode < 400 &&
                  res.headers.location
                ) {
                  doGet(res.headers.location, hops + 1);
                  return;
                }

                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () => {
                  const b = Buffer.concat(chunks);
                  const firstBytes = b.slice(0, 20).toString("ascii");
                  const isHtml =
                    b[0] === 0x3c ||
                    firstBytes.toLowerCase().includes("<!doc") ||
                    firstBytes.toLowerCase().includes("<html") ||
                    b.length < 800;

                  if (isHtml) {
                    reject(new Error(`HTML/empty response (${b.length}b)`));
                    return;
                  }

                  resolve(b);
                });
                res.on("error", reject);
              }
            )
            .on("error", reject);
        }

        doGet(url);
      });

      if (buf[0] === 0x89 && buf[1] === 0x50) mimeType = "image/png";
      else if (buf[0] === 0x47 && buf[1] === 0x49) mimeType = "image/gif";
      else mimeType = "image/jpeg";

      imgBase64 = buf.toString("base64");
      usedUrl = url;
      break;
    } catch {
      // try next
    }
  }

  if (!imgBase64) {
    throw new Error(`Could not download image from any URL (fileId=${fileId ?? "none"})`);
  }

  if (process.env.DEBUG_SCORE) {
    process.stdout.write(
      ` [img:${Math.round((imgBase64.length * 0.75) / 1024)}kb via ${usedUrl.slice(0, 50)}]`
    );
  }

  const body = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: imgBase64 } },
          { text: VISION_PROMPT },
        ],
      },
    ],
    generationConfig: { temperature: 0.05, maxOutputTokens: 400 },
  });

  const responseText = await withRetry(() =>
    httpPost(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
      body
    )
  );

  const parsed = JSON.parse(responseText);

  if (parsed.error?.code === 429) {
    const waitSec = parseInt(parsed.error?.details?.[0]?.retryDelay ?? "60") || 60;
    console.warn(`\n  ⏳ Gemini rate limit — waiting ${waitSec}s (attempt will not count)...`);
    await sleep(waitSec * 1000 + 3000);
    throw new Error("RATE_LIMIT");
  }

  if (parsed.error) throw new Error(`Gemini: ${parsed.error.message}`);
  if (!parsed.candidates?.[0]) throw new Error("No candidates returned");

  const text = parsed.candidates[0].content.parts[0].text ?? "{}";
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  try {
    const r = JSON.parse(clean);
    return {
      raw_title: String(r.raw_title ?? ""),
      raw_subtitle: String(r.raw_subtitle ?? ""),
      raw_author: String(r.raw_author ?? ""),
      raw_visible_text: String(r.raw_visible_text ?? ""),
      language_guess: String(r.language_guess ?? ""),
      confidence_title: (r.confidence_title as Confidence) ?? "none",
      confidence_author: (r.confidence_author as Confidence) ?? "none",
    };
  } catch {
    return {
      raw_title: "",
      raw_subtitle: "",
      raw_author: "",
      raw_visible_text: text.slice(0, 200),
      language_guess: "",
      confidence_title: "none",
      confidence_author: "none",
    };
  }
}

// ─── Step 2: Google Books ─────────────────────────────────────────────────────

async function searchGoogleBooks(title: string, author: string, cache: Map<string, any>): Promise<any> {
  const cleanT = cleanTitle(title);
  const cleanA = cleanTitle(author);

  if (!cleanT.trim()) return null;

  const cacheKey = `gb:${cleanT.toLowerCase().slice(0, 60)}|${cleanA.toLowerCase().slice(0, 40)}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const kp = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : "";

  const shortTitle = majorWords(cleanT, 3);
  const shorterTitle = majorWords(cleanT, 2);

  const queries = [
    cleanA
      ? `intitle:${encodeURIComponent(cleanT.slice(0, 60))}+inauthor:${encodeURIComponent(cleanA.slice(0, 40))}`
      : null,
    `intitle:${encodeURIComponent(cleanT.slice(0, 60))}`,
    encodeURIComponent(`${cleanT} ${cleanA}`.trim().slice(0, 80)),
    encodeURIComponent(cleanT.slice(0, 60)),
    shortTitle ? encodeURIComponent(shortTitle) : null,
    shorterTitle ? encodeURIComponent(shorterTitle) : null,
  ].filter(Boolean) as string[];

  let bestOverall: any = null;
  let bestOverallScore = 0;

  for (const q of queries) {
    try {
      await sleep(400);

      const data = await withRetry(() =>
        httpGetJson(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=8&printType=books${kp}`)
      );

      if (!data.items?.length) continue;

      for (const item of data.items) {
        const v = item.volumeInfo;
        const titleScore = strSim(cleanT, v.title ?? "");
        const authorScore = cleanA ? strSim(cleanA, (v.authors ?? []).join(" ")) : 0;

        const combined = cleanA ? titleScore * 0.75 + authorScore * 0.25 : titleScore;

        if (combined > bestOverallScore) {
          bestOverallScore = combined;
          bestOverall = item;
        }
      }

      if (bestOverallScore >= 0.55) break;
    } catch {
      continue;
    }
  }

  if (!bestOverall) {
    cache.set(cacheKey, null);
    return null;
  }

  const v = bestOverall.volumeInfo;
  const isbns = v.industryIdentifiers ?? [];

  const result = {
    google_books_id: bestOverall.id,
    google_books_title: v.title ?? "",
    google_books_author: (v.authors ?? []).join("; "),
    google_books_publisher: v.publisher ?? "",
    google_books_year: (v.publishedDate ?? "").slice(0, 4),
    google_books_isbn10: isbns.find((x: any) => x.type === "ISBN_10")?.identifier ?? "",
    google_books_isbn13: isbns.find((x: any) => x.type === "ISBN_13")?.identifier ?? "",
    google_books_language: v.language ?? "",
    google_books_categories: (v.categories ?? []).join(", "),
    google_books_description: (v.description ?? "").slice(0, 800),
    google_books_page_count: String(v.pageCount ?? ""),
    _score: bestOverallScore,
  };

  cache.set(cacheKey, result);
  return result;
}

// ─── Step 3: Open Library ─────────────────────────────────────────────────────

async function searchOpenLibrary(title: string, author: string, isbn: string, cache: Map<string, any>): Promise<any> {
  const cleanT = cleanTitle(title);
  const cleanA = cleanTitle(author);

  const cacheKey = `ol:${isbn || cleanT.slice(0, 50) + "|" + cleanA.slice(0, 30)}`;
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
          openlibrary_id: entry.key ?? "",
          openlibrary_title: entry.title ?? "",
          openlibrary_author: entry.authors?.[0]?.name ?? "",
          openlibrary_year: entry.publish_date ?? "",
          openlibrary_isbn: isbn,
          openlibrary_subjects: (entry.subjects ?? [])
            .slice(0, 5)
            .map((s: any) => s.name ?? s)
            .join(", "),
          openlibrary_publisher: entry.publishers?.[0]?.name ?? "",
        };
        cache.set(cacheKey, r);
        return r;
      }
    }

    if (!cleanT.trim()) {
      cache.set(cacheKey, null);
      return null;
    }

    const q1 = encodeURIComponent(`${cleanT} ${cleanA}`.trim().slice(0, 80));
    const q2 = encodeURIComponent(majorWords(cleanT, 3));
    const q3 = encodeURIComponent(cleanT.slice(0, 60));

    const queries = [q1, q2, q3].filter(Boolean);

    let best: any = null;
    let bestScore = 0;

    for (const q of queries) {
      const data = await withRetry(() =>
        httpGetJson(
          `https://openlibrary.org/search.json?q=${q}&limit=5&fields=key,title,author_name,first_publish_year,isbn,subject,publisher`
        )
      );

      for (const doc of data?.docs ?? []) {
        const titleScore = strSim(cleanT, doc.title ?? "");
        const authorScore = cleanA ? strSim(cleanA, doc.author_name?.[0] ?? "") : 0;
        const combined = cleanA ? titleScore * 0.75 + authorScore * 0.25 : titleScore;

        if (combined > bestScore) {
          bestScore = combined;
          best = doc;
        }
      }

      if (bestScore >= 0.55) break;
    }

    if (!best) {
      cache.set(cacheKey, null);
      return null;
    }

    const r = {
      openlibrary_id: best.key ?? "",
      openlibrary_title: best.title ?? "",
      openlibrary_author: best.author_name?.[0] ?? "",
      openlibrary_year: String(best.first_publish_year ?? ""),
      openlibrary_isbn: best.isbn?.[0] ?? "",
      openlibrary_subjects: (best.subject ?? []).slice(0, 5).join(", "),
      openlibrary_publisher: best.publisher?.[0] ?? "",
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
  return s
    .toLowerCase()
    .replace(/[\u0590-\u05FF\u05B0-\u05BD]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function trigramSim(na: string, nb: string): number {
  const tri = (s: string) => {
    const t = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) t.add(s.slice(i, i + 3));
    return t;
  };

  const ta = tri(na);
  const tb = tri(nb);
  const inter = [...ta].filter((x) => tb.has(x)).length;
  const union = ta.size + tb.size - inter;
  return union ? inter / union : 0;
}

function strSim(a: string, b: string): number {
  if (!a || !b) return 0;

  const na = norm(cleanTitle(a));
  const nb = norm(cleanTitle(b));

  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  if (na.includes(nb) && nb.length >= 5) return 0.95;
  if (nb.includes(na) && na.length >= 5) return 0.95;

  const mainA = na.split(/[:\u2014\u2013]|--/)[0].trim();
  const mainB = nb.split(/[:\u2014\u2013]|--/)[0].trim();

  if (mainA && mainB) {
    if (mainA === mainB) return 0.93;
    if (mainA.includes(mainB) || mainB.includes(mainA)) return 0.88;
  }

  const wordsA = na.split(" ").filter((w: string) => w.length > 2);
  const wordsB = nb.split(" ").filter((w: string) => w.length > 2);

  if (wordsA.length && wordsB.length) {
    const common = wordsA.filter((w: string) => wordsB.includes(w)).length;
    const overlap = common / Math.max(wordsA.length, wordsB.length);
    if (overlap >= 0.5) return 0.72 + overlap * 0.18;
    if (overlap >= 0.34) return 0.58 + overlap * 0.15;
  }

  const tri = trigramSim(na, nb);
  if (tri > 0.7) return 0.72 + tri * 0.18;
  if (tri > 0.5) return 0.55 + tri * 0.15;

  return tri;
}

// ─── Merge ────────────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, string> = {
  he: "Hebrew",
  en: "English",
  fr: "French",
  de: "German",
  ar: "Arabic",
  yi: "Yiddish",
  la: "Latin",
  es: "Spanish",
  it: "Italian",
  ru: "Russian",
  pl: "Polish",
};

function pick(...vals: (string | undefined | null)[]): string {
  return vals.find((v) => v && String(v).trim() && !["null", "undefined"].includes(String(v))) ?? "";
}

function buildRecord(input: InputBook, raw: RawFields, gb: any, ol: any): BookRecord {
  const candidates: Array<{ score: number; source: string; d: any }> = [];

  if (gb) {
    const s = strSim(raw.raw_title, gb.google_books_title) * 0.75 +
      strSim(raw.raw_author, gb.google_books_author) * 0.25;
    candidates.push({ score: Math.min(1, s + 0.03), source: "google_books", d: gb });
  }

  if (ol) {
    const s = strSim(raw.raw_title, ol.openlibrary_title) * 0.75 +
      strSim(raw.raw_author, ol.openlibrary_author) * 0.25;
    candidates.push({ score: s * 0.9, source: "open_library", d: ol });
  }

  const reasons: string[] = [];
  if (raw.confidence_title === "none") reasons.push("Title not readable");
  if (raw.confidence_author === "none") reasons.push("Author not readable");

  const best = candidates.sort((a, b) => b.score - a.score)[0];
  const score = best?.score ?? 0;

  if (process.env.DEBUG_SCORE) {
    process.stdout.write(
      `\n    [DEBUG] raw_title="${raw.raw_title}" | raw_author="${raw.raw_author}" | gb_title="${gb?.google_books_title}" | gb_author="${gb?.google_books_author}" | ol_title="${ol?.openlibrary_title}" | score=${score}\n`
    );
  }

  if (score < SCORE_REVIEW) reasons.push(`Low match score: ${score.toFixed(2)}`);

  const d = best?.d ?? {};
  const langCode = pick(d.google_books_language, "").slice(0, 2).toLowerCase();
  const lang = LANG_MAP[langCode] ?? pick(d.google_books_language, raw.language_guess);
  const year =
    (pick(d.google_books_year, d.openlibrary_year).match(/\b(1[0-9]{3}|20[0-2][0-9])\b/) ?? [])[0] ?? "";

  const status: RecordStatus =
    score >= SCORE_AUTO ? "done" : score >= SCORE_REVIEW ? "needs_review" : "failed";

  if (!pick(d.google_books_isbn13, d.google_books_isbn10, d.openlibrary_isbn)) {
    reasons.push("No ISBN found");
  }

  return {
    ...input,
    ...raw,

    google_books_id: gb?.google_books_id ?? "",
    google_books_title: gb?.google_books_title ?? "",
    google_books_author: gb?.google_books_author ?? "",
    google_books_publisher: gb?.google_books_publisher ?? "",
    google_books_year: gb?.google_books_year ?? "",
    google_books_isbn10: gb?.google_books_isbn10 ?? "",
    google_books_isbn13: gb?.google_books_isbn13 ?? "",
    google_books_language: gb?.google_books_language ?? "",
    google_books_categories: gb?.google_books_categories ?? "",
    google_books_description: gb?.google_books_description ?? "",
    google_books_page_count: gb?.google_books_page_count ?? "",

    openlibrary_id: ol?.openlibrary_id ?? "",
    openlibrary_title: ol?.openlibrary_title ?? "",
    openlibrary_author: ol?.openlibrary_author ?? "",
    openlibrary_year: ol?.openlibrary_year ?? "",
    openlibrary_isbn: ol?.openlibrary_isbn ?? "",
    openlibrary_subjects: ol?.openlibrary_subjects ?? "",
    openlibrary_publisher: ol?.openlibrary_publisher ?? "",

    verified_title: pick(d.google_books_title, d.openlibrary_title, raw.raw_title),
    verified_author: pick(d.google_books_author, d.openlibrary_author, raw.raw_author),
    verified_publisher: pick(d.google_books_publisher, d.openlibrary_publisher),
    verified_year: year,
    verified_isbn10: pick(d.google_books_isbn10),
    verified_isbn13: pick(d.google_books_isbn13, d.openlibrary_isbn),
    verified_language: lang,
    verified_category: pick(
      d.google_books_categories?.split(",")?.[0]?.trim(),
      d.openlibrary_subjects?.split(",")?.[0]?.trim()
    ),
    verified_subjects: pick(d.google_books_categories, d.openlibrary_subjects),
    verified_description: pick(d.google_books_description),
    verified_page_count: pick(d.google_books_page_count),
    verified_source: best?.source ?? "vision_only",

    match_score: Math.round(score * 100) / 100,
    needs_review: score < SCORE_AUTO,
    review_reason: reasons.join("; "),
    status,
    attempt_count: 0,
    processed_at: new Date().toISOString(),
    error_log: "",
  };
}

// ─── Process one book ─────────────────────────────────────────────────────────

function emptyRecord(input: InputBook, err: string): BookRecord {
  return {
    ...input,
    raw_title: "",
    raw_subtitle: "",
    raw_author: "",
    raw_visible_text: "",
    language_guess: "",
    confidence_title: "none",
    confidence_author: "none",

    google_books_id: "",
    google_books_title: "",
    google_books_author: "",
    google_books_publisher: "",
    google_books_year: "",
    google_books_isbn10: "",
    google_books_isbn13: "",
    google_books_language: "",
    google_books_categories: "",
    google_books_description: "",
    google_books_page_count: "",

    openlibrary_id: "",
    openlibrary_title: "",
    openlibrary_author: "",
    openlibrary_year: "",
    openlibrary_isbn: "",
    openlibrary_subjects: "",
    openlibrary_publisher: "",

    verified_title: "",
    verified_author: "",
    verified_publisher: "",
    verified_year: "",
    verified_isbn10: "",
    verified_isbn13: "",
    verified_language: "",
    verified_category: "",
    verified_subjects: "",
    verified_description: "",
    verified_page_count: "",
    verified_source: "",
    match_score: 0,
    needs_review: true,
    review_reason: err,
    status: "failed",
    attempt_count: 0,
    processed_at: new Date().toISOString(),
    error_log: err,
  };
}

async function processBook(
  input: InputBook,
  state: Map<string, BookRecord>,
  cache: Map<string, any>
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
    let raw: RawFields;

    try {
      raw = await extractWithGemini(resolved.url);
    } catch (visionErr) {
      if (input.existing_title) {
        process.stdout.write(` [vision failed, using existing_title]`);
        raw = {
          raw_title: input.existing_title,
          raw_subtitle: "",
          raw_author: input.existing_author ?? "",
          raw_visible_text: "",
          language_guess: "",
          confidence_title: "low",
          confidence_author: input.existing_author ? "low" : "none",
        };
      } else {
        throw visionErr;
      }
    }

    if (!raw.raw_title && input.existing_title) {
      raw.raw_title = input.existing_title;
      raw.raw_author = raw.raw_author || input.existing_author || "";
      raw.confidence_title = "low";
    }

    const searchTitle = cleanTitle(raw.raw_title || input.existing_title || "");
    const searchAuthor = cleanTitle(raw.raw_author || input.existing_author || "");

    let [gb, ol] = await Promise.all([
      searchGoogleBooks(searchTitle, searchAuthor, cache),
      searchOpenLibrary(searchTitle, searchAuthor, "", cache),
    ]);

    if (!gb && input.existing_title) {
      gb = await searchGoogleBooks(cleanTitle(input.existing_title), "", cache);
    }

    const isbn = gb?.google_books_isbn13 || gb?.google_books_isbn10;
    const olEnriched = isbn ? await searchOpenLibrary("", "", isbn, cache) : ol;

    const record = buildRecord(input, raw, gb, olEnriched ?? ol);
    record.attempt_count = attempt;
    state.set(input.id, record);
    return record.status;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Rate limit: keep as pending and don't count as a real attempt
    const isRateLimit = msg === "RATE_LIMIT" || msg.includes("429");
    state.set(input.id, {
      ...(existing ?? emptyRecord(input, msg)),
      status: "pending",
      attempt_count: isRateLimit ? (existing?.attempt_count ?? 0) : attempt,
      processed_at: new Date().toISOString(),
      error_log: msg,
    });
    return "failed";
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n📚 Book Enrichment — Gemini Vision v9\n");
  console.log(`  Model   : ${GEMINI_MODEL}`);
  console.log(`  Batch   : ${BATCH_SIZE} books, ${DELAY_MS}ms delay, ${BATCH_DELAY / 1000}s between batches`);
  console.log(`  Scores  : auto≥${SCORE_AUTO}, review≥${SCORE_REVIEW}\n`);

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ ${INPUT_FILE} not found`);
    process.exit(1);
  }

  const rawInput = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const inputs: InputBook[] = Array.isArray(rawInput) ? rawInput : rawInput.books ?? rawInput.data ?? [];

  const state = loadState();
  const cache = loadCache();

  const pending = inputs.filter((i) => {
    const s = state.get(i.id);
    return !s || s.status === "pending" || (s.status === "failed" && (s.attempt_count ?? 0) < MAX_RETRIES);
  });

  console.log(`  Total   : ${inputs.length}`);
  console.log(`  Done    : ${[...state.values()].filter((r) => r.status === "done").length}`);
  console.log(`  Pending : ${pending.length}`);
  console.log(`  Cache   : ${cache.size} entries\n`);

  if (pending.length > 1200) {
    const days = Math.ceil(pending.length / 1200);
    console.log(`  ⚠️ Free tier ~1,200/day → ~${days} days total`);
    console.log(`     Run once per day — resumes automatically.\n`);
  }

  console.log("─".repeat(65));

  let ok = 0;
  let review = 0;
  let fail = 0;

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

      if (status === "done") ok++;
      if (status === "needs_review") review++;
      if (status === "failed") fail++;

      const icon = status === "done" ? "✅" : status === "needs_review" ? "🟡" : "❌";
      const title = (rec.verified_title || rec.raw_title || "—").slice(0, 36);
      const score = rec.match_score ? ` (${Math.round(rec.match_score * 100)}%)` : "";
      const err = status === "failed" ? ` [${rec.error_log.slice(0, 40)}]` : "";
      process.stdout.write(` ${icon} ${title}${score}${err}\n`);

      saveState(state);
      saveCache(cache);

      if (j < batch.length - 1) await sleep(DELAY_MS);
    }

    if (b + BATCH_SIZE < pending.length) {
      console.log(`\n  ⏸ Batch done. Waiting ${BATCH_DELAY / 1000}s...\n`);
      await sleep(BATCH_DELAY);
    }
  }

  const all = [...state.values()];
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(all, null, 2));

  if (review + fail > 0) {
    const reviewFile = path.join(__dirname, "needs-review.json");
    fs.writeFileSync(
      reviewFile,
      JSON.stringify(all.filter((r) => r.status !== "done"), null, 2)
    );
    console.log(`\n  Review  → ${reviewFile}`);
  }

  console.log("\n" + "═".repeat(65));
  console.log("  RESULTS");
  console.log(`  ✅ Auto-verified : ${ok}`);
  console.log(`  🟡 Needs review  : ${review}`);
  console.log(`  ❌ Failed        : ${fail}`);
  console.log(`  📄 Output        : ${OUTPUT_FILE}`);
  console.log("═".repeat(65) + "\n");
}

async function runForever() {
  while (true) {
    try {
      await main();
      console.log("✅ Cycle finished, restarting in 5s...");
      await new Promise(r => setTimeout(r, 5000));
    } catch (err) {
      console.log("⚠️ Error, retrying in 10s...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }
}

runForever();