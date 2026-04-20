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
    sort:     params.get("sort") ?? "",
  };

  const selectCls = "text-sm border border-gray-200 rounded px-3 py-2 bg-white focus:ring-2 focus:ring-burgundy-300 focus:outline-none";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select className={selectCls} value={cur.category} onChange={(e) => update("category", e.target.value)}>
        <option value="">כל הנושאים</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name_he ?? c.name}</option>
        ))}
      </select>

      <select className={selectCls} value={cur.language} onChange={(e) => update("language", e.target.value)}>
        <option value="">כל השפות</option>
        {languages.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>

      <select className={selectCls} value={cur.in_stock} onChange={(e) => update("in_stock", e.target.value)}>
        <option value="">כל הספרים</option>
        <option value="true">במלאי בלבד</option>
      </select>

      <select className={selectCls} value={cur.sort} onChange={(e) => update("sort", e.target.value)}>
        <option value="">מיון: חדש ביותר</option>
        <option value="title">א–ת</option>
        <option value="author">מחבר</option>
        <option value="year">שנה</option>
      </select>
    </div>
  );
}
