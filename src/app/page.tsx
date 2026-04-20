import Link from "next/link";
import Header from "@/components/public/Header";
import Footer from "@/components/public/Footer";
import BookCard from "@/components/public/BookCard";
import ContactForm from "@/components/public/ContactForm";
import { getPublishedBooks } from "@/lib/db/books";
import { getCategories } from "@/lib/db/categories";

export default async function HomePage() {
  const [{ data: recentBooks, total }, categories] = await Promise.all([
    getPublishedBooks({ limit: 8, sort: "created_at", order: "desc" }),
    getCategories(),
  ]);

  const wa   = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const mail = process.env.NEXT_PUBLIC_EMAIL    ?? "books@neo100.uk";

  return (
    <>
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-burgundy-900 text-white py-20 px-4 text-center">
        <p className="text-gold-400 text-xs font-semibold uppercase tracking-[0.3em] mb-4">
          אוסף ייחודי · עזבון חוקר
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-bold mb-5 leading-tight max-w-2xl mx-auto">
          אוסף ספרים אקדמיים נדירים
        </h1>
        <p className="text-burgundy-200 max-w-xl mx-auto mb-8 leading-relaxed text-sm md:text-base">
          עשרות אלפי ספרים מעזבונו של חוקר גדול — פילוסופיה, מדעי היהדות,
          היסטוריה, שפות ועוד. משלוח לכל העולם.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/catalog"
            className="bg-gold-500 text-burgundy-950 font-bold px-7 py-3 rounded-sm hover:bg-gold-400 transition-colors text-sm"
          >
            📚 לקטלוג הספרים ({total.toLocaleString()} ספרים)
          </Link>
          <a
            href={`https://wa.me/${wa}`}
            target="_blank" rel="noreferrer"
            className="border border-burgundy-500 text-white px-7 py-3 rounded-sm hover:bg-burgundy-800 transition-colors text-sm"
          >
            💬 WhatsApp
          </a>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────────── */}
      <section className="bg-parchment-100 border-y border-parchment-200 py-5">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-4 text-center text-sm">
          {[
            ["🌍", "משלוח לכל העולם"],
            ["✈️", "FedEx Express"],
            ["💬", "שירות אישי"],
          ].map(([icon, label]) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-2xl">{icon}</span>
              <span className="font-medium text-gray-700 text-xs md:text-sm">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent books ──────────────────────────────────────────────────── */}
      {recentBooks.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="flex justify-between items-baseline mb-6">
            <h2 className="font-serif text-2xl font-bold text-burgundy-900">תוספות אחרונות</h2>
            <Link href="/catalog" className="text-sm text-burgundy-700 hover:underline">
              כל הספרים ←
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 lg:gap-6">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* ── Categories ────────────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="bg-parchment-100 py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-serif text-2xl font-bold text-burgundy-900 mb-6 text-center">
              קטגוריות
            </h2>
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/catalog?category=${c.id}`}
                  className="bg-white border border-parchment-200 px-4 py-2 rounded-sm text-sm font-medium text-burgundy-800
                             hover:bg-burgundy-900 hover:text-gold-300 hover:border-burgundy-900 transition-colors shadow-sm"
                >
                  {c.name_he ?? c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <section id="about" className="bg-burgundy-950 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-3xl font-bold mb-6 text-gold-300">הסיפור שלנו</h2>
          <p className="text-burgundy-200 leading-relaxed mb-4 text-sm md:text-base">
            היה פעם חוקר יוצא דופן — אדם שתשוקתו לידע הובילה אותו לאסוף לאורך עשרות שנים
            עשרות אלפי ספרים אקדמיים נדירים: מפילוסופיה עתיקה ועד מדעי הטבע,
            מלשונות שמיות ועד היסטוריה של האמנות.
          </p>
          <p className="text-burgundy-300 leading-relaxed text-sm md:text-base">
            אנו מטפלים בעזבונו ורוצים לתת לספרים אלה חיים חדשים —
            לחבר בין החומר הנדיר לבין חוקרים, סטודנטים ואספנים שיעריכו אותו.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-10 max-w-md mx-auto">
            {[
              ["💎", "ללא תיווך", "ישירות מהעזבון"],
              ["🌍", "עולמי", "FedEx Express"],
              ["💬", "אישי", "מענה מהיר"],
            ].map(([icon, title, sub]) => (
              <div key={title} className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold text-gold-300 text-sm">{title}</div>
                <div className="text-burgundy-400 text-xs">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="max-w-3xl mx-auto px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-burgundy-900 text-center mb-8">
          צור קשר
        </h2>

        {/* Quick contact cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <a
            href={`https://wa.me/${wa}`}
            target="_blank" rel="noreferrer"
            className="card p-5 text-center group hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-4xl block mb-2">💬</span>
            <p className="font-semibold text-gray-800">WhatsApp</p>
            <p className="text-xs text-gray-400 mt-1">הדרך המהירה ביותר לתשובה</p>
          </a>
          <a
            href={`mailto:${mail}`}
            className="card p-5 text-center group hover:-translate-y-0.5 transition-transform"
          >
            <span className="text-4xl block mb-2">📧</span>
            <p className="font-semibold text-gray-800">אימייל</p>
            <p className="text-xs text-gray-400 mt-1">{mail}</p>
          </a>
        </div>

        {/* Contact form */}
        <div className="bg-white rounded-lg shadow-book p-6 md:p-8">
          <h3 className="font-semibold text-gray-800 mb-5">שלח הודעה</h3>
          <ContactForm />
        </div>
      </section>

      <Footer />
    </>
  );
}
