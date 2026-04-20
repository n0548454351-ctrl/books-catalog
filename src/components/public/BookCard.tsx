import Link from "next/link";
import BookCover from "@/components/public/BookCover";
import type { Book } from "@/types";
import { getBookCoverUrl, stockLabel } from "@/lib/utils";

export default function BookCard({ book }: { book: Book }) {
  const cover = getBookCoverUrl(book);
  const stock = stockLabel(book);
  const showBadge = stock.text !== "במלאי";

  return (
    <Link href={`/catalog/${book.slug}`} className="group block">
      <article className="card flex flex-col h-full">
        {/* Cover */}
        <div className="relative aspect-[3/4] bg-parchment-100 overflow-hidden">
          <BookCover
            src={cover}
            alt={book.title_he ?? book.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {showBadge && (
            <div className="absolute top-2 right-2">
              <span className={stock.cls}>{stock.text}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3 flex flex-col flex-1 gap-1">
          {book.category && (
            <span className="text-xs text-burgundy-700 font-semibold uppercase tracking-wide">
              {book.category.name_he ?? book.category.name}
            </span>
          )}
          <h3 className="font-serif text-sm font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
            {book.title_he ?? book.title}
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            {book.author}
            {book.year ? ` · ${book.year}` : ""}
          </p>
        </div>
      </article>
    </Link>
  );
}
