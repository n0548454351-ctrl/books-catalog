"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin",             label: "לוח בקרה",  icon: "📊" },
  { href: "/admin/books",       label: "ספרים",      icon: "📚" },
  { href: "/admin/books/new",   label: "הוסף ספר",  icon: "➕" },
  { href: "/admin/categories",  label: "קטגוריות",  icon: "🗂️" },
  { href: "/admin/inventory",   label: "מלאי",       icon: "📦" },
];

export default function AdminSidebar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <aside className="w-56 bg-burgundy-950 text-white flex flex-col min-h-screen shrink-0">
      {/* Brand */}
      <div className="p-5 border-b border-burgundy-900">
        <div className="text-gold-300 font-serif font-bold text-lg">ספרים אקדמיים</div>
        <div className="text-burgundy-400 text-xs mt-0.5">פאנל ניהול</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = path === item.href || (item.href !== "/admin" && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors
                ${active
                  ? "bg-burgundy-800 text-gold-300 font-medium"
                  : "text-burgundy-200 hover:bg-burgundy-900 hover:text-white"}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-burgundy-900 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="block text-xs text-burgundy-400 hover:text-white transition-colors"
        >
          ← צפה באתר הציבורי
        </Link>
        <button
          onClick={logout}
          className="text-xs text-burgundy-400 hover:text-red-300 transition-colors"
        >
          התנתקות
        </button>
      </div>
    </aside>
  );
}
