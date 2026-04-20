import Link from "next/link";
import { getAllBooksAdmin } from "@/lib/db/books";
import { getCategories } from "@/lib/db/categories";
import { getLowStockBooks } from "@/lib/db/inventory";

export default async function AdminDashboard() {
  const [{ total, data: recentBooks }, categories, lowStock] = await Promise.all([
    getAllBooksAdmin(undefined, 1, 5),
    getCategories(),
    getLowStockBooks(2),
  ]);

  const published = recentBooks.filter((b) => b.is_published).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold text-gray-800">לוח בקרה</h1>
        <Link href="/admin/books/new" className="btn-primary">
          ➕ ספר חדש
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "סה״כ ספרים",    value: total,              icon: "📚", href: "/admin/books" },
          { label: "קטגוריות",       value: categories.length,  icon: "🗂️", href: "/admin/categories" },
          { label: "מלאי נמוך",      value: lowStock.length,    icon: "⚠️", href: "/admin/inventory" },
          { label: "מפורסמים",       value: published,          icon: "✅", href: "/admin/books" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="bg-white rounded-lg shadow-sm p-5 border border-gray-100 hover:border-burgundy-200 transition-colors">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold text-burgundy-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
          <h2 className="font-semibold text-amber-800 mb-3 flex items-center gap-2 text-sm">
            ⚠️ ספרים עם מלאי נמוך (2 עותקים או פחות)
          </h2>
          <ul className="space-y-1.5">
            {lowStock.map((inv: any) => (
              <li key={inv.id} className="flex justify-between items-center text-sm">
                <Link href={`/admin/books/${inv.book?.id}`} className="text-amber-800 hover:underline">
                  {inv.book?.title_he ?? inv.book?.title}
                </Link>
                <span className="badge-low-stock">{inv.quantity} נותר</span>
              </li>
            ))}
          </ul>
          <Link href="/admin/inventory" className="text-xs text-amber-600 hover:underline mt-3 block">
            עבור לניהול מלאי →
          </Link>
        </div>
      )}

      {/* Recent books */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800 text-sm">ספרים אחרונים</h2>
          <Link href="/admin/books" className="text-xs text-burgundy-700 hover:underline">הצג הכל</Link>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-50">
            {recentBooks.map((book) => (
              <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-800">
                  {book.title_he ?? book.title}
                </td>
                <td className="px-5 py-3 text-gray-400 hidden sm:table-cell">{book.author}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    book.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {book.is_published ? "פורסם" : "טיוטה"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/admin/books/${book.id}`} className="text-burgundy-700 hover:underline text-xs">
                    עריכה
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
