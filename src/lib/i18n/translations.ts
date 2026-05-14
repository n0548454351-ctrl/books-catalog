// src/lib/i18n/translations.ts
// ─────────────────────────────────────────────────────────────────
// All static UI strings in Hebrew and English.
// Book titles/authors are NOT translated — only UI chrome.
// ─────────────────────────────────────────────────────────────────

export type Locale = "he" | "en";

export const translations = {
  he: {
    // ── Site ──────────────────────────────────────────────────────
    siteName:        "ספרים אקדמיים",
    siteTagline:     "Academic Books Collection",
    siteDescription: "אוסף ייחודי של ספרים אקדמיים נדירים מעזבונו של חוקר גדול.",

    // ── Navigation ────────────────────────────────────────────────
    nav: {
      catalog:   "קטלוג",
      about:     "אודות",
      contact:   "צור קשר",
    },

    // ── Hero ──────────────────────────────────────────────────────
    hero: {
      badge:       "קטלוג אקדמי · אוסף אספני",
      title:       "קטלוג ספרים\nאקדמי ואספני",
      description: "אוסף רחב של ספרים בתחומי הלימודים הקלאסיים, היסטוריה, פילוסופיה, פילולוגיה, יהדות, שפות ומדעי הרוח. הקטלוג מיועד לחוקרים, סטודנטים, אספנים ומוסדות המחפשים ספרים פיזיים בעלי ערך מחקרי.",
      trust:       "האוסף משלב ספרות מחקרית, כתבים קלאסיים וספרים בעלי ערך אקדמי ואספני.",
      cta:         "לעיון בקטלוג",
      ctaContact:  "יצירת קשר",
      booksCount:  (n: number) => `${n.toLocaleString("he-IL")} ספרים`,
    },

    // ── Catalog page ──────────────────────────────────────────────
    catalog: {
      badge:         "Academic & Collectible Books",
      title:         "קטלוג הספרים",
      subtitle:      (n: number) => `עיינו באוסף לפי תחומי מחקר מרכזיים · ${n.toLocaleString("he-IL")} ספרים`,
      resultsFound:  (n: number) => `${n.toLocaleString("he-IL")} תוצאות נמצאו`,
      showing:       (n: number, total: number) => `מציג ${n.toLocaleString("he-IL")} מתוך ${total.toLocaleString("he-IL")} ספרים`,
      clearFilter:   "× נקה סינון",
      allTopics:     "כל הנושאים",
      noResults:     "לא נמצאו ספרים",
      noResultsHint: "מחפשים ספר מסוים? ניתן לפנות ישירות לגבי כל ספר בקטלוג.",
      showAll:       "הצג את כל הקטלוג",
    },

    // ── Filters ───────────────────────────────────────────────────
    filters: {
      allCategories: "📂 כל הקטגוריות",
      allLanguages:  "🌐 כל השפות",
      allBooks:      "📦 כל הספרים",
      inStock:       "✅ זמין במלאי",
      sortNewest:    "🔀 מיון: חדש ביותר",
      sortTitle:     "א–ת שם",
      sortAuthor:    "מחבר",
      sortYear:      "שנת הוצאה",
      search:        "חיפוש",
      searchPlaceholder: "חיפוש לפי שם ספר, מחבר, נושא...",
    },

    // ── Book card ─────────────────────────────────────────────────
    book: {
      details:     "פרטים",
      inquire:     "בירור",
      inquiry:     "בירור לגבי הספר",
      multiLang:   "ללא שפה",
      outOfStock:  "אזל",
      lowStock:    "מעט נשאר",
      inStock:     "במלאי",
      language:    "שפה",
      year:        "שנה",
      publisher:   "הוצאה לאור",
      edition:     "שנת הוצאה",
      copies:      "עותקים",
      description: "תיאור",
      related:     "ספרים נוספים בתחום",
      viewAll:     "כל הספרים בתחום ←",
      inquiryMsg:  (title: string, author: string) =>
        `שלום, אני מתעניין/ת בספר: "${title}" (${author}). אשמח לפרטים נוספים.`,
      contactForm: "📧 טופס יצירת קשר",
      shippingNote: "ניתן לברר זמינות, פרטים ותיאום משלוח לכל העולם",
    },

    // ── Contact ───────────────────────────────────────────────────
    contact: {
      title:       "צור קשר",
      subtitle:    "נשמח לשמוע מכם",
      description: "לבירור זמינות ספר, פרטים נוספים או תיאום משלוח — פנו אלינו ישירות.",
      whatsapp:    "WhatsApp",
      whatsappHint:"בירור ב־WhatsApp — הדרך המהירה",
      email:       "אימייל",
      sendMessage: "שלח הודעה",
      fullName:    "שם מלא *",
      emailField:  "אימייל *",
      subject:     "נושא",
      message:     "הודעה *",
      send:        "📨 שלח הודעה",
      sending:     "שולח...",
      sent:        "ההודעה נשלחה בהצלחה!",
      sentHint:    "נחזור אליך בהקדם האפשרי",
      error:       "שגיאה בשליחה. נסה שוב או פנה בוואטסאפ.",
      subjects:    ["בדיקת זמינות ספר", "שאלה כללית", "שאלה על משלוח", "אחר"],
    },

    // ── About ─────────────────────────────────────────────────────
    about: {
      title:  "אודות האוסף",
      badge:  "אודות האוסף",
      header: "מורשת אקדמית",
      body1:  "אלפי ספרים פיזיים בתחומי המחקר הקלאסי, יהדות, פילוסופיה והיסטוריה — זמינים לעיון ופנייה ישירה. האוסף נאסף לאורך שנים על ידי חוקר שהקדיש חייו לאיסוף ותיעוד ספרות אקדמית נדירה.",
      body2:  "הפריטים מוצעים לחוקרים, סטודנטים, אספנים ומוסדות.",
    },

    // ── Footer ────────────────────────────────────────────────────
    footer: {
      description: "קטלוג ספרים פיזיים לחוקרים, מוסדות, סטודנטים ואספנים. משלוח בארץ ובעולם.",
      nav:         "ניווט",
      contactCol:  "יצירת קשר",
      shipping:    "🌍 משלוח בארץ ובעולם",
      disclaimer:  "⚠️ הספרים תוארו בסיוע בינה מלאכותית — ייתכנו שגיאות בפרטים",
      rights:      (year: number) => `© ${year} ספרים אקדמיים · כל הזכויות שמורות`,
    },

    // ── Trust strip ───────────────────────────────────────────────
    trust: [
      ["🌍", "משלוח לכל העולם"],
      ["✈️", "FedEx Express"],
      ["💬", "שירות אישי"],
    ] as [string, string][],

    // ── Stats ─────────────────────────────────────────────────────
    stats: {
      books:      "ספרים באוסף",
      timespan:   "טווח כרונולוגי",
      timespanVal:"מהעת העתיקה ועד המאה ה־20",
      fields:     "תחומי מחקר",
      shipping:   "משלוח",
      shippingVal:"בארץ ובעולם",
    },

    // ── CTA section ───────────────────────────────────────────────
    cta: {
      title:       "מחפשים ספר מסוים?",
      description: "ניתן לפנות ישירות לגבי כל ספר בקטלוג — לבירור זמינות, פרטים נוספים ותיאום משלוח.",
      hint:        "הקטלוג מתעדכן באופן שוטף וכולל ספרים בתחומי מחקר מגוונים.",
      whatsapp:    "בירור ב־WhatsApp",
      email:       "📧 אימייל",
    },

    // ── Philology tag page ────────────────────────────────────────
    philology: {
      badge:    "תחום מחקר",
      backLink: "← לכל הקטלוג",
      field:    "תחום",
    },

    // ── Pagination ────────────────────────────────────────────────
    pagination: {
      prev: "‹",
      next: "›",
      aria: "עמודים",
    },
  },

  // ══════════════════════════════════════════════════════════════
  en: {
    siteName:        "Academic Books",
    siteTagline:     "Academic Books Collection",
    siteDescription: "A unique collection of rare academic books from a scholar's estate.",

    nav: {
      catalog:   "Catalog",
      about:     "About",
      contact:   "Contact",
    },

    hero: {
      badge:       "Academic Catalog · Collector's Collection",
      title:       "Academic &\nCollectible Books",
      description: "A wide collection of books in Classical Studies, History, Philosophy, Philology, Jewish Studies, Languages and Humanities. Intended for researchers, students, collectors and institutions seeking physical books of scholarly value.",
      trust:       "The collection includes research literature, classical writings and books of academic and collectible value.",
      cta:         "Browse Catalog",
      ctaContact:  "Contact Us",
      booksCount:  (n: number) => `${n.toLocaleString("en-US")} books`,
    },

    catalog: {
      badge:         "Academic & Collectible Books",
      title:         "Book Catalog",
      subtitle:      (n: number) => `Browse the collection by research fields · ${n.toLocaleString("en-US")} books`,
      resultsFound:  (n: number) => `${n.toLocaleString("en-US")} results found`,
      showing:       (n: number, total: number) => `Showing ${n.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} books`,
      clearFilter:   "× Clear filters",
      allTopics:     "All topics",
      noResults:     "No books found",
      noResultsHint: "Looking for a specific book? You can inquire directly about any book in the catalog.",
      showAll:       "Show all catalog",
    },

    filters: {
      allCategories: "📂 All Categories",
      allLanguages:  "🌐 All Languages",
      allBooks:      "📦 All Books",
      inStock:       "✅ In Stock",
      sortNewest:    "🔀 Sort: Newest",
      sortTitle:     "A–Z Title",
      sortAuthor:    "Author",
      sortYear:      "Publication Year",
      search:        "Search",
      searchPlaceholder: "Search by title, author, subject...",
    },

    book: {
      details:     "Details",
      inquire:     "Inquire",
      inquiry:     "Inquire about this book",
      multiLang:   "No language",
      outOfStock:  "Out of stock",
      lowStock:    "Few left",
      inStock:     "In stock",
      language:    "Language",
      year:        "Year",
      publisher:   "Publisher",
      edition:     "Publication Year",
      copies:      "Copies",
      description: "Description",
      related:     "More books in this field",
      viewAll:     "All books in this field →",
      inquiryMsg:  (title: string, author: string) =>
        `Hello, I am interested in the book: "${title}" (${author}). I would appreciate more details.`,
      contactForm: "📧 Contact Form",
      shippingNote: "Availability, details and worldwide shipping can be arranged",
    },

    contact: {
      title:       "Contact",
      subtitle:    "We'd love to hear from you",
      description: "To inquire about a book's availability, get more details or arrange shipping — contact us directly.",
      whatsapp:    "WhatsApp",
      whatsappHint:"WhatsApp inquiry — the fastest way",
      email:       "Email",
      sendMessage: "Send Message",
      fullName:    "Full name *",
      emailField:  "Email *",
      subject:     "Subject",
      message:     "Message *",
      send:        "📨 Send Message",
      sending:     "Sending...",
      sent:        "Message sent successfully!",
      sentHint:    "We'll get back to you as soon as possible",
      error:       "Sending failed. Try again or contact us via WhatsApp.",
      subjects:    ["Book availability inquiry", "General question", "Shipping question", "Other"],
    },

    about: {
      title:  "About the Collection",
      badge:  "About the Collection",
      header: "Academic Heritage",
      body1:  "Thousands of physical books in Classical research, Jewish Studies, Philosophy and History — available for inquiry and direct contact. The collection was gathered over many years by a scholar who dedicated his life to collecting and documenting rare academic literature.",
      body2:  "Items are offered to researchers, students, collectors and institutions.",
    },

    footer: {
      description: "Physical book catalog for researchers, institutions, students and collectors. Worldwide shipping.",
      nav:         "Navigation",
      contactCol:  "Contact",
      shipping:    "🌍 Worldwide shipping",
      disclaimer:  "⚠️ Books were described with AI assistance — details may contain errors",
      rights:      (year: number) => `© ${year} Academic Books · All rights reserved`,
    },

    trust: [
      ["🌍", "Worldwide Shipping"],
      ["✈️", "FedEx Express"],
      ["💬", "Personal Service"],
    ] as [string, string][],

    stats: {
      books:      "Books in collection",
      timespan:   "Chronological range",
      timespanVal:"From antiquity to the 20th century",
      fields:     "Research fields",
      shipping:   "Shipping",
      shippingVal:"Domestic & worldwide",
    },

    cta: {
      title:       "Looking for a specific book?",
      description: "You can inquire directly about any book in the catalog — for availability, more details and shipping.",
      hint:        "The catalog is regularly updated and includes books across diverse research fields.",
      whatsapp:    "WhatsApp inquiry",
      email:       "📧 Email",
    },

    philology: {
      badge:    "Research Field",
      backLink: "← Back to catalog",
      field:    "Field",
    },

    pagination: {
      prev: "‹",
      next: "›",
      aria: "Pages",
    },
  },
} as const;

export type Translations = typeof translations.he;
