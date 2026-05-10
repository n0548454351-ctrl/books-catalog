import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import BookCard from "@/components/public/BookCard";
import ContactForm from "@/components/public/ContactForm";
import { getPublishedBooks } from "@/lib/db/books";
import { getCategories } from "@/lib/db/categories";

export default async function HomePage() {
  const [{ data: recentBooks, total }, categories] = await Promise.all([
    getPublishedBooks({ limit: 6, sort: "created_at", order: "desc" }),
    getCategories(),
  ]);

  const wa   = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const mail = process.env.NEXT_PUBLIC_EMAIL    ?? "books@neo100.uk";

  return (
    <>
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 pt-20 pb-24" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">

          {/* טקסט */}
          <div className="md:col-span-7 flex flex-col items-start gap-8">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-4">
                קטלוג אקדמי · אוסף מדעי
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl text-primary leading-[1.1] font-bold">
                קטלוג ספרים<br />אקדמי ומדעי
              </h1>
            </div>

            <div className="h-1.5 w-24 bg-accent-gold" />

            <p className="text-[17px] text-on-surface-variant leading-relaxed max-w-lg">
              אוסף רחב של ספרים בתחומי הלימודים הקלאסיים, היסטוריה, פילוסופיה,
              פילולוגיה, יהדות, שפות ומדעי הרוח. הקטלוג מיועד לחוקרים, סטודנטים,
               ומוסדות המחפשים ספרים פיזיים בעלי ערך מחקרי.
            </p>

            <p className="text-sm text-on-surface-variant/70 leading-relaxed max-w-lg border-r-2 border-accent-gold/40 pr-4">
              האוסף משלב ספרות מחקרית, כתבים קלאסיים וספרים בעלי ערך אקדמי ומדעי.
              חלק מהספרים כוללים מהדורות מחקר נדירות שאינן זמינות בקלות כיום.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                href="/catalog"
                className="bg-primary text-white px-8 py-4 font-bold text-sm uppercase tracking-widest shadow-rich hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
              >
                לעיון בקטלוג ({total.toLocaleString()} ספרים)
              </Link>
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="border-2 border-accent-gold text-accent-gold px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-accent-gold/5 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                יצירת קשר
              </a>
            </div>
          </div>

          {/* תמונה */}
          <div className="md:col-span-5 relative aspect-[3/4] overflow-hidden shadow-deep border border-accent-gold/20">
            <img
              src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80"
              alt="אוסף ספרים אקדמיים"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[12px] border-white/5 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Featured Collections — navy ───────────────────────────── */}
      <section className="bg-primary py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-accent-gold/40" />
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 relative z-10" dir="rtl">

          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-[11px] font-bold text-accent-gold uppercase tracking-[0.2em]">
                תחומי מחקר מרכזיים
              </span>
              <h2 className="font-serif text-4xl text-white mt-3 font-bold">
                עיון לפי תחומי עניין
              </h2>
              <div className="h-0.5 w-16 bg-accent-gold mt-4" />
            </div>
            <Link
              href="/catalog"
              className="text-accent-gold text-sm font-bold border-b border-accent-gold/40 pb-1 hover:border-accent-gold transition-all"
            >
              כל הקטלוג ←
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                label: "סדרה 01",
                title: "לימודים קלאסיים",
                desc:  "יוון ורומא העתיקה, לטינית ויוונית, פילולוגיה והיסטוריה עתיקה.",
                img:   "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80",
                cat:   "",
              },
              {
                label: "סדרה 02",
                title: "יהדות ותיאולוגיה",
                desc:  "ספרות מחקר, מחשבת ישראל, היסטוריה יהודית וכתבים תיאולוגיים.",
                img:   "https://images.unsplash.com/photo-1585779034823-7e9ac8faec70?w=600&q=80",
                cat:   "",
              },
              {
                label: "סדרה 03",
                title: "פילוסופיה והיסטוריה",
                desc:  "מחקרים בפילוסופיה עתיקה, היסטוריה כללית והגות קלאסית.",
                img:   "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80",
                cat:   "",
              },
            ].map((item, idx) => (
              <Link
                href={`/catalog${item.cat ? `?search=${item.cat}` : ""}`}
                key={item.title}
                className={`group flex flex-col gap-6 bg-white/5 p-6 border border-white/10 hover:border-accent-gold/40 transition-all duration-300 cursor-pointer ${idx === 1 ? "md:mt-10" : ""}`}
              >
                <div className="aspect-square overflow-hidden border border-accent-gold/15 relative">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent-gold/70 uppercase tracking-widest">
                    {item.label}
                  </span>
                  <h3 className="font-serif text-xl text-white mt-2 group-hover:text-accent-gold transition-colors font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-white/55 text-sm mt-3 leading-relaxed">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-accent-gold/20" />
      </section>

      {/* ── סטטיסטיקות ───────────────────────────────────────────── */}
      <section className="border-b border-outline-variant py-14" dir="rtl">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-x-reverse divide-outline-variant">
            {[
              { label: "ספרים באוסף",        value: `${total.toLocaleString()}+` },
              { label: "טווח כרונולוגי",      value: "מהעת העתיקה ועד המאה ה־20" },
              { label: "תחומי מחקר",          value: `${categories.length}+ תחומים` },
              { label: "משלוח",               value: "בארץ ובעולם" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center px-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold mb-2">
                  {label}
                </p>
                <p className="font-serif text-xl font-bold text-primary leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ספרים אחרונים ────────────────────────────────────────── */}
      {recentBooks.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 py-20" dir="rtl">
          <div className="flex justify-between items-end mb-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3">
                עדכני
              </p>
              <h2 className="font-serif text-3xl font-bold text-primary">תוספות אחרונות</h2>
            </div>
            <Link href="/catalog" className="text-sm font-bold text-accent-gold border-b border-accent-gold/40 pb-1 hover:border-accent-gold transition-all">
              כל הקטלוג ←
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* ── קטגוריות ─────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="bg-surface-low border-y border-outline-variant py-16" dir="rtl">
          <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3 text-center">
              כל התחומים
            </p>
            <h2 className="font-serif text-2xl font-bold text-primary mb-2 text-center">
              עיינו באוסף לפי תחומי מחקר מרכזיים
            </h2>
            <p className="text-sm text-on-surface-variant text-center mb-8 max-w-xl mx-auto">
              מצאו ספרים המתאימים למחקר, הוראה ואספנות — מספרות קלאסית ועד פילולוגיה ותיאולוגיה.
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/catalog?category=${c.id}`}
                  className="bg-surface border border-outline-variant px-4 py-2 text-sm font-medium text-primary hover:border-accent-gold hover:text-accent-gold transition-colors"
                >
                  {c.name_he ?? c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA יצירת קשר ────────────────────────────────────────── */}
      <section className="py-20" dir="rtl">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
          <div className="border border-accent-gold/25 p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-10 bg-surface-low relative overflow-hidden">
            <div className="z-10 max-w-lg">
              <h2 className="font-serif text-3xl text-primary font-bold mb-4">
                מחפשים ספר מסוים?
              </h2>
              <div className="h-0.5 w-12 bg-accent-gold mb-5" />
              <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
                ניתן לפנות ישירות לגבי כל ספר בקטלוג — לבירור זמינות, פרטים נוספים ותיאום משלוח.
              </p>
              <p className="text-on-surface-variant/60 text-sm">
                הקטלוג מתעדכן באופן שוטף וכולל ספרים בתחומי מחקר מגוונים.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 z-10 shrink-0">
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-white px-8 py-4 font-bold text-sm uppercase tracking-widest text-center hover:bg-primary/90 transition-all shadow-rich flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                בירור ב־WhatsApp
              </a>
              <a
                href={`mailto:${mail}`}
                className="border border-outline-variant text-primary px-8 py-4 font-bold text-sm uppercase tracking-widest text-center hover:border-accent-gold hover:text-accent-gold transition-all"
              >
                📧 אימייל
              </a>
            </div>
            <div className="absolute -left-16 -bottom-16 w-64 h-64 border-[32px] border-accent-gold/5 rounded-full pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── אודות ────────────────────────────────────────────────── */}
      <section id="about" className="bg-primary py-20 px-6" dir="rtl">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-4">
            אודות האוסף
          </p>
          <h2 className="font-serif text-4xl font-bold text-white mb-6">
            מורשת אקדמית
          </h2>
          <div className="h-0.5 w-16 bg-accent-gold mx-auto mb-8" />
          <p className="text-white/70 leading-relaxed mb-5 text-sm md:text-base">
            אלפי ספרים פיזיים בתחומי המחקר הקלאסי, יהדות, פילוסופיה והיסטוריה —
            זמינים לעיון ופנייה ישירה. האוסף נאסף לאורך שנים על ידי חוקר שהקדיש
            חייו לאיסוף ותיעוד ספרות אקדמית נדירה.
          </p>
          <p className="text-white/45 leading-relaxed text-sm">
            הפריטים מוצעים לחוקרים, סטודנטים, אספנים ומוסדות.
            קטלוג ספרים פיזיים לחוקרים, מוסדות, סטודנטים ואספנים.
          </p>
        </div>
      </section>

      {/* ── צור קשר ──────────────────────────────────────────────── */}
      <section id="contact" className="max-w-3xl mx-auto px-6 py-20" dir="rtl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3 text-center">
          צור קשר
        </p>
        <h2 className="font-serif text-4xl font-bold text-primary text-center mb-3">
          נשמח לשמוע מכם
        </h2>
        <p className="text-sm text-on-surface-variant text-center mb-10 max-w-md mx-auto">
          לבירור זמינות ספר, פרטים נוספים או תיאום משלוח — פנו אלינו ישירות.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="card p-6 text-center hover:-translate-y-0.5 transition-transform flex flex-col items-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-accent-gold" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <div>
              <p className="font-bold text-primary text-sm uppercase tracking-widest">WhatsApp</p>
              <p className="text-xs text-on-surface-variant mt-1">בירור ב־WhatsApp — הדרך המהירה</p>
            </div>
          </a>
          <a
            href={`mailto:${mail}`}
            className="card p-6 text-center hover:-translate-y-0.5 transition-transform flex flex-col items-center gap-3"
          >
            <span className="text-3xl">📧</span>
            <div>
              <p className="font-bold text-primary text-sm uppercase tracking-widest">אימייל</p>
              <p className="text-xs text-on-surface-variant mt-1">{mail}</p>
            </div>
          </a>
        </div>

        <div className="card p-8">
          <h3 className="font-serif text-xl font-semibold text-primary mb-6">שלח הודעה</h3>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </>
  );
}
