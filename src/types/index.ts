// ─────────────────────────────────────────────────────────────────
// src/types/index.ts  — add Tag, BookTag, update BookFilters
// Replace the full file with this version.
// ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  name_he?: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

// ── NEW ──────────────────────────────────────────────────────────
export interface Tag {
  id: string;
  name: string;
  name_he?: string;
  slug: string;
  description?: string;
  created_at: string;
}

export interface BookTag {
  book_id: string;
  tag_id: string;
  created_at: string;
  tag?: Tag;
}
// ─────────────────────────────────────────────────────────────────

export interface BookImage {
  id: string;
  book_id: string;
  image_url: string;
  storage_path?: string;
  alt_text?: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface Inventory {
  id: string;
  book_id: string;
  quantity: number;
  in_stock: boolean;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  title_he?: string;
  author: string;
  description?: string;
  category_id?: string;
  price?: number;
  sku?: string;
  publisher?: string;
  year?: number;
  language?: string;
  is_published: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
  // joined relations
  category?: Category;
  inventory?: Inventory;
  images?: BookImage[];
  tags?: Tag[];          // ← NEW (optional, joined when needed)
}

export interface BookFormData {
  title: string;
  title_he?: string;
  author: string;
  description?: string;
  category_id?: string;
  price?: number;
  sku?: string;
  publisher?: string;
  year?: number;
  language?: string;
  is_published: boolean;
  quantity: number;
  in_stock: boolean;
}

export interface BookFilters {
  search?: string;
  category?: string;
  language?: string;
  in_stock?: boolean;
  tag?: string;          // ← NEW: tag slug
  sort?: "title" | "author" | "year" | "created_at";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
