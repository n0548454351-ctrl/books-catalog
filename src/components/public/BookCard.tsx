import Link from "next/link";
import BookCover from "@/components/public/BookCover";
import type { Book } from "@/types";
import { getBookCoverUrl, stockLabel } from "@/lib/utils";

const wa = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";

export default function BookCard({ book }: { book: Book }) {
  const cover = getBookCoverUrl(book);
  const stock = stockLabel(book);
  const showBadge = stock.text !== "במלאי";

  const waMsg = encodeURIComponent(
    `שלום, אני מתעניין/ת בספר: "${book.title_he ?? book.title}" (${book.author})`
  );

  return (
    <article className="group bg-surface border border-outline-variant hover:border-[rgba(184,134,11,0.5)] hover:shadow-book-hover transition-all duration-300 flex flex-col">

      {/* כריכה */}
      <Link
        href={`/catalog/${book.slug}`}
        className="block relative aspect-[3/4] bg-surface-low overflow-hidden flex-shrink-0 border-b border-outline-variant"
      >
        <BookCover
          src={cover}
          alt={book.title_he ?? book.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors duration-300" />

        {showBadge && (
          <div className="absolute top-2.5 right-2.5">
            <span className={stock.cls}>{stock.text}</span>
          </div>
        )}
      </Link>

      {/* פרטים */}
      <div className="p-4 flex flex-col flex-1">

        {/* קטגוריה */}
        {book.category && (
          <span className="category-label mb-2 block">
            {book.category.name_he ?? book.category.name}
          </span>
        )}

        {/* כותרת */}
        <Link href={`/catalog/${book.slug}`}>
          <h3 className="font-serif text-[17px] font-semibold leading-snug line-clamp-2 text-primary group-hover:text-accent-gold transition-colors min-h-[48px]">
            {book.title_he ?? book.title}
          </h3>
        </Link>

        {/* מחבר + שנה */}
        <p className="text-sm text-on-surface-variant italic mt-2 line-clamp-1">
          {book.author}{book.year ? ` · ${book.year}` : ""}
        </p>

        {/* שפה */}
        {book.language && (
          <p className="text-xs text-on-surface-variant/60 mt-1">{book.language}</p>
        )}

        {/* כפתורים */}
        <div className="mt-auto pt-3 border-t border-outline-variant flex gap-2">
          <Link
            href={`/catalog/${book.slug}`}
            className="flex-1 text-center text-[11px] font-bold uppercase tracking-widest text-primary border border-outline-variant py-2 hover:border-accent-gold hover:text-accent-gold transition-colors"
          >
            פרטים
          </Link>
          <a
            href={`https://wa.me/${wa}?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-[11px] font-bold uppercase tracking-widest bg-primary text-white py-2 hover:bg-primary/90 transition-colors"
          >
            💬 פנייה
          </a>
        </div>
      </div>
    </article>
  );
}
