import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const admin  = createAdminClient();

  // Fetch storage path before deleting row
  const { data: image } = await admin
    .from("book_images")
    .select("storage_path")
    .eq("id", id)
    .single();

  // Delete DB row
  const { error } = await admin.from("book_images").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Delete from storage if it was uploaded (not a legacy URL)
  if (image?.storage_path) {
    await admin.storage.from("book-images").remove([image.storage_path]);
  }

  return NextResponse.json({ success: true });
}
