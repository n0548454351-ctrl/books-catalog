# ספרים אקדמיים — Book Catalog

**Next.js 15 + Supabase** — קטלוג ספרים אקדמיים עם ניהול מלא

---

## הגדרת פרויקט Supabase

### 1. צור פרויקט חדש
https://supabase.com → New Project

### 2. הרץ SQL
בלוח Supabase → SQL Editor, הרץ **בסדר הזה**:
```
supabase/schema.sql
supabase/rls.sql
```

### 3. צור משתמש אדמין
Supabase Dashboard → Authentication → Users → Add User  
הזן אימייל וסיסמה — אלו יהיו פרטי הכניסה ל-`/admin`

### 4. העתק את מפתחות ה-API
Supabase → Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## הרצה מקומית

```bash
# 1. התקן תלויות
npm install

# 2. הגדר סביבה
cp .env.local.example .env.local
# ערוך .env.local עם מפתחות Supabase שלך

# 3. הפעל
npm run dev
# → http://localhost:3000        (אתר ציבורי)
# → http://localhost:3000/admin  (פאנל ניהול)
```

---

## מבנה הפרויקט

```
src/
├── app/
│   ├── page.tsx                  # דף הבית
│   ├── catalog/
│   │   ├── page.tsx              # קטלוג ציבורי
│   │   └── [slug]/page.tsx       # דף ספר בודד
│   ├── admin/
│   │   ├── layout.tsx            # עטיפת אדמין + auth guard
│   │   ├── page.tsx              # לוח בקרה
│   │   ├── login/page.tsx        # כניסה
│   │   ├── books/                # רשימה + הוספה + עריכה
│   │   ├── categories/           # ניהול קטגוריות
│   │   └── inventory/            # ניהול מלאי
│   └── api/
│       ├── books/                # API ציבורי
│       ├── admin/books/          # CRUD ספרים
│       ├── admin/upload/         # העלאת תמונות
│       ├── admin/images/[id]/    # מחיקת תמונה
│       ├── admin/categories/     # CRUD קטגוריות
│       ├── admin/inventory/      # עדכון מלאי
│       └── contact/              # טופס יצירת קשר
├── components/
│   ├── public/                   # Header, Footer, BookCard, SearchBar, FilterPanel, ContactForm
│   └── admin/                   # AdminSidebar, BookForm
└── lib/
    ├── supabase/                 # client, server, admin
    ├── db/                      # books, categories, inventory queries
    ├── auth.ts
    ├── utils.ts
    └── storage.ts
```

---

## פריסה ל-Vercel

```bash
npx vercel
```

הגדר את כל משתני הסביבה ב:  
Vercel Dashboard → Project → Settings → Environment Variables

### דומיין מותאם
Vercel → Domains → הוסף `books.neo100.uk`  
עדכן DNS להצביע ל-Vercel.

---

## שימוש בפאנל הניהול

| פעולה | נתיב |
|-------|------|
| כניסה | `/admin/login` |
| לוח בקרה | `/admin` |
| כל הספרים | `/admin/books` |
| ספר חדש | `/admin/books/new` |
| עריכת ספר | `/admin/books/[id]` |
| קטגוריות | `/admin/categories` |
| מלאי | `/admin/inventory` |

---

## מיגרציה מהאתר הנוכחי

ראה `migration/README.md`

---

## משתני סביבה

| משתנה | תיאור |
|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL של פרויקט Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | מפתח anon ציבורי |
| `SUPABASE_SERVICE_ROLE_KEY` | מפתח service-role (סודי!) |
| `NEXT_PUBLIC_WHATSAPP` | מספר WhatsApp (ללא +) |
| `NEXT_PUBLIC_EMAIL` | אימייל ליצירת קשר |
| `CONTACT_WEBHOOK_URL` | (אופציונלי) webhook לטופס יצירת קשר |

---

## ארכיטקטורה

```
Public Site (Next.js Server Components — SEO + מהירות)
      ↓ קורא מ
Supabase PostgreSQL (מקור האמת היחיד)
      ↑ כותב אליו
Admin Dashboard (Next.js + Supabase Auth)
      ↑ מעלה תמונות ל
Supabase Storage (bucket: book-images, ציבורי)
```

**עקרון מרכזי:** שינוי ב-admin = מיד גלוי באתר הציבורי. אין export, אין build נוסף.
