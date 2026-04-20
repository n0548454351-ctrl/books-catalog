import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";
import type { BookFormData } from "@/types";

async function getUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: BookFormData = await req.json();
  if (!body.title || !body.author) {
    return NextResponse.json({ error: "title and author are required" }, { status: 400 });
  }

  const sb = createAdminClient();

  // Generate unique slug from original title
  const base = slugify(body.title_he ?? body.title);
  let slug = base;
  let suffix = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { count } = await sb.from("books").select("id", { count: "exact", head: true }).eq("slug", slug);
    if (!count) break;
    slug = `${base}-${++suffix}`;
  }

  // Insert book
  const { data: book, error: bookErr } = await sb.from("books").insert({
    title:       body.title,
    title_he:    body.title_he    || null,
    author:      body.author,
    description: body.description || null,
    category_id: body.category_id || null,
    price:       body.price       || null,
    sku:         body.sku         || null,
    publisher:   body.publisher   || null,
    year:        body.year        || null,
    language:    body.language    || "Hebrew",
    is_published:body.is_published ?? false,
    slug,
  }).select().single();

  if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 400 });

  // Insert inventory
  await sb.from("inventory").insert({
    book_id:  book.id,
    quantity: body.quantity ?? 1,
    in_stock: body.in_stock ?? true,
  });

  // Audit log
  await sb.from("change_logs").insert({
    entity_type: "book",
    entity_id:   book.id,
    action:      "create",
    changed_by:  user.id,
    payload:     { title: book.title },
  });

  return NextResponse.json(book, { status: 201 });
}
