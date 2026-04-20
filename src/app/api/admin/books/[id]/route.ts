import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BookFormData } from "@/types";

async function getUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body: Partial<BookFormData> = await req.json();
  const sb = createAdminClient();

  const { quantity, in_stock, ...bookFields } = body;

  // Update book fields
  const { error: bookErr } = await sb
    .from("books")
    .update({
      ...bookFields,
      category_id: bookFields.category_id || null,
      title_he:    bookFields.title_he    || null,
      description: bookFields.description || null,
      publisher:   bookFields.publisher   || null,
      price:       bookFields.price       || null,
      sku:         bookFields.sku         || null,
      year:        bookFields.year        || null,
      updated_at:  new Date().toISOString(),
    })
    .eq("id", id);

  if (bookErr) return NextResponse.json({ error: bookErr.message }, { status: 400 });

  // Update inventory if provided
  if (quantity !== undefined || in_stock !== undefined) {
    await sb
      .from("inventory")
      .update({
        ...(quantity  !== undefined && { quantity }),
        ...(in_stock  !== undefined && { in_stock }),
        updated_at: new Date().toISOString(),
      })
      .eq("book_id", id);
  }

  // Audit log
  await sb.from("change_logs").insert({
    entity_type: "book",
    entity_id:   id,
    action:      "update",
    changed_by:  user.id,
    payload:     bookFields as Record<string, unknown>,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const sb = createAdminClient();

  // Fetch storage paths to clean up images
  const { data: images } = await sb
    .from("book_images")
    .select("storage_path")
    .eq("book_id", id);

  const paths = (images ?? [])
    .map((i: { storage_path: string | null }) => i.storage_path)
    .filter(Boolean) as string[];

  if (paths.length > 0) {
    await sb.storage.from("book-images").remove(paths);
  }

  // Delete book (cascades to inventory + book_images)
  const { error } = await sb.from("books").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Audit log
  await sb.from("change_logs").insert({
    entity_type: "book",
    entity_id:   id,
    action:      "delete",
    changed_by:  user.id,
  });

  return NextResponse.json({ success: true });
}
