/**
 * Migration script — import legacy book data into Supabase
 *
 * Usage:
 *   1.  Export the current site's books to migration/books-legacy.json
 *       (see README below for how to extract the data)
 *   2.  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 *   3.  Run:  npx ts-node --project tsconfig.migration.json migration/import-to-supabase.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── Legacy shape (flexible — adapt to whatever the exported JSON looks like) ─
interface LegacyBook {
  id?:          string | number;
  title?:       string;
  title_he?:    string;
  titleHe?:     string;
  author?:      string;
  description?: string;
  category?:    string;
  publisher?:   string;
  year?:        string | number;
  language?:    string;
  // image fields — we try several common keys
  image?:       string;
  imageUrl?:    string;
  image_url?:   string;
  cover?:       string;
  coverImage?:  string;
  cover_image?: string;
  thumbnail?:   string;
  // inventory
  in_stock?:    boolean;
  quantity?:    number;
  inStock?:     boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 100);
}

function getImage(b: LegacyBook): string | null {
  return b.image ?? b.imageUrl ?? b.image_url ?? b.cover ??
         b.coverImage ?? b.cover_image ?? b.thumbnail ?? null;
}

function getTitle(b: LegacyBook): string {
  return b.title ?? b.title_he ?? b.titleHe ?? "ללא כותרת";
}

function getTitleHe(b: LegacyBook): string | null {
  return b.title_he ?? b.titleHe ?? null;
}

function getInStock(b: LegacyBook): boolean {
  if (b.in_stock  !== undefined) return Boolean(b.in_stock);
  if (b.inStock   !== undefined) return Boolean(b.inStock);
  return true; // assume in stock unless told otherwise
}

// ─── Build a category name → id map ──────────────────────────────────────────
async function buildCategoryMap(): Promise<Map<string, string>> {
  const { data } = await sb.from("categories").select("id, name, name_he");
  const map = new Map<string, string>();
  (data ?? []).forEach((c: { id: string; name: string; name_he?: string }) => {
    map.set(c.name.toLowerCase(), c.id);
    if (c.name_he) map.set(c.name_he.trim(), c.id);
  });
  return map;
}

// ─── Main import ──────────────────────────────────────────────────────────────
async function importBooks(books: LegacyBook[]) {
  const catMap    = await buildCategoryMap();
  const usedSlugs = new Set<string>();
  let   ok = 0, fail = 0;

  for (const lb of books) {
    const title    = getTitle(lb);
    const titleHe  = getTitleHe(lb);
    const imageUrl = getImage(lb);

    // Unique slug
    let slug = slugify(lb.title ?? lb.title_he ?? lb.titleHe ?? `book-${Date.now()}`);
    const base = slug;
    let n = 0;
    while (usedSlugs.has(slug)) slug = `${base}-${++n}`;
    usedSlugs.add(slug);

    const catRaw = lb.category ?? "";
    const catId  = catMap.get(catRaw.toLowerCase()) ?? catMap.get(catRaw) ?? null;

    try {
      // 1. Insert book
      const { data: book, error: bookErr } = await sb
        .from("books")
        .insert({
          title,
          title_he:    titleHe,
          author:      lb.author ?? "לא ידוע",
          description: lb.description ?? null,
          category_id: catId,
          publisher:   lb.publisher ?? null,
          year:        lb.year ? Number(lb.year) : null,
          language:    lb.language ?? "Hebrew",
          is_published:true,
          slug,
        })
        .select()
        .single();

      if (bookErr) {
        console.error(`  ❌  "${title}":`, bookErr.message);
        fail++;
        continue;
      }

      // 2. Inventory
      await sb.from("inventory").insert({
        book_id:  book.id,
        quantity: lb.quantity ?? 1,
        in_stock: getInStock(lb),
      });

      // 3. Cover image (keep legacy URL — no re-upload needed)
      if (imageUrl) {
        await sb.from("book_images").insert({
          book_id:   book.id,
          image_url: imageUrl,
          is_cover:  true,
          sort_order:0,
          alt_text:  titleHe ?? title,
          // storage_path is NULL — legacy URL, not in Supabase Storage
        });
      }

      ok++;
      if (ok % 100 === 0) process.stdout.write(`  ✅  ${ok} imported…\n`);
    } catch (err) {
      console.error(`  ❌  Exception for "${title}":`, err);
      fail++;
    }
  }

  console.log(`\n🎉  Done!  ${ok} imported,  ${fail} failed.`);
}

async function main() {
  const jsonPath = path.join(__dirname, "books-legacy.json");

  if (!fs.existsSync(jsonPath)) {
    console.error(`
❌  books-legacy.json not found.

To create it, open https://books.neo100.uk in Chrome DevTools → Console and run:

  // Try to find the books array wherever it lives:
  const data = window.__BOOKS__ ?? window.books ?? window.catalog ?? [];
  copy(JSON.stringify(data, null, 2));

Then paste the result into  migration/books-legacy.json
    `);
    process.exit(1);
  }

  const raw   = fs.readFileSync(jsonPath, "utf-8");
  const books: LegacyBook[] = JSON.parse(raw);
  console.log(`📚  Found ${books.length} books to import\n`);
  await importBooks(books);
}

main().catch((err) => { console.error(err); process.exit(1); });
