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

const LANGUAGES = [
  "Hebrew",
  "English",
  "French",
  "German",
  "Arabic",
  "Yiddish",
  "Latin",
];

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;

  const filters: BookFilters = {
    search: sp.search?.trim() || undefined,
    category: sp.category,
    language: sp.language,
    in_stock: sp.in_stock === "true" ? true : undefined,
    sort: (sp.sort as BookFilters["sort"]) ?? "created_at",
    order: "desc",
    page: sp.page ? Number(sp.page) : 1,
    limit: 24,
  };

  const [result, categories] = await Promise.all([
    getPublishedBooks(filters),
    getCategories(),
  ]);

  const { data: books, total, totalPages, page } = result;
  const hasFilters = !!(sp.search || sp.category || sp.language || sp.in_stock);

  function pageUrl(p: number) {
    const next = new URLSearchParams();
    if (sp.search) next.set("search", sp.search);
    if (sp.category) next.set("category", sp.category);
    if (sp.language) next.set("language", sp.language);
    if (sp.in_stock) next.set("in_stock", sp.in_stock);
    if (sp.sort) next.set("sort", sp.sort);
    next.set("page", String(p));
    return `/catalog?${next.toString()}`;
  }

  return (
    <>
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <section className="mb-8 rounded-2xl bg-white/70 border border-burgundy-100 shadow-sm px-5 py-6 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.22em] text-burgundy-700 uppercase mb-2">
                Academic Books Collection
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-burgundy-900 mb-2">
                קטלוג הספרים
              </h1>
              <p className="text-gray-500 text-sm">
                {hasFilters
                  ? `${total.toLocaleString()} תוצאות נמצאו`
                  : `${total.toLocaleString()} ספרים באוסף`}
              </p>
            </div>

            {hasFilters && (
              <div>
                <a
                  href="/catalog"
                  className="inline-flex items-center gap-2 text-sm text-burgundy-700 hover:text-burgundy-900 hover:underline"
                >
                  <span>×</span>
                  <span>נקה סינון</span>
                </a>
              </div>
            )}
          </div>
        </section>

        <section className="mb-8 rounded-2xl bg-white border border-gray-100 shadow-sm p-4 sm:p-5">
          <div className="space-y-4">
            <Suspense>
              <SearchBar defaultValue={sp.search ?? ""} />
            </Suspense>

            <Suspense>
              <FilterPanel categories={categories} languages={LANGUAGES} />
            </Suspense>
          </div>
        </section>

        {books.length === 0 ? (
          <section className="text-center py-24 text-gray-400 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-lg font-medium text-gray-500">לא נמצאו ספרים</p>
            <p className="text-sm mt-1">נסה לשנות את הסינון או את מילות החיפוש</p>
            <a
              href="/catalog"
              className="mt-4 inline-block text-burgundy-700 hover:underline text-sm"
            >
              הצג את כל הספרים
            </a>
          </section>
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                מציג {books.length.toLocaleString()} מתוך {total.toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 lg:gap-6">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <nav
            className="mt-12 flex justify-center gap-2 flex-wrap"
            aria-label="עמודים"
          >
            {page > 1 && (
              <a
                href={pageUrl(page - 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-burgundy-400 text-sm text-gray-600 shadow-sm"
              >
                ›
              </a>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={pageUrl(p)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium border transition-colors shadow-sm
                  ${
                    p === page
                      ? "bg-burgundy-900 text-white border-burgundy-900"
                      : "bg-white border-gray-200 hover:border-burgundy-400 text-gray-600"
                  }`}
              >
                {p}
              </a>
            ))}

            {page < totalPages && (
              <a
                href={pageUrl(page + 1)}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-burgundy-400 text-sm text-gray-600 shadow-sm"
              >
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