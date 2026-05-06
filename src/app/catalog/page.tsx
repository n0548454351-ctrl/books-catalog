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
  title: "קטלוג ספרים אקדמי ואספני",
  description:
    "אוסף רחב של ספרים בתחומי הלימודים הקלאסיים, היסטוריה, פילוסופיה, פילולוגיה, יהדות, שפות ומדעי הרוח. מיועד לחוקרים, סטודנטים, אספנים ומוסדות.",
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
    limit:    48,
  };

  const [result, categories] = await Promise.all([
    getPublishedBooks(filters),
    getCategories(),
  ]);

  const { data: books, total, totalPages, page } = result;
  const hasFilters = !!(sp.search || sp.category || sp.language || sp.in_stock);

  const activeCategoryName = sp.category
    ? (categories.find((c) => c.id === sp.category)?.name_he ?? "")
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

      <main className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 py-10" dir="rtl">

        {/* ── כותרת ── */}
        <section className="mb-8 border-b border-outline-variant pb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3">
            Academic &amp; Collectible Books
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
            <div>
              <h1 className="font-serif text-4xl font-bold text-primary mb-2">
                {activeCategoryName || "קטלוג הספרים"}
              </h1>
              <p className="text-on-surface-variant text-sm">
                {hasFilters
                  ? `${total.toLocaleString()} תוצאות נמצאו`
                  : `עיינו באוסף לפי תחומי מחקר מרכזיים ומצאו ספרים המתאימים למחקר, הוראה ואספנות · ${total.toLocaleString()} ספרים`}
              </p>
            </div>
            {hasFilters && (
              <a
                href="/catalog"
                className="text-xs font-bold text-accent-gold hover:underline flex items-center gap-1"
              >
                × נקה סינון
              </a>
            )}
          </div>
        </section>

        {/* ── CategoryExplorer ── */}
        <Suspense>
          <CategoryExplorer categories={categories} />
        </Suspense>

        {/* ── חיפוש ופילטרים ── */}
        <section className="mb-8 border border-outline-variant bg-surface p-5">
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
          <section className="text-center py-24 border border-outline-variant bg-surface">
            <p className="text-4xl mb-4 text-accent-gold/40">◈</p>
            <p className="font-serif text-xl font-semibold text-primary mb-2">לא נמצאו ספרים</p>
            <p className="text-sm text-on-surface-variant mb-6">
              מחפשים ספר מסוים? ניתן לפנות ישירות לגבי כל ספר בקטלוג.
            </p>
            <a href="/catalog" className="text-sm font-bold text-accent-gold hover:underline">
              הצג את כל הקטלוג
            </a>
          </section>
        ) : (
          <>
            <p className="text-xs text-on-surface-variant/60 mb-5">
              מציג {books.length.toLocaleString()} מתוך {total.toLocaleString()} ספרים
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </>
        )}

        {/* ── עימוד ── */}
        {totalPages > 1 && (
          <nav className="mt-14 flex justify-center gap-2 flex-wrap" aria-label="עמודים" dir="ltr">
            {page > 1 && (
              <a href={pageUrl(page - 1)}
                className="w-10 h-10 flex items-center justify-center border border-outline-variant bg-surface hover:border-accent-gold text-sm text-on-surface-variant transition-colors">
                ‹
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a key={p} href={pageUrl(p)} aria-current={p === page ? "page" : undefined}
                className={`w-10 h-10 flex items-center justify-center text-sm font-bold border transition-colors
                  ${p === page
                    ? "bg-primary text-white border-primary"
                    : "bg-surface border-outline-variant hover:border-accent-gold text-on-surface-variant"
                  }`}>
                {p}
              </a>
            ))}
            {page < totalPages && (
              <a href={pageUrl(page + 1)}
                className="w-10 h-10 flex items-center justify-center border border-outline-variant bg-surface hover:border-accent-gold text-sm text-on-surface-variant transition-colors">
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
