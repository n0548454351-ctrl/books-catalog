import Link from "next/link";

function WhatsAppIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`fill-current ${className}`} xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function Footer() {
  const wa   = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const mail = process.env.NEXT_PUBLIC_EMAIL    ?? "books@neo100.uk";

  return (
    <footer className="w-full bg-primary border-t-2 border-accent-gold/50 mt-20">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12" dir="rtl">

          {/* מיתוג */}
          <div className="lg:col-span-1 flex flex-col gap-5">
            <span className="font-serif text-2xl text-accent-gold font-bold">
              ספרים אקדמיים
            </span>
            <div className="h-px w-12 bg-accent-gold/40" />
            <p className="text-white/55 text-sm leading-relaxed max-w-xs">
              קטלוג ספרים פיזיים לחוקרים, מוסדות, סטודנטים ואספנים.
              משלוח בארץ ובעולם.
            </p>
            <p className="text-[10px] text-white/25 leading-relaxed">
              ⚠️ הספרים תוארו בסיוע בינה מלאכותית — ייתכנו שגיאות בפרטים
            </p>
          </div>

          {/* ניווט */}
          <div className="flex flex-col gap-5">
            <span className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">
              ניווט
            </span>
            <div className="flex flex-col gap-3 text-sm text-white/55">
              <Link href="/catalog"  className="hover:text-accent-gold transition-colors">קטלוג ספרים</Link>
              <Link href="/#about"  className="hover:text-accent-gold transition-colors">אודות האוסף</Link>
              <Link href="/#contact" className="hover:text-accent-gold transition-colors">צור קשר</Link>
            </div>
          </div>

          {/* קשר */}
          <div className="flex flex-col gap-5">
            <span className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.2em]">
              יצירת קשר
            </span>
            <div className="flex flex-col gap-3 text-sm text-white/55">
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-accent-gold transition-colors flex items-center gap-2"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-accent-gold/70" />
                בירור ב־WhatsApp
              </a>
              <a
                href={`mailto:${mail}`}
                className="hover:text-accent-gold transition-colors"
              >
                📧 {mail}
              </a>
              <span className="text-white/35">🌍 משלוח בארץ ובעולם</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 text-center">
          <p className="text-[10px] text-white/25 uppercase tracking-[0.15em]">
            © {new Date().getFullYear()} ספרים אקדמיים · כל הזכויות שמורות
          </p>
        </div>
      </div>
    </footer>
  );
}
