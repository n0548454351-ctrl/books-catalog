import { Suspense } from "react";
import type { Metadata } from "next";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import BookCard from "@/components/public/BookCard";
import SearchBar from "@/components/public/SearchBar";
import FilterPanel from "@/components/public/FilterPanel";
import CategoryExplorer from "@/components/public/CategoryExplorer";
import { getPublishedBooks } from "@/lib/db/books";
import { getCategories } from "@/lib/db/categories";
import type { BookFilters } from "@/types";

export const metadata: Metadata = {
  title: "קטלוג ספרים אקדמיים ואספניים",
  description:
    "אוסף ייחודי של ספרים ללימודים קלאסיים, היסטוריה, פילוסופיה, פילולוגיה, יהדות ומדעי הרוח. מתאים לחוקרים, סטודנטים, אספנים ומוסדות.",
};

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
  "Hebrew", "English", "French", "German",
  "Arabic", "Yiddish", "Latin",
];

export default async function CatalogPage({ searchParams }: Props) {
  const sp = await searchParams;

  const filters: BookFilters = {
    search:   sp.search?.trim() || undefined,
    category: sp.category,
    language: sp.language,
    in_stock: sp.in_stock === "true" ? true : undefined,
    sort:     (sp.sort as BookFilters["sort"]) ?? "created_at",
    order:    "desc",
    page:     sp.page ? Number(sp.page) : 1,
    limit:    96,  // ← שונה מ-24
  };

  const [result, categories] = await Promise.all([
    getPublishedBooks(filters),
    getCategories(),
  ]);

  const { data: books, total, totalPages, page } = result;
  const hasFilters = !!(sp.search || sp.category || sp.language || sp.in_stock);

  // שם קטגוריה פעילה לתצוגה
  const activeCategoryName = sp.category
    ? categories.find((c) => c.id === sp.category)?.name_he ?? ""
    : "";

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" dir="rtl">

        {/* ── כותרת ── */}
        <section className="mb-6 rounded-2xl bg-white/80 border border-burgundy-100 shadow-sm px-6 py-6 sm:px-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-burgundy-600 uppercase mb-2">
            Academic &amp; Collectible Books
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-burgundy-900 mb-2">
            {activeCategoryName ? activeCategoryName : "קטלוג הספרים"}
          </h1>
          <p className="text-gray-500 text-sm mb-0">
            עיינו באוסף לפי תחומי עניין: לימודים קלאסיים, פילולוגיה, היסטוריה, פילוסופיה, יהדות ומדעי הרוח.
          </p>
          {hasFilters && (
            <a
              href="/catalog"
              className="inline-flex items-center gap-1 text-xs text-burgundy-600 hover:underline mt-3"
            >
              <span>×</span> נקה סינון
            </a>
          )}
        </section>

        {/* ── CategoryExplorer ── */}
        <Suspense>
          <CategoryExplorer categories={categories} />
        </Suspense>

        {/* ── חיפוש ופילטרים ── */}
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

        {/* ── ריק ── */}
        {books.length === 0 ? (
          <section className="text-center py-24 rounded-2xl bg-white border border-gray-100 shadow-sm">
            <p className="text-5xl mb-4">📚</p>
            <p className="text-lg font-medium text-gray-500">לא נמצאו ספרים</p>
            <p className="text-sm text-gray-400 mt-1">נסה לשנות את הפילטרים או את מילות החיפוש</p>
            <a href="/catalog" className="mt-4 inline-block text-burgundy-700 hover:underline text-sm font-medium">
              הצג את כל הקטלוג
            </a>
          </section>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              מציג {books.length.toLocaleString()} מתוך {total.toLocaleString()} ספרים
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}

        {/* ── עימוד ── */}
        {totalPages > 1 && (
          <nav className="mt-12 flex justify-center gap-2 flex-wrap" aria-label="עמודים" dir="ltr">
            {page > 1 && (
              <a href={pageUrl(page - 1)} aria-label="עמוד קודם"
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-burgundy-400 text-sm text-gray-600 shadow-sm">
                ‹
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a key={p} href={pageUrl(p)} aria-current={p === page ? "page" : undefined}
                className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-medium border transition-colors shadow-sm
                  ${p === page
                    ? "bg-burgundy-900 text-white border-burgundy-900"
                    : "bg-white border-gray-200 hover:border-burgundy-400 text-gray-600"
                  }`}>
                {p}
              </a>
            ))}
            {page < totalPages && (
              <a href={pageUrl(page + 1)} aria-label="עמוד הבא"
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-burgundy-400 text-sm text-gray-600 shadow-sm">
                ›
              </a>
            )}
          </nav>
        )}
      </main>

      <Footer />
    </>
  );
}
