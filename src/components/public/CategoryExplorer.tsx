"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Category } from "@/types";

interface Props {
  categories: Category[];
}

export default function CategoryExplorer({ categories }: Props) {
  const params = useSearchParams();
  const active = params.get("category") ?? "";

  if (categories.length === 0) return null;

  return (
    <div className="mb-8" dir="rtl">
      <p className="text-xs font-semibold tracking-widest text-burgundy-600 uppercase mb-3">
        עיון לפי תחומי עניין
      </p>
      <div className="flex flex-wrap gap-2">
        {/* "כל הנושאים" */}
        <Link
          href="/catalog"
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
            ${!active
              ? "bg-burgundy-900 text-white border-burgundy-900"
              : "bg-white text-burgundy-700 border-burgundy-200 hover:border-burgundy-500 hover:bg-burgundy-50"
            }`}
        >
          כל הנושאים
        </Link>

        {categories.map((c) => {
          const isActive = active === c.id;
          return (
            <Link
              key={c.id}
              href={`/catalog?category=${c.id}`}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors
                ${isActive
                  ? "bg-burgundy-900 text-white border-burgundy-900"
                  : "bg-white text-burgundy-700 border-burgundy-200 hover:border-burgundy-500 hover:bg-burgundy-50"
                }`}
            >
              {c.name_he ?? c.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
