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
                קטלוג אקדמי · אוסף אספני נדיר
              </p>
              <h1 className="font-serif text-5xl lg:text-6xl text-primary leading-[1.1] font-bold">
                ספרים אקדמיים<br />ואספניים נדירים
              </h1>
            </div>

            {/* קו זהב */}
            <div className="h-1.5 w-24 bg-accent-gold" />

            <p className="text-[17px] text-on-surface-variant leading-relaxed max-w-lg">
              אוסף ייחודי של ספרים ללימודים קלאסיים, היסטוריה, פילוסופיה,
              פילולוגיה, יהדות ומדעי הרוח — מתאים לחוקרים, סטודנטים,
              אספנים ומוסדות.
            </p>

            <div className="flex flex-wrap gap-4 mt-2">
              <Link
                href="/catalog"
                className="bg-primary text-white px-8 py-4 font-bold text-sm uppercase tracking-widest shadow-rich hover:bg-primary/90 hover:-translate-y-0.5 transition-all"
              >
                לקטלוג הספרים ({total.toLocaleString()} ספרים)
              </Link>
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="border-2 border-accent-gold text-accent-gold px-8 py-4 font-bold text-sm uppercase tracking-widest hover:bg-accent-gold/5 hover:-translate-y-0.5 transition-all"
              >
                💬 יצירת קשר
              </a>
            </div>
          </div>

          {/* תמונה */}
          <div className="md:col-span-5 relative aspect-[3/4] overflow-hidden shadow-deep border-4 border-accent-gold/10">
            <img
              src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80"
              alt="אוסף ספרים אקדמיים"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border-[12px] border-white/5 pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ── Featured Collections — navy ───────────────────────────── */}
      <section className="bg-primary py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-accent-gold/30" />
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20 relative z-10" dir="rtl">

          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-[11px] font-bold text-accent-gold uppercase tracking-[0.2em]">
                אוסף מיוחד
              </span>
              <h2 className="font-serif text-4xl text-white mt-3 font-bold">
                תחומי מחקר מרכזיים
              </h2>
              <div className="h-1 w-16 bg-accent-gold mt-4" />
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
                img:   "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&q=80",
              },
              {
                label: "סדרה 02",
                title: "יהדות ותיאולוגיה",
                desc:  "כתבי יד ליטורגיים נדירים, מחקר קבלה ומיסטיקה יהודית.",
                img:   "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80",
              },
              {
                label: "סדרה 03",
                title: "פילוסופיה מודרנית",
                desc:  "מהדורות ביקורתיות של הוגי ההשכלה ותנועות המאה ה-20.",
                img:   "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80",
              },
            ].map((item, idx) => (
              <Link
                href="/catalog"
                key={item.title}
                className={`group flex flex-col gap-6 bg-white/5 p-6 border border-white/10 hover:border-accent-gold/50 transition-all duration-300 cursor-pointer ${idx === 1 ? "md:mt-10" : ""}`}
              >
                <div className="aspect-square overflow-hidden border border-accent-gold/20 relative shadow-rich">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-primary/20 group-hover:bg-transparent transition-colors" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-accent-gold/80 uppercase tracking-widest">
                    {item.label}
                  </span>
                  <h3 className="font-serif text-2xl text-white mt-2 group-hover:text-accent-gold transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-white/60 text-sm mt-3 leading-relaxed">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── סטטיסטיקות ───────────────────────────────────────────── */}
      <section className="border-y border-outline-variant py-14" dir="rtl">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "זמינות",    value: "משלוח עולמי" },
              { label: "תקופה",     value: "מהמאה ה-8 לפנה\"ס" },
              { label: "ספרים",     value: `${total.toLocaleString()}+` },
              { label: "גישה",      value: "פנייה ישירה" },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-gold mb-2">
                  {label}
                </p>
                <p className="font-serif text-2xl font-bold text-primary">{value}</p>
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
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
              תחומי מחקר
            </p>
            <h2 className="font-serif text-3xl font-bold text-primary mb-8 text-center">
              עיון לפי נושא
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/catalog?category=${c.id}`}
                  className="bg-surface border border-outline-variant px-5 py-2.5 text-sm font-semibold text-primary hover:border-accent-gold hover:text-accent-gold transition-colors shadow-sm"
                >
                  {c.name_he ?? c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Join the Scriptorium (Newsletter placeholder) ─────────── */}
      <section className="py-20" dir="rtl">
        <div className="max-w-[1280px] mx-auto px-6 sm:px-8 lg:px-20">
          <div className="bg-surface-low border-2 border-accent-gold/30 p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-10 shadow-rich relative overflow-hidden">
            <div className="z-10">
              <h2 className="font-serif text-4xl text-primary font-bold">הצטרפו לארכיון</h2>
              <div className="h-1 w-16 bg-accent-gold my-4" />
              <p className="text-on-surface-variant max-w-md text-sm leading-relaxed">
                לפרטים נוספים על ספרים, לפנייה על ספר ספציפי או לשאלות כלליות —
                אנחנו כאן.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 z-10 w-full lg:w-auto">
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                className="bg-primary text-white px-10 py-4 font-bold text-sm uppercase tracking-widest text-center hover:bg-primary/90 transition-all shadow-rich"
              >
                💬 WhatsApp
              </a>
              <a
                href={`mailto:${mail}`}
                className="border-2 border-accent-gold text-accent-gold px-10 py-4 font-bold text-sm uppercase tracking-widest text-center hover:bg-accent-gold/5 transition-all"
              >
                📧 אימייל
              </a>
            </div>
            <div className="absolute -left-20 -bottom-20 w-80 h-80 border-[40px] border-accent-gold/5 rounded-full pointer-events-none" />
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
          <div className="h-1 w-16 bg-accent-gold mx-auto mb-8" />
          <p className="text-white/70 leading-relaxed mb-4 text-sm md:text-base">
            אוסף זה הוא פרי עבודתו ולקטנותו של חוקר שהקדיש חייו לאיסוף ותיעוד
            ספרים אקדמיים נדירים: פלאוגרפיה ודתות עתיקות, מדעי הטבע,
            לשונות עתיקות, פילוסופיה וספרות מחקרית מרחבי העולם.
          </p>
          <p className="text-white/50 leading-relaxed text-sm md:text-base">
            הפריטים מוצעים לחוקרים, סטודנטים, אספנים ומוסדות — כדי שספרים אלה
            ימשיכו לחיות בידי מי שיעריכם.
          </p>
        </div>
      </section>

      {/* ── צור קשר ──────────────────────────────────────────────── */}
      <section id="contact" className="max-w-3xl mx-auto px-6 py-20" dir="rtl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-gold mb-3 text-center">
          צור קשר
        </p>
        <h2 className="font-serif text-4xl font-bold text-primary text-center mb-10">
          נשמח לשמוע מכם
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer"
            className="card p-6 text-center hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-4xl block mb-3">💬</span>
            <p className="font-bold text-primary text-sm uppercase tracking-widest">WhatsApp</p>
            <p className="text-xs text-on-surface-variant mt-2">הדרך המהירה ביותר</p>
          </a>
          <a
            href={`mailto:${mail}`}
            className="card p-6 text-center hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-4xl block mb-3">📧</span>
            <p className="font-bold text-primary text-sm uppercase tracking-widest">אימייל</p>
            <p className="text-xs text-on-surface-variant mt-2">{mail}</p>
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
