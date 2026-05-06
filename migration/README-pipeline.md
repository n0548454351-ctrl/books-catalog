# Book Enrichment Pipeline v2

## ארכיטקטורה

```
תמונת כריכה (lh3.googleusercontent.com)
         ↓
1. Claude Vision — raw_* fields בלבד
   raw_title, raw_subtitle, raw_author,
   raw_visible_text, language_guess,
   confidence_title, confidence_author
         ↓
2. Normalization — ניקוי לחיפוש
         ↓
3. Google Books API ──┐
4. Open Library API  ─┤ (במקביל, עם cache)
                      ↓
5. Scoring — trigram similarity + language bonus
   score ≥ 0.85 → done (auto-verified)
   score 0.60–0.84 → needs_review
   score < 0.60 → failed
         ↓
6. שלושה רבדים בפלט:
   raw_*       — מה Vision ראה
   candidate_* — מה Google Books / Open Library הציעו
   verified_*  — המיזוג הטוב ביותר
         ↓
7. Review UI (HTML) — בדיקה אנושית לספרים עם needs_review
         ↓
8. ייצוא לשיטס / Supabase
```

---

## הגדרת סביבה

ב-`.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_BOOKS_API_KEY=AIza...        # חובה — 40,000 req/day
INPUT_FILE=migration/input-images.json

# אופציונלי (ברירות מחדל):
BATCH_SIZE=25
DELAY_MS=2000
BATCH_DELAY_MS=20000
SCORE_AUTO_THRESHOLD=0.85
SCORE_REVIEW_THRESHOLD=0.60
```

### Google Books API Key (חינמי)
1. https://console.cloud.google.com → New Project
2. Enable "Books API"
3. Credentials → Create API Key
4. שים ב-`GOOGLE_BOOKS_API_KEY`

---

## שלבי הרצה

### 1. הכן קלט
```bash
# מ-Supabase (אם כבר ייבאת ספרים)
npx ts-node --project tsconfig.migration.json migration/prepare-input.ts --source supabase

# מ-CSV
npx ts-node --project tsconfig.migration.json migration/prepare-input.ts --source csv --file migration/my-books.csv
```

### 2. ריצת ניסיון ראשונה — 50 ספרים
ערוך `input-images.json` וקח רק 50 שורות ראשונות:
```bash
# בדוק תוצאות לפני שמריץ 7000
npx ts-node --project tsconfig.migration.json migration/enrich-books-v2.ts
```

### 3. הרצה מלאה
```bash
# אחרי שמרוצה מהתוצאות:
npx ts-node --project tsconfig.migration.json migration/enrich-books-v2.ts
# אפשר לעצור (Ctrl+C) ולהמשיך — resume אוטומטי
```

### 4. בדיקת ספרים
פתח `migration/review-ui.html` בדפדפן:
- גרור את `migration/needs-review.json`
- תקן שדות אם צריך
- לחץ "אשר" על ספרים שנראים תקינים
- ייצא `approved-books.json`

### 5. ייצוא סופי
הקובץ `migration/enriched-books-v2.json` מכיל את הכל.
מוכן לייבוא ל-Supabase עם `import-to-supabase.ts`.

---

## קבצי עבודה

| קובץ | תפקיד |
|------|-------|
| `input-images.json` | קלט — רשימת תמונות |
| `enrichment-state.json` | **מצב השמירה** — אל תמחק! |
| `api-cache.json` | Cache של API calls — חוסך זמן ועלות |
| `enriched-books-v2.json` | פלט מלא |
| `needs-review.json` | ספרים לבדיקה אנושית |

---

## שדות הפלט

### raw_* (Vision)
| שדה | תיאור |
|-----|-------|
| raw_title | כותרת כפי שנקראה |
| raw_subtitle | כותרת משנה |
| raw_author | מחבר כפי שנקרא |
| raw_visible_text | כל הטקסט הגלוי |
| language_guess | שפה מזוהה |
| confidence_title | high/medium/low/none |
| confidence_author | high/medium/low/none |

### candidate_* (APIs)
כל השדות מ-Google Books + Open Library בנפרד.

### verified_* (מיזוג)
| שדה | תיאור |
|-----|-------|
| verified_title | כותרת סופית |
| verified_author | מחבר סופי |
| verified_publisher | הוצאה לאור |
| verified_year | שנת הוצאה |
| verified_isbn10/13 | ISBN |
| verified_language | שפה מלאה |
| verified_category | קטגוריה ראשית |
| verified_subjects | נושאים (comma-separated) |
| verified_description | תיאור מ-Google Books |
| match_score | 0.0–1.0 |
| needs_review | true/false |
| review_reason | סיבות לבדיקה |

---

## טיפים לביצועים

- **Cache**: API calls נשמרים ב-`api-cache.json` — כותרות זהות לא מחפשות שוב
- **Resume**: עצרת? הפעל שוב — ממשיך מהספר האחרון
- **Rate limits**: עם Google Books key — 40k/day, מספיק ל-7000 ספרים
- **עלות Vision**: ~$0.01 לתמונה בינונית × 7000 = כ-$70 לכל הספרים
- **מומלץ**: ריצת ניסיון של 100 ספרים לפני הריצה המלאה

---

## review-ui.html

כלי עזר לבדיקה אנושית:
- פתח בדפדפן (Chrome/Firefox)
- אין צורך בשרת — עובד ישירות מהקובץ
- טוען `needs-review.json` בגרירה
- מציג תמונת הכריכה לצד השדות
- אפשר לערוך שדות ולאשר/לדלג
- ייצוא `approved-books.json` בסיום
