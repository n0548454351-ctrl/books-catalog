import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import BookCard from "@/components/public/BookCard";
import SearchBar from "@/components/public/SearchBar";
import FilterPanel from "@/components/public/FilterPanel";
import { getPublishedBooks } from "@/lib/db/books";
import { getCategories } from "@/lib/db/categories";
import type { BookFilters } from "@/types";

export const metadata: Metadata = { title: "קטלוג ספרים" };

interface Props {
  searchParams: Promise<{
    search?: string;
    category?: string;
    language?: string;
    in_stock?: string;
    sort?: string;
    page?: string;
  }>;
}

const LANGUAGES = ["Hebrew", "English", "French", "German", "Arabic", "Yiddish", "Latin"];

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;

  const filters: BookFilters = {
    search:   sp.search,
    category: sp.category,
    language: sp.language,
    in_stock: sp.in_stock === "true" ? true : undefined,
    sort:     (sp.sort as BookFilters["sort"]) ?? "created_at",
    order:    "desc",
    page:     sp.page ? Number(sp.page) : 1,
    limit:    24,
  };

  const [result, categories] = await Promise.all([
    getPublishedBooks(filters),
    getCategories(),
  ]);

  const { data: books, total, totalPages, page } = result;
  const hasFilters = !!(sp.search || sp.category || sp.language || sp.in_stock);

  // Build URL helper for pagination
  function pageUrl(p: number) {
    const next = new URLSearchParams();
    if (sp.search)   next.set("search",   sp.search);
    if (sp.category) next.set("category", sp.category);
    if (sp.language) next.set("language", sp.language);
    if (sp.in_stock) next.set("in_stock", sp.in_stock);
    if (sp.sort)     next.set("sort",     sp.sort);
    next.set("page", String(p));
    return `/catalog?${next.toString()}`;
  }

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Page header */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-burgundy-900 mb-1">
            קטלוג הספרים
          </h1>
          <p className="text-gray-400 text-sm">
            {hasFilters ? `${total} תוצאות` : `${total.toLocaleString()} ספרים באוסף`}
          </p>
        </div>

        {/* Search + filters */}
        <div className="mb-8 space-y-4">
          <Suspense>
            <SearchBar defaultValue={sp.search ?? ""} />
          </Suspense>
          <Suspense>
            <FilterPanel categories={categories} languages={LANGUAGES} />
          </Suspense>
        </div>

        {/* Clear filters */}
        {hasFilters && (
          <div className="mb-5">
            <a href="/catalog" className="text-sm text-burgundy-700 hover:underline">
              × נקה סינון
            </a>
          </div>
        )}

        {/* Grid */}
        {books.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-lg font-medium text-gray-500">לא נמצאו ספרים</p>
            <p className="text-sm mt-1">נסה לשנות את הסינון או את מילות החיפוש</p>
            <a href="/catalog" className="mt-4 inline-block text-burgundy-700 hover:underline text-sm">
              הצג את כל הספרים
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="mt-12 flex justify-center gap-2 flex-wrap" aria-label="עמודים">
            {page > 1 && (
              <a href={pageUrl(page - 1)} className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 hover:border-burgundy-400 text-sm text-gray-600">
                ›
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={pageUrl(p)}
                className={`w-9 h-9 flex items-center justify-center rounded text-sm font-medium border transition-colors
                  ${p === page
                    ? "bg-burgundy-900 text-white border-burgundy-900"
                    : "border-gray-200 hover:border-burgundy-400 text-gray-600"}`}
              >
                {p}
              </a>
            ))}
            {page < totalPages && (
              <a href={pageUrl(page + 1)} className="w-9 h-9 flex items-center justify-center rounded border border-gray-200 hover:border-burgundy-400 text-sm text-gray-600">
                ‹
              </a>
            )}
          </nav>
        )}
      </main>
      <Footer />
    </>
  );
}
