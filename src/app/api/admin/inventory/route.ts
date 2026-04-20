import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getUser() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { book_id, quantity, in_stock } = await req.json();
  if (!book_id) return NextResponse.json({ error: "book_id required" }, { status: 400 });

  const sb = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (quantity  !== undefined) patch.quantity  = quantity;
  if (in_stock  !== undefined) patch.in_stock  = in_stock;

  const { error } = await sb.from("inventory").update(patch).eq("book_id", book_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
