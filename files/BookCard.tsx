import Link from "next/link";
import BookCover from "@/components/public/BookCover";
import type { Book } from "@/types";
import { getBookCoverUrl, stockLabel, formatPrice } from "@/lib/utils";

const wa = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";

export default function BookCard({ book }: { book: Book }) {
  const cover = getBookCoverUrl(book);
  const stock = stockLabel(book);
  const showBadge = stock.text !== "במלאי";
  const price = formatPrice(book.price);

  const waMsg = encodeURIComponent(
    `שלום, אני מתעניין/ת בספר: "${book.title_he ?? book.title}" (${book.author})`
  );

  return (
    <article className="h-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* כריכה */}
      <Link href={`/catalog/${book.slug}`} className="group block relative aspect-[3/4] bg-parchment-100 overflow-hidden flex-shrink-0">
        <BookCover
          src={cover}
          alt={book.title_he ?? book.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {showBadge && (
          <div className="absolute top-3 right-3">
            <span className={stock.cls}>{stock.text}</span>
          </div>
        )}

        {price && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-md backdrop-blur-sm">
              {price}
            </span>
          </div>
        )}
      </Link>

      {/* פרטים */}
      <div className="p-4 flex flex-col flex-1">
        {book.category && (
          <span className="text-[11px] text-burgundy-700 font-semibold uppercase tracking-[0.18em] mb-1.5">
            {book.category.name_he ?? book.category.name}
          </span>
        )}

        <Link href={`/catalog/${book.slug}`} className="group">
          <h3 className="font-serif text-[16px] font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-burgundy-800 transition-colors min-h-[48px]">
            {book.title_he ?? book.title}
          </h3>
        </Link>

        <p className="text-sm text-gray-500 mt-1.5 line-clamp-1">{book.author}</p>

        {/* שנה + שפה */}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
          {book.year && <span>{book.year}</span>}
          {book.year && book.language && <span>·</span>}
          {book.language && <span>{book.language}</span>}
        </div>

        {/* כפתורים */}
        <div className="mt-auto pt-3 flex gap-2">
          <Link
            href={`/catalog/${book.slug}`}
            className="flex-1 text-center text-xs font-medium text-burgundy-700 border border-burgundy-200 rounded-lg py-2 hover:bg-burgundy-50 transition-colors"
          >
            לפרטים
          </Link>
          <a
            href={`https://wa.me/${wa}?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-xs font-medium bg-green-600 text-white rounded-lg py-2 hover:bg-green-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            💬 פנייה
          </a>
        </div>
      </div>
    </article>
  );
}
