"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
  languages: string[];
}

export default function FilterPanel({ categories, languages }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`/catalog?${next.toString()}`);
  }

  const cur = {
    category: params.get("category") ?? "",
    language: params.get("language") ?? "",
    in_stock: params.get("in_stock") ?? "",
    sort: params.get("sort") ?? "",
  };

  const selectCls =
    "text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-burgundy-300 focus:outline-none text-gray-700 hover:border-burgundy-300 transition-colors cursor-pointer";

  const hasActiveFilters = !!(cur.category || cur.language || cur.in_stock || cur.sort);

  return (
    <div className="flex flex-wrap gap-2 items-center" dir="rtl">
      {/* קטגוריה */}
      <select
        className={selectCls}
        value={cur.category}
        onChange={(e) => update("category", e.target.value)}
        aria-label="סינון לפי קטגוריה"
      >
        <option value="">📂 כל הקטגוריות</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name_he ?? c.name}
          </option>
        ))}
      </select>

      {/* שפה */}
      <select
        className={selectCls}
        value={cur.language}
        onChange={(e) => update("language", e.target.value)}
        aria-label="סינון לפי שפה"
      >
        <option value="">🌐 כל השפות</option>
        {languages.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>

      {/* זמינות */}
      <select
        className={selectCls}
        value={cur.in_stock}
        onChange={(e) => update("in_stock", e.target.value)}
        aria-label="סינון לפי זמינות"
      >
        <option value="">📦 כל הספרים</option>
        <option value="true">✅ זמין במלאי</option>
      </select>

      {/* מיון */}
      <select
        className={selectCls}
        value={cur.sort}
        onChange={(e) => update("sort", e.target.value)}
        aria-label="מיון"
      >
        <option value="">🔀 מיון: חדש ביותר</option>
        <option value="title">א–ת שם</option>
        <option value="author">מחבר</option>
        <option value="year">שנת הוצאה</option>
      </select>

      {/* כפתור ניקוי — מופיע רק אם יש פילטר פעיל */}
      {hasActiveFilters && (
        <a
          href="/catalog"
          className="text-xs text-burgundy-600 hover:text-burgundy-900 hover:underline px-2 py-2 transition-colors"
        >
          × נקה סינון
        </a>
      )}
    </div>
  );
}
