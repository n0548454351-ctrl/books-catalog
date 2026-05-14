import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import BookCard from "@/components/public/BookCard";
import { getTagBySlug, countBooksByTag } from "@/lib/db/tags";
import { getPublishedBooks } from "@/lib/db/books";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: "תחום לא נמצא" };
  return {
    title: `${tag.name_he ?? tag.name} — קטלוג ספרים אקדמי`,
    description: tag.description,
  };
}

// ── Static philology page content ─────────────────────────────────
const TAG_CONTENT: Record<string, { intro: string; subfields: string[] }> = {
  philology: {
    intro: `פילולוגיה היא המדע של חקר הטקסטים — ביקורת הנוסח, פרשנות, שפות עתיקות וקדומות.
האוסף כולל ספרים בפילולוגיה קלאסית, פילולוגיה שמית, ביקורת הנוסח המקראי, לשון עברית ואמרית,
יוונית ולטינית, כתבי יד, פפירולוגיה, אפיגרפיה ולקסיקוגרפיה.`,
    subfields: [
      "ביקורת נוסח מקראית",
      "פילולוגיה יוונית ולטינית",
      "שפות שמיות — עברית, ארמית, סורית",
      "כתבי יד וקודיקולוגיה",
      "פפירולוגיה ואפיגרפיה",
      "לקסיקוגרפיה ודקדוק",
      "לימודים קלאסיים",
    ],
  },
};

export default async function TagPage({ params, searchParams }: Props) {
  const { slug }   = await params;
  const sp         = await searchParams;
  const page       = sp.page ? Number(sp.page) : 1;

  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const [result, totalCount] = await Promise.all([
    getPublishedBooks({ tag: slug, page, limit: 48, sort: "created_at", order: "desc" }),
    countBooksByTag(tag.id),
  ]);

  const { data: books, totalPages } = result;
  const content = TAG_CONTENT[slug];

  function pageUrl(p: number) {
    return `/catalog/tag/${slug}?page=${p}`;
  }

  return (
    <>
      <Header />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 py-10" dir="rtl">

        {/* ── Breadcrumb ── */}
        <nav className="breadcrumb mb-8">
          <Link href="/" className="hover:text-primary">בית</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-primary">קטלוג</Link>
          <span>/</span>
          <span className="crumb-active">{tag.name_he ?? tag.name}</span>
        </nav>

        {/* ── Hero section ── */}
        <section className="mb-12 border-b border-outline-variant pb-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-4">
            תחום מחקר
          </p>
          <h1 className="font-serif text-5xl font-bold text-primary mb-4">
            {tag.name_he ?? tag.name}
          </h1>
          <div className="h-0.5 w-16 bg-accent-gold mb-6" />

          {content && (
            <p className="text-on-surface-variant leading-relaxed max-w-2xl text-sm md:text-base mb-6 whitespace-pre-line">
              {content.intro}
            </p>
          )}

          <p className="text-sm text-on-surface-variant/60">
            {totalCount.toLocaleString()} ספרים באוסף
          </p>

          {/* Subfields */}
          {content?.subfields && (
            <div className="mt-6 flex flex-wrap gap-2">
              {content.subfields.map(sf => (
                <span
                  key={sf}
                  className="px-3 py-1 text-xs font-medium border border-accent-gold/30 text-accent-gold bg-accent-gold/5"
                >
                  {sf}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ── Books grid ── */}
        {books.length === 0 ? (
          <section className="text-center py-24 border border-outline-variant bg-surface">
            <p className="text-4xl mb-4 text-accent-gold/40">◈</p>
            <p className="font-serif text-xl font-semibold text-primary mb-2">
              אין ספרים בתחום זה עדיין
            </p>
            <Link href="/catalog" className="text-sm font-bold text-accent-gold hover:underline">
              לכל הקטלוג
            </Link>
          </section>
        ) : (
          <>
            <p className="text-xs text-on-surface-variant/60 mb-6">
              מציג {books.length.toLocaleString()} מתוך {totalCount.toLocaleString()} ספרים
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
          <nav className="mt-14 flex justify-center gap-2 flex-wrap" dir="ltr">
            {page > 1 && (
              <a href={pageUrl(page - 1)}
                className="w-10 h-10 flex items-center justify-center border border-outline-variant bg-surface hover:border-accent-gold text-sm text-on-surface-variant transition-colors">
                ‹
              </a>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a key={p} href={pageUrl(p)}
                className={`w-10 h-10 flex items-center justify-center text-sm font-bold border transition-colors
                  ${p === page ? "bg-primary text-white border-primary"
                    : "bg-surface border-outline-variant hover:border-accent-gold text-on-surface-variant"}`}>
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

        {/* ── Back to catalog ── */}
        <div className="mt-16 pt-8 border-t border-outline-variant text-center">
          <Link
            href="/catalog"
            className="text-sm font-bold text-accent-gold border-b border-accent-gold/40 pb-1 hover:border-accent-gold transition-all"
          >
            ← לכל הקטלוג
          </Link>
        </div>
      </main>

      <Footer />
    </>
  );
}
