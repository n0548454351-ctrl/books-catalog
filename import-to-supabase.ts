import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import fs from "fs";
import path from "path";

type LegacyBook = {
  source_row?: number;
  title?: string | null;
  author?: string | null;
  description?: string | null;
  category?: string | null;
  sub_topic?: string | null;
  image_url?: string | null;
  publisher?: string | null;
  year?: number | null;
  language?: string | null;
  price?: number | null;
  sku?: string | null;
  status?: string | null;
  quantity?: number | null;
  in_stock?: boolean | null;
  is_published?: boolean | null;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DATA_FILE = path.join(process.cwd(), "books_import_ready.json");
const ERRORS_FILE = path.join(process.cwd(), "import-errors.json");

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || ["nan", "null", "none", "not found"].includes(s.toLowerCase())) return null;
  return s;
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"`]/g, "")
    .replace(/[^a-zA-Z0-9\u0590-\u05FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .toLowerCase() || "book";
}

async function getOrCreateCategoryId(name: string | null): Promise<string | null> {
  const categoryName = clean(name) || "Uncategorized";
  const slug = slugify(categoryName);

  const { data: existing, error: findError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .or(`slug.eq.${slug},name.eq.${categoryName}`)
    .limit(1)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.id) return existing.id;

  const insertPayload: Record<string, unknown> = { slug };
  if (/[\u0590-\u05FF]/.test(categoryName)) {
    insertPayload.name = categoryName;
    insertPayload.name_he = categoryName;
  } else {
    insertPayload.name = categoryName;
  }

  const { data: created, error: createError } = await supabase
    .from("categories")
    .insert(insertPayload)
    .select("id")
    .single();

  if (createError) throw createError;
  return created.id;
}

async function getUniqueSlug(baseTitle: string): Promise<string> {
  const base = slugify(baseTitle);
  let slug = base;
  let counter = 2;
  while (true) {
    const { data, error } = await supabase
      .from("books")
      .select("id")
      .eq("slug", slug)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return slug;
    slug = `${base}-${counter}`;
    counter += 1;
  }
}

async function run() {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(`Data file not found: ${DATA_FILE}`);
  }

  const raw = fs.readFileSync(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const books: LegacyBook[] = Array.isArray(parsed) ? parsed : parsed.books ?? [];

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<Record<string, unknown>> = [];

  console.log(`📚 Found ${books.length} rows to import`);

  for (let i = 0; i < books.length; i++) {
    const row = books[i];
    const title = clean(row.title);
    const author = clean(row.author) || "Unknown";

    if (!title) {
      skipped += 1;
      errors.push({
        source_row: row.source_row ?? i + 1,
        reason: "Missing title",
      });
      continue;
    }

    try {
      const categoryId = await getOrCreateCategoryId(row.category ?? null);
      const slug = await getUniqueSlug(title);

      const { data: book, error: bookError } = await supabase
        .from("books")
        .insert({
          title,
          title_he: null,
          author,
          description: clean(row.description),
          category_id: categoryId,
          price: row.price ?? null,
          sku: clean(row.sku),
          publisher: clean(row.publisher),
          year: row.year ?? null,
          language: clean(row.language) || "Unknown",
          is_published: row.is_published ?? true,
          slug,
        })
        .select("id")
        .single();

      if (bookError) throw bookError;

      const { error: inventoryError } = await supabase
        .from("inventory")
        .insert({
          book_id: book.id,
          quantity: row.quantity ?? 1,
          in_stock: row.in_stock ?? true,
        });

      if (inventoryError) throw inventoryError;

      if (clean(row.image_url)) {
        const { error: imageError } = await supabase
          .from("book_images")
          .insert({
            book_id: book.id,
            image_url: row.image_url,
            storage_path: null,
            alt_text: title,
            sort_order: 0,
            is_cover: true,
          });

        if (imageError) throw imageError;
      }

      imported += 1;
      if (imported % 50 === 0) {
        console.log(`✅ ${imported} imported...`);
      }
    } catch (error: any) {
      failed += 1;
      errors.push({
        source_row: row.source_row ?? i + 1,
        title,
        reason: error?.message || String(error),
      });
      console.error(`❌ Failed row ${row.source_row ?? i + 1}: ${title}`);
    }
  }

  fs.writeFileSync(ERRORS_FILE, JSON.stringify(errors, null, 2), "utf8");
  console.log(`🎉 Done! imported=${imported}, skipped=${skipped}, failed=${failed}`);
  console.log(`📝 Error log: ${ERRORS_FILE}`);
}

run().catch((err) => {
  console.error("Fatal import error:", err);
  process.exit(1);
});
