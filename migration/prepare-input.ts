/**
 * prepare-input.ts
 *
 * Builds migration/input-images.json from one of:
 *   A. Existing Supabase book_images table (if you already imported)
 *   B. A CSV file with columns: id, drive_file_id, image_url
 *   C. A Google Drive folder (lists all image files)
 *
 * Usage:
 *   # From Supabase:
 *   npx ts-node --project tsconfig.migration.json migration/prepare-input.ts --source supabase
 *
 *   # From CSV:
 *   npx ts-node --project tsconfig.migration.json migration/prepare-input.ts --source csv --file migration/my-books.csv
 */

import { createClient } from "@supabase/supabase-js";
import * as fs    from "fs";
import * as path  from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OUTPUT       = path.join(__dirname, "input-images.json");

const args   = process.argv.slice(2);
const source = args[args.indexOf("--source") + 1] ?? "supabase";
const file   = args[args.indexOf("--file")   + 1] ?? "";

function extractDriveId(url: string): string {
  const m = url?.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)
          ?? url?.match(/\/d\/([a-zA-Z0-9_-]{10,})/)
          ?? url?.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  return m?.[1] ?? "";
}

async function fromSupabase() {
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Fetching all books + images from Supabase (paginated)...");

  // Supabase default limit is 1,000 — we paginate to get all records
  const PAGE_SIZE = 1000;
  let page = 0;
  const allRows: any[] = [];

  while (true) {
    const from = page * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, error } = await sb
      .from("book_images")
      .select("id, book_id, image_url, storage_path, is_cover, book:books(id, title, title_he, author)")
      .eq("is_cover", true)
      .order("book_id")
      .range(from, to);

    if (error) { console.error("❌", error.message); process.exit(1); }

    const rows = data ?? [];
    allRows.push(...rows);
    process.stdout.write(`  Page ${page + 1}: ${rows.length} rows (total so far: ${allRows.length})\n`);

    // If we got fewer than PAGE_SIZE, we've reached the end
    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  const inputs = allRows.map((row: any) => ({
    id:              row.book_id,
    drive_file_id:   extractDriveId(row.image_url),
    image_url:       row.image_url,
    existing_title:  row.book?.title_he ?? row.book?.title ?? "",
    existing_author: row.book?.author ?? "",
    image_record_id: row.id,
  }));

  console.log(`\n✅  Found ${inputs.length} total cover images`);
  fs.writeFileSync(OUTPUT, JSON.stringify(inputs, null, 2));
  console.log(`✅  Written to ${OUTPUT}`);
}

async function fromCsv(csvPath: string) {
  const lines = fs.readFileSync(csvPath, "utf-8").split("\n");
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  const inputs = lines.slice(1)
    .filter(l => l.trim())
    .map((line, i) => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => row[h] = cols[j] ?? "");
      return {
        id:              row.id ?? String(i + 1),
        drive_file_id:   row.drive_file_id ?? extractDriveId(row.image_url ?? ""),
        image_url:       row.image_url ?? "",
        existing_title:  row.title ?? "",
        existing_author: row.author ?? "",
      };
    });

  console.log(`Found ${inputs.length} rows in CSV`);
  fs.writeFileSync(OUTPUT, JSON.stringify(inputs, null, 2));
  console.log(`✅  Written to ${OUTPUT}`);
}

async function main() {
  if (source === "supabase") {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("❌  Missing Supabase env vars"); process.exit(1);
    }
    await fromSupabase();
  } else if (source === "csv") {
    if (!file || !fs.existsSync(file)) {
      console.error(`❌  CSV file not found: ${file}`); process.exit(1);
    }
    await fromCsv(file);
  } else {
    console.error("❌  Unknown source. Use --source supabase or --source csv");
    process.exit(1);
  }
}

main().catch(e => { console.error("❌  Fatal:", e); process.exit(1); });
