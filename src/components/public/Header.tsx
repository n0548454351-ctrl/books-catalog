"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/catalog",  label: "קטלוג" },
  { href: "/#about",   label: "אודות" },
  { href: "/#contact", label: "צור קשר" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="w-full sticky top-0 z-40 bg-[#FFFDF5]/95 backdrop-blur-md border-b-2 border-[rgba(184,134,11,0.2)]">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
        <div className="flex items-center justify-between h-24">

          {/* לוגו — Newsreader serif */}
          <Link href="/" className="font-serif text-2xl font-bold text-primary tracking-tight hover:text-accent-gold transition-colors">
            ספרים אקדמיים
          </Link>

          {/* ניווט Desktop — label-caps + gold underline on active */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === "/catalog" && pathname?.startsWith("/catalog");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-[13px] font-bold uppercase tracking-[0.1em] pb-1 transition-colors duration-200
                    ${isActive
                      ? "text-primary border-b-2 border-accent-gold"
                      : "text-on-surface-variant hover:text-accent-gold border-b-2 border-transparent"
                    }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* המבורגר */}
          <button
            className="md:hidden p-2 text-on-surface-variant hover:text-primary rounded transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="תפריט"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <nav className="md:hidden border-t border-[rgba(184,134,11,0.15)] py-4 flex flex-col gap-4">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="text-[12px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-accent-gold transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
