"use client";
import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-burgundy-900 text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">📚</span>
            <div>
              <div className="font-serif text-gold-300 text-lg font-semibold leading-tight">
                ספרים אקדמיים
              </div>
              <div className="text-xs text-burgundy-200 leading-tight tracking-widest">
                ACADEMIC BOOKS
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/catalog" className="text-burgundy-100 hover:text-gold-300 transition-colors">
              קטלוג
            </Link>
            <Link href="/#about" className="text-burgundy-100 hover:text-gold-300 transition-colors">
              אודות
            </Link>
            <Link href="/#contact" className="text-burgundy-100 hover:text-gold-300 transition-colors">
              צור קשר
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-burgundy-100 hover:text-white rounded"
            onClick={() => setOpen(!open)}
            aria-label="תפריט"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="md:hidden border-t border-burgundy-800 py-3 flex flex-col gap-3 text-sm font-medium">
            <Link href="/catalog"  onClick={() => setOpen(false)} className="text-burgundy-100 hover:text-gold-300">קטלוג</Link>
            <Link href="/#about"  onClick={() => setOpen(false)} className="text-burgundy-100 hover:text-gold-300">אודות</Link>
            <Link href="/#contact" onClick={() => setOpen(false)} className="text-burgundy-100 hover:text-gold-300">צור קשר</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
