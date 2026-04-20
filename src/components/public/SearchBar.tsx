"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const router = useRouter();
  const params = useSearchParams();

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
  }

  return (
    <form onSubmit={submit} className="flex gap-2 w-full max-w-md">
      <div className="relative flex-1">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="חפש ספר, מחבר, נושא..."
          className="input pl-8 pr-4"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
      <button type="submit" className="btn-primary">חפש</button>
    </form>
  );
}
