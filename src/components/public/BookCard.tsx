import Link from "next/link";
import BookCover from "@/components/public/BookCover";
import type { Book } from "@/types";
import { getBookCoverUrl, stockLabel } from "@/lib/utils";

const wa = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";

function WhatsAppIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export { WhatsAppIcon };

export default function BookCard({ book }: { book: Book }) {
  const cover = getBookCoverUrl(book);
  const stock = stockLabel(book);
  const showBadge = stock.text !== "במלאי";

  const waMsg = encodeURIComponent(
    `שלום, אני מתעניין/ת בספר: "${book.title_he ?? book.title}" (${book.author})`
  );

  return (
    <article className="group bg-surface border border-outline-variant hover:border-accent-gold/40 hover:shadow-book-hover transition-all duration-300 flex flex-col">

      {/* כריכה */}
      <Link
        href={`/catalog/${book.slug}`}
        className="block relative aspect-[3/4] bg-surface-low overflow-hidden flex-shrink-0"
      >
        <BookCover
          src={cover}
          alt={book.title_he ?? book.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors duration-300" />

        {showBadge && (
          <div className="absolute top-2 right-2">
            <span className={stock.cls}>{stock.text}</span>
          </div>
        )}
      </Link>

      {/* פרטים */}
      <div className="p-3.5 flex flex-col flex-1 border-t border-outline-variant">

        {book.category && (
          <span className="category-label mb-1.5 block">
            {book.category.name_he ?? book.category.name}
          </span>
        )}

        <Link href={`/catalog/${book.slug}`}>
          <h3 className="font-serif text-[15px] font-semibold leading-snug line-clamp-2 text-primary group-hover:text-accent-gold transition-colors min-h-[44px]">
            {book.title_he ?? book.title}
          </h3>
        </Link>

        <p className="text-xs text-on-surface-variant italic mt-1.5 line-clamp-1">
          {book.author}{book.year ? ` · ${book.year}` : ""}
        </p>

        {/* כפתורים */}
        <div className="mt-auto pt-3 border-t border-outline-variant flex gap-1.5 mt-3">
          <Link
            href={`/catalog/${book.slug}`}
            className="flex-1 text-center text-[10px] font-bold uppercase tracking-wider text-primary border border-outline-variant py-2 hover:border-accent-gold hover:text-accent-gold transition-colors"
          >
            פרטים
          </Link>
          <a
            href={`https://wa.me/${wa}?text=${waMsg}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-center text-[10px] font-bold uppercase tracking-wider bg-primary/90 text-white py-2 hover:bg-primary transition-colors flex items-center justify-center gap-1"
          >
            <WhatsAppIcon className="w-3 h-3" />
            בירור
          </a>
        </div>
      </div>
    </article>
  );
}
