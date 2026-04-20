import { notFound } from "next/navigation";
import Link from "next/link";
import BookForm from "@/components/admin/BookForm";
import { getBookByIdAdmin } from "@/lib/db/books";
import { getCategories } from "@/lib/db/categories";

interface Props { params: Promise<{ id: string }> }

export default async function EditBookPage({ params }: Props) {
  const { id } = await params;
  const [book, categories] = await Promise.all([
    getBookByIdAdmin(id),
    getCategories(),
  ]);
  if (!book) notFound();

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-gray-800">עריכת ספר</h1>
          <p className="text-sm text-gray-400 mt-0.5">{book.title_he ?? book.title}</p>
        </div>
        <div className="flex gap-2 items-center">
          {book.is_published && (
            <Link
              href={`/catalog/${book.slug}`}
              target="_blank"
              className="text-sm text-burgundy-700 hover:underline"
            >
              ← צפה בדף הציבורי
            </Link>
          )}
          <Link href="/admin/books" className="text-sm text-gray-400 hover:text-gray-600">
            → כל הספרים
          </Link>
        </div>
      </div>

      {/* Meta info */}
      <div className="bg-gray-50 rounded px-4 py-2 mb-6 text-xs text-gray-400 flex gap-4">
        <span>נוצר: {new Date(book.created_at).toLocaleDateString("he-IL")}</span>
        <span>עודכן: {new Date(book.updated_at).toLocaleDateString("he-IL")}</span>
        {book.slug && <span>slug: {book.slug}</span>}
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <BookForm book={book} categories={categories} mode="edit" />
      </div>
    </div>
  );
}
