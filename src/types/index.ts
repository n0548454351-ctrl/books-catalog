// ─── Database row types ───────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  name_he?: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

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
}

// ─── API / form types ─────────────────────────────────────────────────────────

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
