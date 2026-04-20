"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("אימייל או סיסמה שגויים");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-burgundy-950 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white w-full max-w-sm rounded-lg shadow-2xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-5xl">📚</span>
          <h1 className="font-serif text-2xl font-bold text-burgundy-900 mt-3">כניסת מנהל</h1>
          <p className="text-gray-400 text-sm mt-1">ספרים אקדמיים — פאנל ניהול</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">אימייל</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="label">סיסמה</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-burgundy-900 text-gold-300 font-semibold py-2.5 rounded-sm
                       hover:bg-burgundy-800 transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "נכנס..." : "כניסה"}
          </button>
        </form>

        <p className="text-xs text-gray-300 text-center mt-6">
          רק למנהלים מורשים
        </p>
      </div>
    </div>
  );
}
