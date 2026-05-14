// ─────────────────────────────────────────────────────────────────
// PATCH for src/lib/db/books.ts
//
// Add this to the existing getPublishedBooks function.
// Find the section that builds the query and add tag filter support.
//
// CHANGES ONLY — do not replace the whole file.
// ─────────────────────────────────────────────────────────────────
//
// 1. In BookFilters type (src/types/index.ts), add:
//      tag?: string;   // tag slug
//
// 2. In getPublishedBooks, after the existing filters, add:
//
//   if (filters.tag) {
//     // Get tag id from slug, then filter books by book_tags
//     const { data: tagRow } = await supabase
//       .from("tags")
//       .select("id")
//       .eq("slug", filters.tag)
//       .single();
//
//     if (tagRow) {
//       const { data: bookTagRows } = await supabase
//         .from("book_tags")
//         .select("book_id")
//         .eq("tag_id", tagRow.id);
//
//       const bookIds = (bookTagRows ?? []).map((r: any) => r.book_id);
//       if (bookIds.length > 0) {
//         query = query.in("id", bookIds);
//       } else {
//         // Tag exists but no books — return empty
//         return { data: [], total: 0, page: 1, totalPages: 0 };
//       }
//     }
//   }
//
// ─────────────────────────────────────────────────────────────────
// FULL updated getPublishedBooks with tag support:
// ─────────────────────────────────────────────────────────────────

import { createClient } from "@/lib/supabase/server";
import type { Book, BookFilters, PaginatedResult } from "@/types";

const BOOK_SELECT = `
  *,
  category:categories(*),
  inventory:inventory(*),
  images:book_images(*)
`;

export async function getPublishedBooks(
  filters: BookFilters = {}
): Promise<PaginatedResult<Book>> {
  const supabase = await createClient();
  const {
    search, category, language, in_stock, tag,
    sort = "created_at", order = "desc",
    page = 1, limit = 48,
  } = filters;

  // ── Tag filter: resolve tag slug → book ids ──────────────────
  let tagBookIds: string[] | null = null;

  if (tag) {
    const { data: tagRow } = await supabase
      .from("tags")
      .select("id")
      .eq("slug", tag)
      .single();

    if (tagRow) {
      const { data: bookTagRows } = await supabase
        .from("book_tags")
        .select("book_id")
        .eq("tag_id", tagRow.id);

      tagBookIds = (bookTagRows ?? []).map((r: any) => r.book_id);

      if (tagBookIds.length === 0) {
        return { data: [], total: 0, page: 1, totalPages: 0 };
      }
    }
  }

  // ── Main query ───────────────────────────────────────────────
  let query = supabase
    .from("books")
    .select(BOOK_SELECT, { count: "exact" })
    .eq("is_published", true);

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,author.ilike.%${search}%,title_he.ilike.%${search}%`
    );
  }
  if (category)     query = query.eq("category_id", category);
  if (language)     query = query.eq("language", language);
  if (tagBookIds)   query = query.in("id", tagBookIds);

  const safe = ["title", "author", "year", "created_at"].includes(sort) ? sort : "created_at";
  query = query.order(safe, { ascending: order === "asc" });

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  let books = (data ?? []) as Book[];
  if (in_stock !== undefined) {
    books = books.filter((b) => b.inventory?.in_stock === in_stock);
  }

  return {
    data: books,
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) return null;
  return data as Book;
}

export async function getRelatedBooks(book: Book, limit = 4): Promise<Book[]> {
  if (!book.category_id) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("is_published", true)
    .eq("category_id", book.category_id)
    .neq("id", book.id)
    .limit(limit);
  return (data ?? []) as Book[];
}

export async function getAllBooksAdmin(
  search?: string, page = 1, limit = 30
): Promise<PaginatedResult<Book>> {
  const supabase = await createClient();
  let query = supabase
    .from("books")
    .select(BOOK_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%,title_he.ilike.%${search}%`);
  }

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    data: (data ?? []) as Book[],
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / limit),
  };
}

export async function getBookByIdAdmin(id: string): Promise<Book | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("books")
    .select(BOOK_SELECT)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Book;
}
