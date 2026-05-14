import { createClient } from "@/lib/supabase/server";

export interface Tag {
  id: string;
  name: string;
  name_he?: string;
  slug: string;
  description?: string;
  created_at: string;
}

/** All tags (for nav / filter UI) */
export async function getTags(): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data ?? []) as Tag[];
}

/** Single tag by slug */
export async function getTagBySlug(slug: string): Promise<Tag | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) return null;
  return data as Tag;
}

/** Number of published books with a given tag */
export async function countBooksByTag(tagId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("book_tags")
    .select("book_id", { count: "exact", head: true })
    .eq("tag_id", tagId);
  if (error) return 0;
  return count ?? 0;
}

/** Book IDs that have a given tag (paginated) */
export async function getBookIdsByTag(
  tagId: string,
  page = 1,
  limit = 48
): Promise<string[]> {
  const supabase = await createClient();
  const from = (page - 1) * limit;
  const { data, error } = await supabase
    .from("book_tags")
    .select("book_id")
    .eq("tag_id", tagId)
    .range(from, from + limit - 1);
  if (error) return [];
  return (data ?? []).map((r: any) => r.book_id);
}

/** Tags for a single book */
export async function getTagsForBook(bookId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("book_tags")
    .select("tag:tags(*)")
    .eq("book_id", bookId);
  if (error) return [];
  return (data ?? []).map((r: any) => r.tag).filter(Boolean) as Tag[];
}
