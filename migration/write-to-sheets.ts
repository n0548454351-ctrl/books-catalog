/**
 * write-to-sheets.ts
 *
 * Pushes enriched-books.json to a Google Sheet.
 *
 * Option A (recommended): Google Apps Script webhook
 *   - Deploy a simple Apps Script as a web app
 *   - POST JSON → it writes to the sheet
 *
 * Option B: Direct import
 *   - Just open enriched-books.json and use a JSON→Sheets converter
 *   - Or copy the CSV output and paste into Sheets
 *
 * Usage:
 *   npx ts-node --project tsconfig.migration.json migration/write-to-sheets.ts
 *
 * Env:
 *   SHEETS_WEBHOOK_URL  — your Apps Script web app URL
 *   OR
 *   run with --csv to just generate a CSV file for manual import
 */

import * as fs    from "fs";
import * as path  from "path";
import * as https from "https";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const INPUT  = path.join(__dirname, "enriched-books.json");
const WEBHOOK = process.env.SHEETS_WEBHOOK_URL ?? "";
const CSV_OUT = path.join(__dirname, "enriched-books.csv");

// Column order for Sheets
const COLUMNS = [
  "source_id", "drive_file_id", "image_url",
  "title", "title_original", "author",
  "publisher", "year", "language",
  "isbn_10", "isbn_13",
  "category", "subject_tags",
  "description", "page_count", "edition",
  "data_source", "confidence",
  "google_books_id", "open_library_id",
  "vision_title", "vision_author", "vision_raw_text",
  "notes",
];

function toCsv(rows: Record<string, string>[]): string {
  const header = COLUMNS.join(",");
  const lines = rows.map(row =>
    COLUMNS.map(col => {
      const val = String(row[col] ?? "").replace(/"/g, '""');
      return `"${val}"`;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`❌  ${INPUT} not found — run enrich-books.ts first`);
    process.exit(1);
  }

  const books = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  console.log(`\n📊  ${books.length} enriched books\n`);

  // Always write CSV (easy to open in Sheets manually)
  const csv = toCsv(books);
  fs.writeFileSync(CSV_OUT, csv, "utf-8");
  console.log(`✅  CSV written → ${CSV_OUT}`);
  console.log(`   Open in Google Sheets: File → Import → Upload → ${path.basename(CSV_OUT)}\n`);

  // If webhook configured, also POST to Sheets
  if (WEBHOOK) {
    console.log(`📡  Posting to Google Sheets webhook...`);
    const body = JSON.stringify({ books });
    await new Promise<void>((resolve, reject) => {
      const url = new URL(WEBHOOK);
      const req = https.request(
        { hostname: url.hostname, path: url.pathname + url.search, method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) } },
        (res) => {
          let d = "";
          res.on("data", c => d += c);
          res.on("end", () => { console.log("  Response:", d.slice(0, 100)); resolve(); });
        }
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  } else {
    console.log(`ℹ️   No SHEETS_WEBHOOK_URL set — use the CSV file above for manual import.`);
    console.log(`\n   Apps Script webhook (optional) — paste into Google Apps Script:\n`);
    console.log(`   function doPost(e) {`);
    console.log(`     const data = JSON.parse(e.postData.contents);`);
    console.log(`     const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();`);
    console.log(`     data.books.forEach(b => {`);
    console.log(`       sheet.appendRow([b.title, b.author, b.year, b.publisher, ...]);`);
    console.log(`     });`);
    console.log(`     return ContentService.createTextOutput("ok");`);
    console.log(`   }`);
  }
}

main().catch(e => { console.error("❌", e); process.exit(1); });
