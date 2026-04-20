"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface InvRow {
  id: string;
  book_id: string;
  quantity: number;
  in_stock: boolean;
  updated_at: string;
  book: { id: string; title: string; title_he?: string; slug: string };
}

export default function InventoryPage() {
  const [rows,   setRows]   = useState<InvRow[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const load = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb
      .from("inventory")
      .select("*, book:books(id, title, title_he, slug)")
      .order("in_stock", { ascending: true })
      .order("quantity", { ascending: true });
    setRows((data ?? []) as InvRow[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateQty(id: string, quantity: number) {
    setSaving(id);
    const sb = createClient();
    await sb.from("inventory").update({ quantity, updated_at: new Date().toISOString() }).eq("id", id);
    await load();
    setSaving(null);
  }

  async function toggleStock(row: InvRow) {
    setSaving(row.id);
    const sb = createClient();
    await sb.from("inventory").update({ in_stock: !row.in_stock, updated_at: new Date().toISOString() }).eq("id", row.id);
    await load();
    setSaving(null);
  }

  const filtered = rows.filter((r) => {
    const matchSearch = !search ||
      r.book?.title_he?.includes(search) ||
      r.book?.title?.includes(search) ||
      r.book?.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ? true :
      filter === "low" ? r.in_stock && r.quantity <= 2 :
      !r.in_stock;
    return matchSearch && matchFilter;
  });

  const lowCount = rows.filter((r) => r.in_stock && r.quantity <= 2).length;
  const outCount = rows.filter((r) => !r.in_stock).length;

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-gray-800 mb-6">📦 ניהול מלאי</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6 max-w-lg">
        {[
          { label: "כולם",       value: rows.length,  key: "all",  cls: "text-gray-800" },
          { label: "מלאי נמוך", value: lowCount,      key: "low",  cls: "text-amber-700" },
          { label: "אזלו",       value: outCount,      key: "out",  cls: "text-red-700" },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key as typeof filter)}
            className={`bg-white rounded-lg shadow-sm border p-4 text-center transition-colors
              ${filter === s.key ? "border-burgundy-400 bg-burgundy-50" : "border-gray-100 hover:border-gray-200"}`}
          >
            <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        className="input max-w-xs mb-5"
        placeholder="חיפוש ספר..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-right px-4 py-3 font-medium text-gray-600">ספר</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">כמות</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">במלאי</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">עדכון</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((row) => {
              const isLow = row.in_stock && row.quantity <= 2;
              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    !row.in_stock ? "bg-red-50/30" :
                    isLow ? "bg-amber-50/40" : "hover:bg-gray-50"
                  }`}
                >
                  {/* Book name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/books/${row.book?.id}`}
                        className="font-medium text-gray-800 hover:text-burgundy-700 transition-colors"
                      >
                        {row.book?.title_he ?? row.book?.title}
                      </Link>
                      {isLow && <span className="badge-low-stock">נמוך</span>}
                      {!row.in_stock && <span className="badge-out-stock">אזל</span>}
                    </div>
                  </td>

                  {/* Quantity input */}
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      defaultValue={row.quantity}
                      key={`${row.id}-${row.quantity}`}
                      disabled={saving === row.id}
                      onBlur={(e) => {
                        const q = Number(e.target.value);
                        if (q !== row.quantity) updateQty(row.id, q);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const q = Number((e.target as HTMLInputElement).value);
                          if (q !== row.quantity) updateQty(row.id, q);
                        }
                      }}
                      className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-center
                                 focus:ring-2 focus:ring-burgundy-300 focus:outline-none
                                 disabled:opacity-50"
                    />
                  </td>

                  {/* In stock toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleStock(row)}
                      disabled={saving === row.id}
                      className={`text-xs px-3 py-1 rounded-full font-medium border transition-colors disabled:opacity-50
                        ${row.in_stock
                          ? "bg-green-100 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                          : "bg-red-100 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"}`}
                    >
                      {saving === row.id ? "..." : row.in_stock ? "במלאי ✓" : "אזל ✗"}
                    </button>
                  </td>

                  {/* Last updated */}
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                    {new Date(row.updated_at).toLocaleDateString("he-IL")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            {search ? "לא נמצאו ספרים" : "אין נתוני מלאי"}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-3">
        💡 לעדכון כמות — שנה את המספר ולחץ Enter או לחץ מחוץ לשדה
      </p>
    </div>
  );
}
