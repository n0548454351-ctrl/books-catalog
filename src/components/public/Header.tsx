"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/catalog",  label: "קטלוג" },
  { href: "/#about",   label: "אודות" },
  { href: "/#contact", label: "צור קשר" },
];

/* אייקון ספר SVG אלגנטי בצבעי האתר */
function BookIcon() {
  return (
    <svg
      width="28" height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* כריכה אחורית */}
      <rect x="5" y="4" width="16" height="20" rx="1" fill="#1A365D" opacity="0.15" />
      {/* כריכה קדמית */}
      <rect x="7" y="3" width="15" height="21" rx="1" fill="#1A365D" />
      {/* שדרה */}
      <rect x="5" y="3" width="3" height="21" rx="1" fill="#B8860B" />
      {/* קו זהב עליון */}
      <line x1="10" y1="8" x2="19" y2="8" stroke="#B8860B" strokeWidth="1" strokeOpacity="0.6" />
      {/* שורות טקסט */}
      <line x1="10" y1="11" x2="19" y2="11" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
      <line x1="10" y1="14" x2="16" y2="14" stroke="white" strokeWidth="0.8" strokeOpacity="0.4" />
    </svg>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="w-full sticky top-0 z-40 bg-[#FFFDF5]/96 backdrop-blur-md border-b border-accent-gold/15">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
        <div className="flex items-center justify-between h-20">

          {/* לוגו */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <BookIcon />
            <div>
              <div className="font-serif text-lg font-bold text-primary leading-tight tracking-tight group-hover:text-accent-gold transition-colors">
                ספרים אקדמיים
              </div>
              <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-on-surface-variant/50 leading-tight">
                Academic Books Collection
              </div>
            </div>
          </Link>

          {/* ניווט Desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(({ href, label }) => {
              const isActive = href === "/catalog" && pathname?.startsWith("/catalog");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-[12px] font-bold uppercase tracking-[0.1em] pb-1 transition-colors duration-200
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
            className="md:hidden p-2 text-on-surface-variant hover:text-primary transition-colors"
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
          <nav className="md:hidden border-t border-accent-gold/15 py-4 flex flex-col gap-4">
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
