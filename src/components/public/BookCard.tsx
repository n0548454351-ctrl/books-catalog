import Link from "next/link";
import BookCover from "@/components/public/BookCover";
import type { Book } from "@/types";
import { getBookCoverUrl, stockLabel } from "@/lib/utils";

export default function BookCard({ book }: { book: Book }) {
  const cover = getBookCoverUrl(book);
  const stock = stockLabel(book);
  const showBadge = stock.text !== "במלאי";

  return (
    <Link href={`/catalog/${book.slug}`} className="group block h-full">
      <article className="h-full overflow-hidden rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="relative aspect-[3/4] bg-parchment-100 overflow-hidden">
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
        </div>

        <div className="p-4 flex flex-col h-[160px]">
          {book.category && (
            <span className="text-[11px] text-burgundy-700 font-semibold uppercase tracking-[0.18em] mb-2">
              {book.category.name_he ?? book.category.name}
            </span>
          )}

          <h3 className="font-serif text-[17px] font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-burgundy-800 transition-colors min-h-[52px]">
            {book.title_he ?? book.title}
          </h3>

          <p className="text-sm text-gray-500 mt-2 line-clamp-1">
            {book.author}
          </p>

          <div className="mt-auto pt-3 flex items-center justify-between text-xs text-gray-400">
            <span>{book.year ? book.year : "ללא שנה"}</span>
            <span className="text-burgundy-700 font-medium group-hover:underline">
              לצפייה
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}