import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BookCover from "@/components/public/BookCover";
import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import BookCard from "@/components/public/BookCard";
import { getBookBySlug, getRelatedBooks } from "@/lib/db/books";
import { getBookCoverUrl, stockLabel } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
}

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) return { title: "ספר לא נמצא" };
  return {
    title: book.title_he ?? book.title,
    description: book.description?.slice(0, 160),
    openGraph: {
      title: book.title_he ?? book.title,
      description: book.description?.slice(0, 160),
      images: [getBookCoverUrl(book)],
    },
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;
  const book = await getBookBySlug(slug);
  if (!book) notFound();

  const related = await getRelatedBooks(book);
  const cover   = getBookCoverUrl(book);
  const stock   = stockLabel(book);

  const wa    = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const waMsg = encodeURIComponent(
    `שלום, אני מתעניין/ת בספר: "${book.title_he ?? book.title}" (${book.author}). אשמח לפרטים נוספים.`
  );

  return (
    <>
      <Header />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 py-10" dir="rtl">

        {/* פירורי לחם */}
        <nav className="breadcrumb mb-10">
          <Link href="/" className="hover:text-primary transition-colors">בית</Link>
          <span className="text-outline-variant">/</span>
          <Link href="/catalog" className="hover:text-primary transition-colors">קטלוג</Link>
          {book.category && (
            <>
              <span className="text-outline-variant">/</span>
              <Link
                href={`/catalog?category=${book.category.id}`}
                className="crumb-active"
              >
                {book.category.name_he ?? book.category.name}
              </Link>
            </>
          )}
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface truncate max-w-[180px]">
            {book.title_he ?? book.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

          {/* תמונה — object-contain לתמונות לרוחב */}
          <div className="flex justify-center md:justify-start">
            <div className="relative bg-surface-low border border-outline-variant w-full max-w-md min-h-[420px] flex items-center justify-center overflow-hidden">
              <BookCover
                src={cover}
                alt={book.title_he ?? book.title}
                fill
                className="object-contain p-4"
              />
            </div>
          </div>

          {/* פרטים */}
          <div className="flex flex-col">

            {book.category && (
              <Link
                href={`/catalog?category=${book.category.id}`}
                className="category-label mb-4 hover:underline"
              >
                {book.category.name_he ?? book.category.name}
              </Link>
            )}

            <h1 className="font-serif text-3xl md:text-4xl font-bold text-primary leading-tight mb-2">
              {book.title_he ?? book.title}
            </h1>

            {book.title_he && book.title_he !== book.title && (
              <p className="text-on-surface-variant text-sm italic mb-3">{book.title}</p>
            )}

            <p className="text-lg text-on-surface-variant font-medium mb-5 italic font-serif">
              {book.author}
            </p>

            {/* זמינות */}
            <div className="mb-6">
              <span className={`${stock.cls} text-sm px-3 py-1`}>{stock.text}</span>
            </div>

            {/* קו זהב */}
            <div className="h-px bg-accent-gold/20 mb-6" />

            {/* טבלת פרטים */}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm mb-6">
              {book.publisher && (
                <>
                  <dt className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">הוצאה לאור</dt>
                  <dd className="font-medium text-on-surface">{book.publisher}</dd>
                </>
              )}
              {book.year && (
                <>
                  <dt className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">שנת הוצאה</dt>
                  <dd className="font-medium text-on-surface">{book.year}</dd>
                </>
              )}
              {book.language && (
                <>
                  <dt className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">שפה</dt>
                  <dd className="font-medium text-on-surface">{book.language}</dd>
                </>
              )}
              {book.inventory?.quantity != null && (
                <>
                  <dt className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">עותקים</dt>
                  <dd className="font-medium text-on-surface">{book.inventory.quantity}</dd>
                </>
              )}
            </dl>

            {book.description && (
              <p className="text-on-surface-variant text-sm leading-relaxed mb-8 whitespace-pre-line">
                {book.description}
              </p>
            )}

            {/* כפתורי פנייה */}
            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <a
                href={`https://wa.me/${wa}?text=${waMsg}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary justify-center text-center gap-2"
              >
                <WhatsAppIcon className="w-4 h-4" />
                בירור לגבי הספר
              </a>
              <a href="/#contact" className="btn-ghost justify-center text-center">
                📧 טופס יצירת קשר
              </a>
            </div>

            <p className="text-xs text-on-surface-variant/50 mt-4">
              ניתן לברר זמינות, פרטים ותיאום משלוח לכל העולם
            </p>
          </div>
        </div>

        {/* ספרים קשורים */}
        {related.length > 0 && (
          <section className="mt-20 pt-12 border-t border-outline-variant">
            <div className="flex justify-between items-end mb-8">
              <h2 className="font-serif text-2xl font-bold text-primary">
                ספרים נוספים בתחום
              </h2>
              {book.category && (
                <Link
                  href={`/catalog?category=${book.category.id}`}
                  className="text-sm font-bold text-accent-gold border-b border-accent-gold/40 pb-1 hover:border-accent-gold transition-all"
                >
                  כל הספרים בתחום ←
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {related.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
