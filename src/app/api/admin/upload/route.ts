import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET   = "book-images";
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED  = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  // Auth check
  const sb   = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file   = formData.get("file")   as File   | null;
  const bookId = formData.get("bookId") as string | null;
  const isCover= formData.get("isCover") === "true";

  if (!file || !bookId) {
    return NextResponse.json({ error: "file and bookId are required" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP allowed" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ext   = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path  = `books/${bookId}/${Date.now()}.${ext}`;

  // Upload to storage
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path);

  // If this is a cover, un-cover existing images first
  if (isCover) {
    await admin
      .from("book_images")
      .update({ is_cover: false })
      .eq("book_id", bookId);
  }

  // Insert image record
  const { data: image, error: dbErr } = await admin
    .from("book_images")
    .insert({
      book_id:      bookId,
      image_url:    publicUrl,
      storage_path: path,
      is_cover:     isCover,
      sort_order:   0,
      alt_text:     file.name.replace(/\.[^.]+$/, ""),
    })
    .select()
    .single();

  if (dbErr) {
    // Roll back storage upload
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: publicUrl, id: image.id }, { status: 201 });
}
