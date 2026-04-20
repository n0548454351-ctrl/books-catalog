# Migration Guide

## שלב 1 — חילוץ הנתונים מהאתר הנוכחי

פתח את https://books.neo100.uk בדפדפן.
פתח DevTools → Console, הרץ:

```js
// מנסה למצוא את מערך הספרים בכל מקום שהוא יכול להיות:
const data = window.__BOOKS__
  ?? window.books
  ?? window.catalog
  ?? window.BOOKS_DATA
  ?? [];

if (data.length === 0) {
  // אם לא נמצא — מנסה לאסוף מה-DOM:
  const cards = [...document.querySelectorAll('[data-book-id], .book-card, .book-item')];
  console.log('Found', cards.length, 'cards in DOM');
}

copy(JSON.stringify(data, null, 2));
console.log('Copied', data.length, 'books to clipboard');
```

שמור את הפלט בקובץ: `migration/books-legacy.json`

אם הספרים נטענים מ-/books.json:
```bash
curl https://books.neo100.uk/books.json -o migration/books-legacy.json
```

---

## שלב 2 — הכן את הסביבה

```bash
cp .env.local.example .env.local
# מלא את:
# NEXT_PUBLIC_SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

---

## שלב 3 — הרץ את הסכמה ב-Supabase

בלוח Supabase → SQL Editor:
1. הרץ `supabase/schema.sql`
2. הרץ `supabase/rls.sql`

---

## שלב 4 — הרץ את המיגרציה

```bash
npm install dotenv  # אם חסר
npx ts-node --project tsconfig.migration.json migration/import-to-supabase.ts
```

---

## שלב 5 — בדוק

- Supabase Dashboard → Table Editor → books
- בדוק שהספרים הועלו עם תמונות
- פתח /catalog ובדוק שהספרים מוצגים

---

## הערות

- תמונות legacy נשמרות כ-URL חיצוני (Google Drive / Drive) — הן יישארו עובדות
- כדי להעביר תמונות ל-Supabase Storage — השתמש בפאנל הניהול (עריכת ספר → העלה תמונה)
- הסקריפט מדלג על ספרים שנכשלים וממשיך — בדוק את הלוג
