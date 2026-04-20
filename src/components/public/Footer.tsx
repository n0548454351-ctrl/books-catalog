import Link from "next/link";

export default function Footer() {
  const wa   = process.env.NEXT_PUBLIC_WHATSAPP ?? "972583208868";
  const mail = process.env.NEXT_PUBLIC_EMAIL    ?? "books@neo100.uk";

  return (
    <footer className="bg-burgundy-950 text-burgundy-300 py-12 px-4 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="text-gold-300 font-serif font-bold text-xl mb-2">📚 ספרים אקדמיים</div>
            <p className="text-xs text-burgundy-400 leading-relaxed">
              אוסף ייחודי של ספרים אקדמיים נדירים מעזבונו של חוקר גדול.
              משלוח לכל העולם עם FedEx Express.
            </p>
          </div>
          <div>
            <h3 className="text-white font-medium mb-3 text-sm">קישורים מהירים</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/catalog"  className="hover:text-white transition-colors">קטלוג ספרים</Link></li>
              <li><Link href="/#about"  className="hover:text-white transition-colors">אודות האוסף</Link></li>
              <li><Link href="/#contact" className="hover:text-white transition-colors">צור קשר</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-medium mb-3 text-sm">צור קשר</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <a href={`mailto:${mail}`} className="hover:text-white transition-colors">
                  📧 {mail}
                </a>
              </li>
              <li>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                  💬 WhatsApp
                </a>
              </li>
              <li>🌍 משלוח לכל העולם</li>
              <li>✈️ FedEx Express</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-burgundy-900 pt-6 text-xs text-center text-burgundy-500 space-y-1">
          <p>⚠️ האוסף עבר תיאור בסיוע בינה מלאכותית — ייתכנו שגיאות בפרטי הספרים</p>
          <p>© {new Date().getFullYear()} ספרים אקדמיים. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  );
}
