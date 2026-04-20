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
  const cover = getBookCoverUrl(book);
  const stock = stockLabel(book);

  const wa = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const waMsg = encodeURIComponent(
    `שלום, אני מעוניין/ת בספר: "${book.title_he ?? book.title}" (${book.author})`
  );

  return (
    <>
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav className="text-sm text-gray-400 mb-8 flex gap-2 items-center flex-wrap">
          <Link href="/" className="hover:text-burgundy-700 transition-colors">
            בית
          </Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-burgundy-700 transition-colors">
            קטלוג
          </Link>

          {book.category && (
            <>
              <span>/</span>
              <Link
                href={`/catalog?category=${book.category.id}`}
                className="hover:text-burgundy-700 transition-colors"
              >
                {book.category.name_he ?? book.category.name}
              </Link>
            </>
          )}

          <span>/</span>
          <span className="text-gray-600 truncate max-w-[200px]">
            {book.title_he ?? book.title}
          </span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          <div className="flex justify-center md:justify-start">
            <div className="relative aspect-[3/4] bg-parchment-100 rounded shadow-book w-full max-w-xs">
              <BookCover
                src={cover}
                alt={book.title_he ?? book.title}
                fill
                className="object-cover rounded"
              />
            </div>
          </div>

          <div>
            {book.category && (
              <Link
                href={`/catalog?category=${book.category.id}`}
                className="inline-block text-xs uppercase tracking-widest text-burgundy-700 font-semibold mb-3 hover:underline"
              >
                {book.category.name_he ?? book.category.name}
              </Link>
            )}

            <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-2">
              {book.title_he ?? book.title}
            </h1>

            {book.title_he && book.title_he !== book.title && (
              <p className="text-gray-400 text-sm italic mb-3">{book.title}</p>
            )}

            <p className="text-lg text-gray-600 font-medium mb-5">{book.author}</p>

            <div className="mb-6">
              <span className={`${stock.cls} text-sm px-3 py-1`}>{stock.text}</span>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-b border-gray-100 py-5 mb-6">
              {book.publisher && (
                <>
                  <dt className="text-gray-400">הוצאה לאור</dt>
                  <dd className="font-medium text-gray-800">{book.publisher}</dd>
                </>
              )}

              {book.year && (
                <>
                  <dt className="text-gray-400">שנת הוצאה</dt>
                  <dd className="font-medium text-gray-800">{book.year}</dd>
                </>
              )}

              {book.language && (
                <>
                  <dt className="text-gray-400">שפה</dt>
                  <dd className="font-medium text-gray-800">{book.language}</dd>
                </>
              )}

              {book.inventory?.quantity != null && (
                <>
                  <dt className="text-gray-400">עותקים</dt>
                  <dd className="font-medium text-gray-800">
                    {book.inventory.quantity}
                  </dd>
                </>
              )}
            </dl>

            {book.description && (
              <p className="text-gray-700 text-sm leading-relaxed mb-8 whitespace-pre-line">
                {book.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={`https://wa.me/${wa}?text=${waMsg}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary justify-center text-center"
              >
                💬 שאל/י על ספר זה בוואטסאפ
              </a>

              <a href="/#contact" className="btn-ghost justify-center text-center">
                📧 שלח/י הודעה
              </a>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              נבדוק עבורך את הזמינות ונחזור אליך בהקדם
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 pt-10 border-t border-gray-100">
            <h2 className="font-serif text-2xl font-bold text-burgundy-900 mb-6">
              ספרים נוספים בנושא
            </h2>

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