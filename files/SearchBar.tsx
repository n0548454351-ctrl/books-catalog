"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("search", value.trim());
    else next.delete("search");
    next.delete("page");
    router.push(`/catalog?${next.toString()}`);
  }

  function clear() {
    setValue("");
    const next = new URLSearchParams(params.toString());
    next.delete("search");
    next.delete("page");
    router.push(`/catalog?${next.toString()}`);
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={submit} className="flex gap-2 w-full" dir="rtl">
      <div className="relative flex-1">
        {/* אייקון חיפוש */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none select-none text-base">
          🔍
        </span>

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="חיפוש לפי שם ספר, מחבר, נושא..."
          className="input pr-10 pl-8 w-full text-sm"
          dir="rtl"
          aria-label="חיפוש ספרים"
        />

        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="נקה חיפוש"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
          >
            ×
          </button>
        )}
      </div>

      <button type="submit" className="btn-primary shrink-0 px-5 text-sm">
        חיפוש
      </button>
    </form>
  );
}
