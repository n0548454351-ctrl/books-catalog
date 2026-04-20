import Link from "next/link";
import Image from "next/image";
import { getAllBooksAdmin } from "@/lib/db/books";
import { getBookCoverUrl } from "@/lib/utils";

interface Props {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function AdminBooksPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Number(sp.page ?? 1);
  const { data: books, total, totalPages } = await getAllBooksAdmin(sp.search, page, 30);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-gray-800">
          ספרים
          <span className="text-sm font-normal text-gray-400 mr-2">({total})</span>
        </h1>
        <Link href="/admin/books/new" className="btn-primary">➕ ספר חדש</Link>
      </div>

      {/* Search */}
      <form method="GET" className="mb-6 flex gap-2">
        <input
          name="search"
          defaultValue={sp.search}
          placeholder="חיפוש לפי כותרת, מחבר..."
          className="input max-w-xs"
        />
        <button type="submit" className="btn-primary">חפש</button>
        {sp.search && (
          <a href="/admin/books" className="btn-ghost">נקה</a>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">ספר</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">מחבר</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">קטגוריה</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">מלאי</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">סטטוס</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {books.map((book) => {
              const cover = getBookCoverUrl(book);
              return (
                <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                  {/* Title + cover */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-8 h-10 rounded overflow-hidden bg-parchment-100 shrink-0 border border-gray-100">
                        <Image
                          src={cover}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="32px"
                          unoptimized={cover.includes("drive.google.com") || cover.includes("googleusercontent.com")}
                        />
                      </div>
                      <span className="font-medium text-gray-800 line-clamp-1 max-w-[180px]">
                        {book.title_he ?? book.title}
                      </span>
                    </div>
                  </td>
                  {/* Author */}
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {book.author}
                  </td>
                  {/* Category */}
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {book.category?.name_he ?? book.category?.name ?? "—"}
                  </td>
                  {/* Inventory */}
                  <td className="px-4 py-3">
                    {book.inventory?.in_stock
                      ? <span className="badge-in-stock">{book.inventory.quantity}</span>
                      : <span className="badge-out-stock">אזל</span>}
                  </td>
                  {/* Published */}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      book.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {book.is_published ? "פורסם" : "טיוטה"}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2 items-center">
                      <Link href={`/admin/books/${book.id}`} className="text-burgundy-700 hover:underline text-xs">
                        עריכה
                      </Link>
                      {book.is_published && (
                        <Link
                          href={`/catalog/${book.slug}`}
                          target="_blank"
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          צפה
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {books.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm">לא נמצאו ספרים</p>
            {sp.search && (
              <a href="/admin/books" className="text-burgundy-700 hover:underline text-sm mt-2 block">
                הצג את כל הספרים
              </a>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-6 flex gap-2 justify-center">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/admin/books?${sp.search ? `search=${sp.search}&` : ""}page=${p}`}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium border transition-colors
                ${p === page
                  ? "bg-burgundy-900 text-white border-burgundy-900"
                  : "border-gray-200 text-gray-600 hover:border-burgundy-300"}`}
            >
              {p}
            </a>
          ))}
        </nav>
      )}
    </div>
  );
}
