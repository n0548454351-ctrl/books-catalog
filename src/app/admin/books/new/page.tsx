import BookForm from "@/components/admin/BookForm";
import { getCategories } from "@/lib/db/categories";

export default async function NewBookPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-gray-800 mb-6">➕ ספר חדש</h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <BookForm categories={categories} mode="create" />
      </div>
    </div>
  );
}
