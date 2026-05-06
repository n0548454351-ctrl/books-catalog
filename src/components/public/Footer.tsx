import Link from "next/link";

export default function Footer() {
  const wa   = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const mail = process.env.NEXT_PUBLIC_EMAIL    ?? "books@neo100.uk";

  return (
    <footer className="w-full bg-primary border-t-4 border-accent-gold mt-20">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* שמאל — מיתוג */}
          <div className="flex flex-col gap-5">
            <span className="font-serif text-2xl text-accent-gold font-bold">
              ספרים אקדמיים
            </span>
            <p className="text-white/60 max-w-sm leading-relaxed text-sm italic">
              אוסף ייחודי של ספרים אקדמיים נדירים מעזבונו של חוקר גדול.
              מוצע לחוקרים, אספנים ומוסדות — משלוח לכל העולם עם FedEx Express.
            </p>
            <div className="h-px w-16 bg-accent-gold/30 mt-2" />
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">
              ⚠️ הספרים תוארו בסיוע בינה מלאכותית — ייתכנו שגיאות בפרטים
            </p>
          </div>

          {/* ימין — קישורים */}
          <div className="grid grid-cols-2 gap-12 lg:justify-items-end" dir="rtl">
            <div className="flex flex-col gap-5">
              <span className="text-[11px] font-bold text-accent-gold uppercase tracking-widest">
                ניווט
              </span>
              <div className="flex flex-col gap-3 text-sm text-white/60">
                <Link href="/catalog"  className="hover:text-accent-gold transition-colors">קטלוג ספרים</Link>
                <Link href="/#about"  className="hover:text-accent-gold transition-colors">אודות האוסף</Link>
                <Link href="/#contact" className="hover:text-accent-gold transition-colors">צור קשר</Link>
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <span className="text-[11px] font-bold text-accent-gold uppercase tracking-widest">
                קשר
              </span>
              <div className="flex flex-col gap-3 text-sm text-white/60">
                <a href={`mailto:${mail}`} className="hover:text-accent-gold transition-colors">
                  📧 {mail}
                </a>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:text-accent-gold transition-colors">
                  💬 WhatsApp
                </a>
                <span>🌍 משלוח לכל העולם</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 text-center">
          <p className="text-[10px] text-white/30 uppercase tracking-[0.15em]">
            © {new Date().getFullYear()} ספרים אקדמיים. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  );
}
