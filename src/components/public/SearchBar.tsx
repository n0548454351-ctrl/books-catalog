"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import { useLocale } from "@/lib/i18n";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const router  = useRouter();
  const params  = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t }   = useLocale();

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
    <form onSubmit={submit} className="flex gap-2 w-full">
      <div className="relative flex-1">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base">
          🔍
        </span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t.filters.searchPlaceholder}
          className="input pr-10 pl-8 w-full text-sm"
          dir="auto"
          aria-label={t.filters.search}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
          >
            ×
          </button>
        )}
      </div>
      <button type="submit" className="btn-primary shrink-0 px-5 text-sm">
        {t.filters.search}
      </button>
    </form>
  );
}
