"use client";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import type { Category } from "@/types";

export default function CategoriesPage() {
  const [cats,    setCats]    = useState<Category[]>([]);
  const [name,    setName]    = useState("");
  const [nameHe,  setNameHe]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const load = useCallback(async () => {
    const sb = createClient();
    const { data } = await sb.from("categories").select("*").order("name");
    setCats((data ?? []) as Category[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function add() {
    if (!name.trim()) { setError("שם בלועזית חובה"); return; }
    setLoading(true);
    setError("");
    const sb = createClient();
    const { error } = await sb.from("categories").insert({
      name:    name.trim(),
      name_he: nameHe.trim() || undefined,
      slug:    slugify(name.trim()),
    });
    if (error) setError(error.message);
    else { setName(""); setNameHe(""); await load(); }
    setLoading(false);
  }

  async function remove(cat: Category) {
    if (!confirm(`למחוק את הקטגוריה "${cat.name_he ?? cat.name}"?`)) return;
    const sb = createClient();
    const { error } = await sb.from("categories").delete().eq("id", cat.id);
    if (error) setError(error.message);
    else await load();
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-gray-800 mb-6">🗂️ קטגוריות</h1>

      {/* Add form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5 mb-6 max-w-xl">
        <h2 className="font-semibold text-gray-700 mb-4 text-sm">הוספת קטגוריה</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm mb-3">{error}</div>}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">שם בעברית</label>
            <input
              className="input"
              value={nameHe}
              onChange={(e) => setNameHe(e.target.value)}
              placeholder="מדעי היהדות"
            />
          </div>
          <div>
            <label className="label">שם באנגלית *</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jewish Studies"
            />
          </div>
        </div>
        {name && (
          <p className="text-xs text-gray-400 mb-3">slug: {slugify(name)}</p>
        )}
        <button
          onClick={add}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "מוסיף..." : "➕ הוסף קטגוריה"}
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden max-w-xl">
        {cats.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">אין קטגוריות עדיין</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-gray-600">שם</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">slug</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cats.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-800">{c.name_he ?? c.name}</span>
                    {c.name_he && <span className="text-gray-400 text-xs mr-2">/ {c.name}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.slug}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(c)}
                      className="text-red-400 hover:text-red-600 text-xs transition-colors"
                    >
                      מחק
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
