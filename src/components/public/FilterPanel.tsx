"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Category } from "@/types";
import { useLocale } from "@/lib/i18n";

interface Props {
  categories: Category[];
  languages: string[];
}

export default function FilterPanel({ categories, languages }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const { t }  = useLocale();

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
    sort:     params.get("sort")     ?? "",
  };

  const selectCls =
    "text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-burgundy-300 focus:outline-none text-gray-700 hover:border-burgundy-300 transition-colors cursor-pointer";

  const hasActiveFilters = !!(cur.category || cur.language || cur.in_stock || cur.sort);

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* קטגוריה */}
      <select
        className={selectCls}
        value={cur.category}
        onChange={(e) => update("category", e.target.value)}
        aria-label={t.filters.allCategories}
      >
        <option value="">{t.filters.allCategories}</option>
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
        aria-label={t.filters.allLanguages}
      >
        <option value="">{t.filters.allLanguages}</option>
        {languages.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>

      {/* זמינות */}
      <select
        className={selectCls}
        value={cur.in_stock}
        onChange={(e) => update("in_stock", e.target.value)}
      >
        <option value="">{t.filters.allBooks}</option>
        <option value="true">{t.filters.inStock}</option>
      </select>

      {/* מיון */}
      <select
        className={selectCls}
        value={cur.sort}
        onChange={(e) => update("sort", e.target.value)}
      >
        <option value="">{t.filters.sortNewest}</option>
        <option value="title">{t.filters.sortTitle}</option>
        <option value="author">{t.filters.sortAuthor}</option>
        <option value="year">{t.filters.sortYear}</option>
      </select>

      {hasActiveFilters && (
        <a
          href="/catalog"
          className="text-xs text-burgundy-600 hover:text-burgundy-900 hover:underline px-2 py-2 transition-colors"
        >
          {t.catalog.clearFilter}
        </a>
      )}
    </div>
  );
}
