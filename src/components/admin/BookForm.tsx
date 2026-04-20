"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Book, Category } from "@/types";
import { getBookCoverUrl } from "@/lib/utils";

interface Props {
  book?: Book;
  categories: Category[];
  mode: "create" | "edit";
}

const LANGUAGES = ["Hebrew", "English", "French", "German", "Arabic", "Yiddish", "Latin", "Other"];

export default function BookForm({ book, categories, mode }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading,   setLoading]   = useState(false);
  const [imgLoading,setImgLoading]= useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  const [form, setForm] = useState({
    title:       book?.title      ?? "",
    title_he:    book?.title_he   ?? "",
    author:      book?.author     ?? "",
    description: book?.description ?? "",
    category_id: book?.category_id ?? "",
    publisher:   book?.publisher  ?? "",
    year:        book?.year?.toString() ?? "",
    language:    book?.language   ?? "Hebrew",
    price:       book?.price?.toString() ?? "",
    sku:         book?.sku        ?? "",
    is_published:book?.is_published ?? false,
    quantity:    book?.inventory?.quantity?.toString() ?? "1",
    in_stock:    book?.inventory?.in_stock ?? true,
  });

  function set(k: string, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // ── Image upload ────────────────────────────────────────────────────────────
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !book?.id) return;
    setImgLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bookId", book.id);
      fd.append("isCover", "true");
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Upload failed");
      }
      router.refresh();
      setSuccess("התמונה הועלתה בהצלחה!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת תמונה");
    } finally {
      setImgLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // ── Delete image ────────────────────────────────────────────────────────────
  async function handleDeleteImage(imageId: string) {
    if (!confirm("למחוק תמונה זו?")) return;
    const res = await fetch(`/api/admin/images/${imageId}`, { method: "DELETE" });
    if (res.ok) { router.refresh(); }
    else setError("שגיאה במחיקת תמונה");
  }

  // ── Save book ───────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const url    = mode === "create" ? "/api/admin/books" : `/api/admin/books/${book!.id}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const payload = {
      title:       form.title,
      title_he:    form.title_he   || undefined,
      author:      form.author,
      description: form.description || undefined,
      category_id: form.category_id || undefined,
      publisher:   form.publisher   || undefined,
      year:        form.year  ? Number(form.year)  : undefined,
      price:       form.price ? Number(form.price) : undefined,
      sku:         form.sku   || undefined,
      language:    form.language,
      is_published:form.is_published,
      quantity:    Number(form.quantity),
      in_stock:    form.in_stock,
    };

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "שגיאה לא צפויה");
      setLoading(false);
      return;
    }

    if (mode === "create") {
      router.push(`/admin/books/${data.id}`);
    } else {
      setSuccess("הספר נשמר בהצלחה ✓");
      router.refresh();
    }
    setLoading(false);
  }

  // ── Delete book ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!book || !confirm(`למחוק את הספר "${book.title_he ?? book.title}"? לא ניתן לבטל.`)) return;
    const res = await fetch(`/api/admin/books/${book.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/books");
    else setError("שגיאה במחיקת הספר");
  }

  const coverImage = book?.images?.find((i) => i.is_cover);
  const cover = getBookCoverUrl(book ?? { images: [] });

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Alerts */}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded px-4 py-3 text-sm">{success}</div>}

      {/* ── Titles ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">כותרת בעברית *</label>
          <input required className="input" value={form.title_he} onChange={(e) => set("title_he", e.target.value)} placeholder="מדריך לתלמוד" />
        </div>
        <div>
          <label className="label">כותרת מקורית / אנגלית *</label>
          <input required className="input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Guide to the Talmud" />
        </div>
      </div>

      {/* ── Author ── */}
      <div>
        <label className="label">מחבר *</label>
        <input required className="input" value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="שם המחבר" />
      </div>

      {/* ── Category / Year / Language ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">קטגוריה</label>
          <select className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">ללא קטגוריה</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_he ?? c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">שנת הוצאה</label>
          <input type="number" min={1000} max={2100} className="input" value={form.year} onChange={(e) => set("year", e.target.value)} placeholder="1984" />
        </div>
        <div>
          <label className="label">שפה</label>
          <select className="input" value={form.language} onChange={(e) => set("language", e.target.value)}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* ── Publisher / Price / SKU ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="label">הוצאה לאור</label>
          <input className="input" value={form.publisher} onChange={(e) => set("publisher", e.target.value)} />
        </div>
        <div>
          <label className="label">מחיר (₪)</label>
          <input type="number" min={0} step="0.01" className="input" value={form.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label className="label">SKU / קוד</label>
          <input className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} />
        </div>
      </div>

      {/* ── Description ── */}
      <div>
        <label className="label">תיאור הספר</label>
        <textarea rows={5} className="input resize-y" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="תיאור קצר של הספר, נושאיו ומיוחדיו..." />
      </div>

      {/* ── Inventory ── */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-700 mb-3">📦 מלאי</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">כמות במלאי</label>
            <input type="number" min={0} className="input" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </div>
          <div className="flex items-center gap-2 mt-6">
            <input
              type="checkbox" id="in_stock" checked={form.in_stock}
              onChange={(e) => set("in_stock", e.target.checked)}
              className="w-4 h-4 rounded accent-burgundy-700"
            />
            <label htmlFor="in_stock" className="text-sm text-gray-700 cursor-pointer">סמן כ"במלאי"</label>
          </div>
        </div>
      </div>

      {/* ── Cover image (edit mode only) ── */}
      {mode === "edit" && book && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-700 mb-3">🖼 תמונת כריכה</h3>
          <div className="flex items-start gap-5">
            {/* Preview */}
            <div className="relative w-24 h-32 rounded overflow-hidden bg-parchment-100 shrink-0 border border-gray-200">
              <Image src={cover} alt="כריכה" fill className="object-cover" unoptimized />
            </div>

            <div className="space-y-2">
              {/* Upload button */}
              <label className={`cursor-pointer ${imgLoading ? "opacity-50 pointer-events-none" : ""}`}>
                <span className="btn-ghost">
                  {imgLoading ? "⏳ מעלה..." : "📤 העלה תמונה חדשה"}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  className="sr-only"
                  onChange={handleImageUpload}
                  disabled={imgLoading}
                />
              </label>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP · עד 5MB</p>
              <p className="text-xs text-gray-400">תמונה חדשה תחליף את הקיימת כתמונת כריכה</p>

              {/* Delete existing */}
              {coverImage && (
                <button
                  type="button"
                  onClick={() => handleDeleteImage(coverImage.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors mt-1 block"
                >
                  🗑 מחק תמונה נוכחית
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Publish toggle ── */}
      <div className="flex items-center gap-3 py-2 border-t border-gray-100 pt-4">
        <input
          type="checkbox" id="is_published" checked={form.is_published}
          onChange={(e) => set("is_published", e.target.checked)}
          className="w-4 h-4 rounded accent-burgundy-700"
        />
        <label htmlFor="is_published" className="text-sm font-medium text-gray-700 cursor-pointer">
          פרסם ספר זה — יהיה גלוי לציבור מיד
        </label>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "שומר..." : mode === "create" ? "➕ צור ספר" : "💾 שמור שינויים"}
          </button>
          <button type="button" onClick={() => router.back()} className="btn-ghost">
            ביטול
          </button>
        </div>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-500 hover:text-red-700 text-sm transition-colors"
          >
            🗑 מחק ספר
          </button>
        )}
      </div>
    </form>
  );
}
